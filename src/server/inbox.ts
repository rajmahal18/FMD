import 'server-only';
import nodemailer from 'nodemailer';
import {randomUUID} from 'node:crypto';
import {inboxTotalFileLimit} from '@/lib/inbox-files';
import {db} from '@/lib/db';
import {InputError} from '@/lib/validation';
import {tokenHash} from '@/lib/password';
import {offerEmail,parseInboxAction,type InboxData} from '@/lib/inbox';
import type {Prisma} from '@/generated/prisma/client';
type Tx=Prisma.TransactionClient;
async function scope(tx:Tx,actorId:string,eventId:string){
 const m=await tx.eventMembership.findUnique({where:{eventId_userId:{eventId,userId:actorId}},include:{user:{select:{name:true,active:true,mustChangePassword:true}},event:true}});
 if(!m?.active||!m.user.active||m.user.mustChangePassword||!['ORGANIZER','PARTICIPANT'].includes(m.role))throw new InputError('Active participant or organizer access is required.',403);
 return m;
}
function configured(){return !!(process.env.GMAIL_USER&&process.env.GMAIL_APP_PASSWORD&&process.env.APP_ORIGIN);}
export async function readInbox(actorId:string,eventId:string):Promise<InboxData>{return db().$transaction(async tx=>{
 const m=await scope(tx,actorId,eventId),organizer=m.role==='ORGANIZER';
 const messages=await tx.inboxMessage.findMany({where:{eventId,...(!organizer?{recipientId:m.id}:{})},include:{recipient:{select:{user:{select:{name:true}}}},attachments:{select:{attachment:{select:{id:true,name:true,mime:true,size:true}}}},deliveries:{where:organizer?{}:{id:""},include:{membership:{select:{user:{select:{name:true}}}}}}},orderBy:{createdAt:'desc'}});
 return {eventId,actorId,organizer,blocked:!!m.event.archivedAt||m.event.state==='PAUSED',emailConfigured:configured(),people:organizer?(await tx.eventMembership.findMany({where:{eventId,active:true,role:'PARTICIPANT',user:{active:true}},select:{id:true,teamId:true,user:{select:{name:true}},team:{select:{name:true}}},orderBy:{user:{name:'asc'}}})).map(p=>({id:p.id,name:p.user.name,teamId:p.teamId,team:p.team?.name??null})):[],messages:messages.map(p=>({id:p.id,subject:p.subject,body:p.body,senderName:p.senderName,recipientName:p.recipient.user.name,createdAt:p.createdAt.toISOString(),response:p.response,respondedAt:p.respondedAt?.toISOString()??null,attachments:p.attachments.map(a=>a.attachment),deliveries:organizer?p.deliveries.map(d=>({id:d.id,name:d.membership.user.name,kind:d.kind,status:d.status==='SENDING'&&d.attemptedAt&&Date.now()-d.attemptedAt.getTime()>60000?'UNKNOWN':d.status})):[]}))};
});}

// Each envelope has its own claim. A timeout is uncertain, never called delivered.
async function deliver(messageId:string){
 const pending=await db().inboxDelivery.findMany({where:{messageId,status:'PENDING'},select:{id:true}});
 await Promise.allSettled(pending.map(async({id})=>{
  const claim=await db().inboxDelivery.updateMany({where:{id,status:'PENDING'},data:{status:'SENDING',attemptedAt:new Date()}});if(!claim.count)return;
  const d=await db().inboxDelivery.findUnique({where:{id},include:{membership:{include:{user:{select:{email:true,active:true}}}},message:{include:{attachments:{include:{attachment:true}},event:true,recipient:{include:{user:{select:{name:true}}}}}}}});if(!d)return;
  const valid=d.membership.eventId===d.message.eventId&&d.membership.active&&d.membership.user.active&&(d.kind==='OFFER'?d.membership.role==='PARTICIPANT'&&d.membershipId===d.message.recipientId:d.membership.role==='ORGANIZER')&&!d.message.event.archivedAt&&d.message.event.state!=='PAUSED';
  if(!valid){await db().inboxDelivery.update({where:{id},data:{status:'SKIPPED'}});return;}
  if(!configured()){await db().inboxDelivery.update({where:{id},data:{status:'FAILED'}});return;}
  let accepted=false;
  try{
   const url=new URL(`/events/${d.message.eventId}/inbox`,process.env.APP_ORIGIN);url.searchParams.set('message',d.message.id);
   const mail=offerEmail({eventName:d.message.event.name,subject:d.message.subject,body:d.kind==='OFFER'?d.message.body:`Participant: ${d.message.recipient.user.name}\n\n${d.message.body}`,url:url.toString(),copy:d.kind!=='OFFER',response:d.kind==='RESPONSE'?d.message.response:null});
   const smtp=nodemailer.createTransport({host:'smtp.gmail.com',port:465,secure:true,auth:{user:process.env.GMAIL_USER!.trim(),pass:process.env.GMAIL_APP_PASSWORD!.replace(/\s/g,'')},connectionTimeout:5000,greetingTimeout:5000,socketTimeout:10000,disableFileAccess:true,disableUrlAccess:true});
   const sent=await smtp.sendMail({from:{name:'Spy Chase',address:process.env.GMAIL_USER!.trim()},to:d.membership.user.email,...mail,attachments:d.kind==='RESPONSE'?[]:d.message.attachments.map(({attachment:a})=>({filename:a.name,content:Buffer.from(a.content),contentType:a.mime}))});
   accepted=sent.accepted.length>0;
   await db().inboxDelivery.update({where:{id},data:{status:accepted?'ACCEPTED':'FAILED',sentAt:accepted?new Date():null}});
  }catch(error){
   const e=error as {code?:string;responseCode?:number};
   const definitive=!accepted&&(e.code==='EAUTH'||e.code==='EENVELOPE'||e.code==='ECONNECTION'||(typeof e.responseCode==='number'&&e.responseCode>=400));
   await db().inboxDelivery.updateMany({where:{id,status:'SENDING'},data:{status:definitive?'FAILED':'UNKNOWN'}});
  }
 }));
}

export async function inboxAction(actorId:string,eventId:string,value:unknown){
 const input=parseInboxAction(value),hash=tokenHash(JSON.stringify({eventId,input}));
 const raw=value as Record<string,unknown>;
 const legacyHash=input.operation==='send'&&typeof raw.recipientId==='string'&&raw.recipientIds===undefined&&raw.attachmentIds===undefined?tokenHash(JSON.stringify({eventId,input:{operation:'send',requestKey:input.requestKey,recipientId:raw.recipientId,subject:input.subject,body:input.body}})):null;
 const result=await db().$transaction(async tx=>{
  await tx.$queryRaw`SELECT id FROM "Event" WHERE id=${eventId} FOR UPDATE`;
  const m=await scope(tx,actorId,eventId);
  if(input.operation!=='respond'&&m.role!=='ORGANIZER')throw new InputError('Organizer access is required.',403);
  if(input.operation==='respond'&&m.role!=='PARTICIPANT')throw new InputError('Only the recipient can answer an offer.',403);
  const old=await tx.managementReceipt.findUnique({where:{actorId_requestKey:{actorId,requestKey:input.requestKey}}});
  if(old){if((old.requestHash!==hash&&old.requestHash!==legacyHash)||old.operation!==`inbox:${input.operation}`)throw new InputError('This request was already used with different details.',409);return old.responseJson as {id:string;ids?:string[];message:string};}
  if(m.event.archivedAt||m.event.state==='PAUSED')throw new InputError('Inbox actions are unavailable while this event is paused or archived.',409);
  const organizers=await tx.eventMembership.findMany({where:{eventId,active:true,role:'ORGANIZER',user:{active:true}},select:{id:true}});
  let id:string,message:string,ids:string[]=[];
  if(input.operation==='send'){
   const recipients=await tx.eventMembership.findMany({where:{id:{in:input.recipientIds},eventId,active:true,role:'PARTICIPANT',user:{active:true}},select:{id:true,teamId:true}});
   if(recipients.length!==input.recipientIds.length)throw new InputError('Choose active participants in this event. No offers were sent.');
   const teamIds=recipients.flatMap(p=>p.teamId?[p.teamId]:[]);
   if(new Set(teamIds).size!==teamIds.length)throw new InputError('Choose only one participant per team in this send. No offers were sent.');
   const files=await tx.inboxAttachment.findMany({where:{id:{in:input.attachmentIds},eventId,uploaderId:actorId},select:{id:true,size:true}});
   if(files.length!==input.attachmentIds.length||files.reduce((sum,f)=>sum+f.size,0)>inboxTotalFileLimit)throw new InputError('Choose your uploaded event attachments, up to 10 MB total.');
   const batchId=randomUUID();
   for(const recipient of recipients){
    const saved=await tx.inboxMessage.create({data:{eventId,batchId,recipientId:recipient.id,senderName:m.user.name,subject:input.subject,body:input.body,attachments:{create:files.map(f=>({attachmentId:f.id}))},deliveries:{create:[{membershipId:recipient.id,kind:'OFFER'},...organizers.map(o=>({membershipId:o.id,kind:'COPY'}))]}}});ids.push(saved.id);
   }
   id=ids[0];message=ids.length===1?'Offer saved to the participant inbox.':`Offers saved to ${ids.length} participant inboxes.`;
  }else if(input.operation==='respond'){
   const offer=await tx.inboxMessage.findFirst({where:{id:input.id,eventId,recipientId:m.id}});if(!offer)throw new InputError('Offer not found.',404);
   if(offer.response&&offer.response!==input.response)throw new InputError('Your answer is already final.',409);
   id=offer.id;message=input.response==='YES'?'Offer accepted.':'Offer declined.';
   if(!offer.response){await tx.inboxMessage.update({where:{id},data:{response:input.response,respondedAt:new Date()}});await tx.inboxDelivery.createMany({data:organizers.map(o=>({messageId:id,membershipId:o.id,kind:'RESPONSE'})),skipDuplicates:true});}
  }else{
   const delivery=await tx.inboxDelivery.findFirst({where:{id:input.id,message:{eventId}}});if(!delivery)throw new InputError('Email not found.',404);
   if(delivery.status!=='FAILED')throw new InputError('Only failed emails can be retried. Uncertain sends may already have arrived.',409);
   await tx.inboxDelivery.update({where:{id:delivery.id},data:{status:'PENDING'}});id=delivery.messageId;message='Email retry requested.';
  }
  const response={id,...(ids.length?{ids}:{}),message};
  await tx.auditEntry.create({data:{eventId,actorId,action:`INBOX_${input.operation.toUpperCase()}`,detailsJson:{messageId:id,...(ids.length?{messageIds:ids}:{}),...(input.operation==='respond'?{response:input.response}:{})}}});
  await tx.managementReceipt.create({data:{actorId,requestKey:input.requestKey,requestHash:hash,operation:`inbox:${input.operation}`,responseJson:response}});
  return response;
 },{timeout:30000,maxWait:10000});
 const queued=[...(result.ids??[result.id])];
 await Promise.all(Array.from({length:Math.min(3,queued.length)},async()=>{while(queued.length){const id=queued.shift();if(id)await deliver(id);}}));
 return result;
}

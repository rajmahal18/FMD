import 'server-only';
import {createHash} from 'node:crypto';
import {db} from '@/lib/db';
import {InputError} from '@/lib/validation';
import {inboxFileInfo,inboxFileLimit} from '@/lib/inbox-files';
import type {Prisma} from '@/generated/prisma/client';
async function scope(tx:Prisma.TransactionClient,actorId:string,eventId:string,write=false){
 const m=await tx.eventMembership.findUnique({where:{eventId_userId:{eventId,userId:actorId}},include:{user:{select:{active:true,mustChangePassword:true}},event:{select:{archivedAt:true,state:true}}}});
 if(!m?.active||!m.user.active||m.user.mustChangePassword||!['ORGANIZER','PARTICIPANT'].includes(m.role))throw new InputError('Active participant or organizer access is required.',403);
 if(write&&m.role!=='ORGANIZER')throw new InputError('Only organizers can attach files.',403);
 if(write&&(m.event.archivedAt||m.event.state==='PAUSED'))throw new InputError('Uploads are closed while this event is paused or archived.',409);
 return m;
}
export async function uploadInboxFile(actorId:string,eventId:string,request:Request){
 await scope(db(),actorId,eventId,true);
 if(!request.headers.get('content-type')?.startsWith('multipart/form-data;'))throw new InputError('Choose a file to upload.',415);
 const max=inboxFileLimit+65536,reader=request.body?.getReader(),chunks:Uint8Array[]=[];let size=0;
 if(reader)while(true){const part=await reader.read();if(part.done)break;size+=part.value.byteLength;if(size>max){await reader.cancel();throw new InputError('Each attachment must be no larger than 3 MB.',413);}chunks.push(part.value);}
 const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
 let form:FormData;
 try{form=await new Request('http://localhost/upload',{method:'POST',headers:{'Content-Type':request.headers.get('content-type')!},body:bytes}).formData();}catch{throw new InputError('Unable to read this upload. Choose the file again.');}
 const file=form.get('file'),uploadKey=form.get('uploadKey');
 if(!(file instanceof File)||form.getAll('file').length!==1||typeof uploadKey!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(uploadKey))throw new InputError('Choose one file and retry the upload.');
 const content=new Uint8Array(await file.arrayBuffer()),info=inboxFileInfo(file.name,content),digest=createHash('sha256').update(content).digest('hex');
 return db().$transaction(async tx=>{
  await tx.$queryRaw`SELECT id FROM "Event" WHERE id=${eventId} FOR UPDATE`;
  await scope(tx,actorId,eventId,true);
  const old=await tx.inboxAttachment.findUnique({where:{eventId_uploaderId_uploadKey:{eventId,uploaderId:actorId,uploadKey}},select:{id:true,name:true,mime:true,size:true,digest:true}});
  if(old){if(old.digest!==digest||old.name!==info.name)throw new InputError('This upload was already used for another file.',409);return {id:old.id,name:old.name,mime:old.mime,size:old.size};}
  await tx.inboxAttachment.deleteMany({where:{eventId,uploaderId:actorId,createdAt:{lt:new Date(Date.now()-86400000)},messages:{none:{}}}});
  return tx.inboxAttachment.create({data:{eventId,uploaderId:actorId,uploadKey,...info,digest,content},select:{id:true,name:true,mime:true,size:true}});
 });
}
export async function downloadInboxFile(actorId:string,eventId:string,id:string){
 const m=await scope(db(),actorId,eventId);
 const file=await db().inboxAttachment.findFirst({where:{id,eventId,...(m.role==='PARTICIPANT'?{messages:{some:{message:{eventId,recipientId:m.id}}}}:{})}});
 if(!file)throw new InputError('Attachment not found.',404);
 return file;
}
export async function removeInboxFile(actorId:string,eventId:string,id:string){
 return db().$transaction(async tx=>{
  await tx.$queryRaw`SELECT id FROM "Event" WHERE id=${eventId} FOR UPDATE`;await scope(tx,actorId,eventId,true);
  const file=await tx.inboxAttachment.findFirst({where:{id,eventId,uploaderId:actorId},select:{id:true,_count:{select:{messages:true}}}});
  if(!file)throw new InputError('Attachment not found.',404);
  if(file._count.messages)throw new InputError('Attachments on sent messages cannot be removed.',409);
  await tx.inboxAttachment.delete({where:{id}});return {message:'Attachment removed.'};
 });
}

import 'server-only';
import {db} from '@/lib/db';
import type {Prisma} from '@/generated/prisma/client';
import {InputError} from '@/lib/validation';
import {tokenHash} from '@/lib/password';
import {additionalAwards,type AdditionalAward} from '@/lib/event-awards';
import {publicRecapData} from '@/lib/public-results';
import {readEventRecap,type EventRecapData} from './event-recap';
import {passwordSetupRequired} from './password-setup';

type Tx=Prisma.TransactionClient;
type Publication={version:1;publishedAt:string;eventName:string;fingerprint:string;data:EventRecapData};
type Final={stale?:boolean;publicRecap?:Publication;additionalAwards?:AdditionalAward[]};
async function sources(tx:Tx,eventId:string){
 const event=await tx.event.findUnique({where:{id:eventId},select:{id:true,slug:true,name:true,state:true}});
 const overall=await tx.overallRanking.findUnique({where:{eventId},select:{revision:true,finalized:true}});
 const race=await tx.resultRevision.findFirst({where:{eventId},orderBy:{revision:'desc'},select:{revision:true}});
 const polls=await tx.votingEvent.findMany({where:{eventId},orderBy:{id:'asc'},select:{id:true,revision:true,publishedAt:true}});
 const contests=await tx.judgingContest.findMany({where:{eventId},orderBy:{id:'asc'},select:{id:true,revision:true,state:true,publishedAt:true}});
 const final=overall?.finalized as Final|null;
 const fingerprint=tokenHash(JSON.stringify({state:event?.state,overall:overall?.revision,stale:!!final?.stale,race:race?.revision,polls,contests}));
 return {event,overall,final,fingerprint,polls,contests};
}
export async function publishPublicResults(actorId:string,eventId:string,awards:unknown,confirm=false){
 const additions=additionalAwards(awards);
 const before=await db().$transaction(async tx=>{
  const member=await tx.eventMembership.findUnique({where:{eventId_userId:{eventId,userId:actorId}},include:{user:{select:{active:true,mustChangePassword:true}}}});
  if(!member?.active||!member.user.active||member.role!=='ORGANIZER'||await passwordSetupRequired(tx,actorId,eventId,member.user.mustChangePassword))throw new InputError('Active organizer access is required.',403);
  return sources(tx,eventId);
 });
 if(before.event?.state!=='FINALIZED'||!before.final||before.final.stale)throw new InputError('Approve current overall results before publishing publicly.',409);
 if(before.polls.some(p=>!p.publishedAt)||before.contests.some(c=>c.state!=='PUBLISHED'||!c.publishedAt))throw new InputError('Approve all voting and judged activities before publishing the public event recap.',409);
 const data=publicRecapData({...await readEventRecap(actorId,eventId),additionalAwards:additions});
 if(!data.overall.published||!data.breakdown||!data.race)throw new InputError('Complete the approved event breakdown before publishing publicly.',409);
 const publication:Publication={version:1,publishedAt:new Date().toISOString(),eventName:before.event.name,fingerprint:before.fingerprint,data};
 if(!confirm)return {published:false,slug:before.event.slug,data};
 await db().$transaction(async tx=>{
  await tx.$queryRaw`SELECT id FROM "Event" WHERE id=${eventId} FOR UPDATE`;
  const member=await tx.eventMembership.findUnique({where:{eventId_userId:{eventId,userId:actorId}},include:{user:{select:{active:true,mustChangePassword:true}}}});
  if(!member?.active||!member.user.active||member.role!=='ORGANIZER'||await passwordSetupRequired(tx,actorId,eventId,member.user.mustChangePassword))throw new InputError('Active organizer access is required.',403);
  const current=await sources(tx,eventId);
  if(current.fingerprint!==before.fingerprint)throw new InputError('Results changed during review. Run the public publication again.',409);
  const finalized={...current.overall!.finalized as object,additionalAwards:additions,publicRecap:publication};
  if(JSON.stringify(current.final?.publicRecap?.data)===JSON.stringify(data)&&current.final?.publicRecap?.fingerprint===before.fingerprint)return;
  await tx.overallRanking.update({where:{eventId},data:{finalized:finalized as unknown as Prisma.InputJsonValue}});
  await tx.auditEntry.create({data:{eventId,actorId,action:'PUBLIC_EVENT_RESULTS_PUBLISHED',targetId:eventId,detailsJson:{summary:'Final event results published for visitors without sign-in.',additionalAwards:additions,overallRevision:current.overall!.revision,previousPublication:current.final?.publicRecap?.publishedAt??null}}});
 },{isolationLevel:'Serializable',timeout:20000});
 return {published:true,slug:before.event.slug,data};
}
/** Public access is limited to a deliberately released, unchanged final snapshot. */
export async function readPublicResults(slug:string){return db().$transaction(async tx=>{
 const event=await tx.event.findUnique({where:{slug},select:{id:true}});if(!event)return null;
 const current=await sources(tx,event.id),release=current.final?.publicRecap;
 if(current.event?.state!=='FINALIZED'||current.final?.stale||release?.version!==1||release.fingerprint!==current.fingerprint)return null;
 return {eventName:release.eventName,publishedAt:release.publishedAt,data:publicRecapData(release.data)};
},{isolationLevel:'RepeatableRead',timeout:20000});}
export async function publicResultsEntry(){
 if(!process.env.DATABASE_URL)return null;
 const records=await db().overallRanking.findMany({where:{event:{state:'FINALIZED'}},select:{finalized:true,event:{select:{slug:true}}}});
 const candidates=records.filter(r=>(r.finalized as Final|null)?.publicRecap?.version===1).sort((a,b)=>((b.finalized as Final).publicRecap!.publishedAt).localeCompare((a.finalized as Final).publicRecap!.publishedAt));
 for(const record of candidates){const result=await readPublicResults(record.event.slug);if(result)return {href:'/results/'+record.event.slug,eventName:result.eventName};}
 return null;
}

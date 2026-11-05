import 'server-only';
import type {Prisma} from '@/generated/prisma/client';
import {timerSnapshot} from '@/lib/station-timing';
export function occupiedVisits(now=new Date()):Prisma.StationVisitWhereInput{return {OR:[{state:{in:['ARRIVED','ACTIVE','AWAITING_CONFIRMATION']}},{state:'COMPLETED',releaseAt:{gt:now}}]};}
export function unfinishedVisits(now=new Date()):Prisma.StationVisitWhereInput{return {OR:[{state:{in:['QUEUED','ARRIVED','ACTIVE','AWAITING_CONFIRMATION']}},{state:'COMPLETED',releaseAt:{gt:now}}]};}
// Persist effective timeouts on authorized reads/actions. The stored cutoff is
// authoritative even if every device is offline; no browser/job controls it.
export async function settleStationTimers(tx:Prisma.TransactionClient,eventId:string,where:Prisma.StationVisitWhereInput){
 const event=await tx.event.findUniqueOrThrow({where:{id:eventId},select:{finalStationId:true,archivedAt:true,state:true}});
 if(event.archivedAt||!['LIVE','PAUSED'].includes(event.state))return;
 const running=await tx.stationVisit.findMany({where:{AND:[{eventId,state:{in:['ARRIVED','ACTIVE']},startedAt:{not:null},...(event.finalStationId?{stationId:{not:event.finalStationId}}:{})},where]},include:{station:{select:{timeLimitMinutes:true}}}});
 const now=new Date();
 for(const v of running){
  const snapshot=v.timerSnapshotAt?{timerSnapshotAt:v.timerSnapshotAt,timerDeadlineAt:v.timerDeadlineAt}:timerSnapshot(v.startedAt!,v.station.timeLimitMinutes);
  const expired=!!snapshot.timerDeadlineAt&&snapshot.timerDeadlineAt<=now;
  if(!v.timerSnapshotAt||expired&&!v.finishedAt)await tx.stationVisit.updateMany({where:{id:v.id,state:v.state,finishedAt:v.finishedAt},data:{...(!v.timerSnapshotAt?snapshot:{}),...(expired&&!v.finishedAt?{finishedAt:snapshot.timerDeadlineAt,...(v.state==='ACTIVE'?{state:'AWAITING_CONFIRMATION' as const}:{})}:{})}});
 }
}

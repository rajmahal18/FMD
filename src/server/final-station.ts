import 'server-only';
import type {Prisma} from '@/generated/prisma/client';
import {outcomePoints} from './outcome-points';
import {InputError} from '@/lib/validation';
import {stationDisplayName} from '@/lib/station-name';
import type {FinalStationStatus} from '@/lib/arrival-policy';
export async function finalStationStatus(tx:Prisma.TransactionClient,eventId:string,ownTeamId?:string):Promise<FinalStationStatus|null>{
 const event=await tx.event.findUniqueOrThrow({where:{id:eventId}});if(!event.finalStationId)return null;
 const station=await tx.station.findFirst({where:{eventId,id:event.finalStationId}});if(!station)throw new InputError('The Final Station configuration needs organizer review.',409);
 const teams=await tx.team.findMany({where:{eventId},include:{routeAssignment:true}});
 const recorded=await tx.stationOutcome.findMany({where:{eventId},include:{visit:true,entries:true,corrections:{include:{entries:true}}}});
 const outcomes=recorded.filter(o=>{if(o.visit.state!=='COMPLETED'||!o.visit.confirmedAt)return false;try{outcomePoints(o);return true;}catch{return false;}});
 const readyTeams=teams.filter(t=>{const ids=t.routeAssignment?.stationIds as string[]|undefined;return !!ids?.includes(station.id)&&ids.length>1&&ids.filter(id=>id!==station.id).every(id=>outcomes.some(o=>o.teamId===t.id&&o.stationId===id));}).length;
 return {stationId:station.id,name:stationDisplayName(station.name),teamCount:teams.length,readyTeams,ready:teams.length>0&&readyTeams===teams.length,startedAt:event.finalStartedAt?.toISOString()??null,deadlineAt:event.finalDeadlineAt?.toISOString()??null,ownPoints:ownTeamId?outcomes.filter(o=>o.teamId===ownTeamId&&o.stationId===station.id).map(o=>outcomePoints(o))[0]:undefined,ownComplete:ownTeamId?outcomes.some(o=>o.teamId===ownTeamId&&o.stationId===station.id):undefined};
}
export async function startFinalStation(tx:Prisma.TransactionClient,eventId:string){
 const status=await finalStationStatus(tx,eventId);if(!status)throw new InputError('Configure a Final Station first.',409);if(status.startedAt)throw new InputError('The shared countdown has already started.',409);
 if(!status.ready)throw new InputError(`All teams must complete every regular station first (${status.readyTeams}/${status.teamCount} ready).`,409);
 const station=await tx.station.findUniqueOrThrow({where:{id:status.stationId}});if(!station.available||!station.configured||!station.timeLimitMinutes)throw new InputError('The Final Station needs an available, configured station and a countdown duration.',409);
 const teams=await tx.team.findMany({where:{eventId},include:{members:{where:{active:true,role:'PARTICIPANT',user:{active:true}},select:{id:true}}}});
 if(teams.some(t=>!t.members.length))throw new InputError('Every team needs active participants for the full-squad Final Station.',409);
 if(await tx.stationVisit.count({where:{eventId,state:{in:['QUEUED','ARRIVED','ACTIVE','AWAITING_CONFIRMATION']}}}))throw new InputError('Resolve all open regular-station visits before the shared start.',409);
 const now=new Date();const deadline=new Date(now.getTime()+station.timeLimitMinutes*60000);
 for(const team of teams){const visit=await tx.stationVisit.upsert({where:{teamId_stationId:{teamId:team.id,stationId:station.id}},create:{eventId,teamId:team.id,stationId:station.id,state:'ACTIVE',startedAt:now,arrivalAt:now,arrivalApprovedAt:now,lineupSubmittedAt:now},update:{state:'ACTIVE',startedAt:now,finishedAt:null,confirmedAt:null,arrivalAt:now,arrivalApprovedAt:now,lineupSubmittedAt:now}});await tx.stationVisitPlayer.deleteMany({where:{visitId:visit.id}});await tx.stationVisitPlayer.createMany({data:team.members.map(m=>({eventId,visitId:visit.id,membershipId:m.id}))});}
 await tx.event.update({where:{id:eventId},data:{finalStartedAt:now,finalDeadlineAt:deadline}});
 return {message:'Shared HQ countdown started for every team.',state:'ACTIVE'};
}

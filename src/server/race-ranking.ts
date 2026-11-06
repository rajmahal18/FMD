import {settleFinalChallengeForEvent} from './final-challenge';
import {rankStationRace,stationScoring,type StationRacePolicy} from '@/lib/station-ranking';
import 'server-only';
import type {Prisma} from '@/generated/prisma/client';
import {rankRace,type RaceRule} from '@/lib/race-ranking';
import {teamTotal} from './score';
export async function getRaceRule(tx:Prisma.TransactionClient,eventId:string):Promise<RaceRule>{
 const settings=await tx.overallRanking.findUnique({where:{eventId},select:{config:true}});return (settings?.config as {raceRule?:RaceRule}|undefined)?.raceRule??'POINTS';
}
export async function raceStandings(tx:Prisma.TransactionClient,eventId:string){
 const rule=await getRaceRule(tx,eventId);
 const teams=await tx.team.findMany({where:{eventId},include:{routeAssignment:true}});
 const outcomes=await tx.stationOutcome.findMany({where:{eventId},select:{teamId:true,stationId:true,durationSeconds:true,timePenaltySeconds:true,confirmedAt:true}});
 if(rule==='STATION_PLACEMENTS'){
  await settleFinalChallengeForEvent(tx,eventId);
  const event=await tx.event.findUniqueOrThrow({where:{id:eventId},select:{finalStationId:true}});
  const settings=await tx.overallRanking.findUnique({where:{eventId},select:{config:true}});
  const policy=(settings?.config as {raceScoring?:StationRacePolicy})?.raceScoring??{...stationScoring,credits:[...stationScoring.credits]};
  const finals=await tx.raceFinalResult.findMany({where:{eventId},select:{teamId:true,successful:true}});
  return {rule,rows:rankStationRace(teams.map(t=>({id:t.id,name:t.name,color:t.color,stationIds:((t.routeAssignment?.stationIds??[]) as string[]).filter(id=>id!==event.finalStationId)})),outcomes,finals,policy)};
 }
 const metrics=await Promise.all(teams.map(async t=>{
 const route=t.routeAssignment?.stationIds as string[]|undefined;
 const required=route?.length?route:[];
 const stops=required.map(id=>outcomes.find(o=>o.teamId===t.id&&o.stationId===id));
 const complete=required.length>0&&stops.every(Boolean);
 const timed=complete&&stops.every(o=>o?.durationSeconds!==null&&o?.durationSeconds!==undefined);
 return {id:t.id,name:t.name,color:t.color,points:await teamTotal(tx,eventId,t.id),complete,rawChallengeSeconds:timed?stops.reduce((n,o)=>n+o!.durationSeconds!,0):null,timePenaltySeconds:stops.reduce((n,o)=>n+(o?.timePenaltySeconds??0),0),challengeSeconds:timed?stops.reduce((n,o)=>n+o!.durationSeconds!+o!.timePenaltySeconds,0):null,completedAt:complete?Math.max(...stops.map(o=>o!.confirmedAt.getTime())):null};
 }));
 return {rule,rows:rankRace(metrics,rule)};
}

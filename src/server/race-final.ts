import {settleFinalChallengeForEvent} from './final-challenge';
import {passwordSetupRequired} from './password-setup';
import 'server-only';
import {db} from '@/lib/db';
import {InputError} from '@/lib/validation';
import {tokenHash} from '@/lib/password';
import {Prisma} from '@/generated/prisma/client';
import {requireRunRevision,runRevision} from './run-revision';
import {invalidateOverall} from './overall-invalidation';
import {stationScoring,type StationRacePolicy} from '@/lib/station-ranking';
import {raceStandings,getRaceRule} from './race-ranking';
type Tx=Prisma.TransactionClient;
async function scope(tx:Tx,actorId:string,eventId:string){
 const m=await tx.eventMembership.findUnique({where:{eventId_userId:{eventId,userId:actorId}},include:{user:true,event:true}});
 if(!m?.active||!m.user.active||(await passwordSetupRequired(tx,actorId,eventId,m.user.mustChangePassword))||m.role!=='ORGANIZER')throw new InputError('Active organizer access is required.',403);
 if(await getRaceRule(tx,eventId)!=='STATION_PLACEMENTS')throw new InputError('Station-placement race scoring is not configured for this event.',409);
 return m;
}
export async function readRaceFinal(actorId:string,eventId:string){return db().$transaction(async tx=>{
 const m=await scope(tx,actorId,eventId);await settleFinalChallengeForEvent(tx,eventId);const teams=await tx.team.findMany({where:{eventId},orderBy:{name:'asc'},select:{id:true,name:true,raceFinalResult:{select:{successful:true,version:true}}}});
 const settings=await tx.overallRanking.findUnique({where:{eventId},select:{config:true}});
 const policy=(settings?.config as {raceScoring?:StationRacePolicy})?.raceScoring??{...stationScoring,credits:[...stationScoring.credits]};
 return {policy,stations:await tx.station.findMany({where:{eventId},select:{id:true,name:true}}),eventId,runRevision:await runRevision(tx,eventId),editable:!m.event.archivedAt&&['LIVE','ENDED'].includes(m.event.state),teams:teams.map(t=>({id:t.id,name:t.name,successful:t.raceFinalResult?.successful??null,version:t.raceFinalResult?.version??0})),standings:(await raceStandings(tx,eventId)).rows};
 },{isolationLevel:'RepeatableRead'});}
export async function saveRaceFinal(actorId:string,eventId:string,value:unknown){
 const v=value as {teamId?:unknown;successful?:unknown;version?:unknown;requestKey?:unknown;runRevision?:unknown;operation?:unknown};
 if(!v||v.operation!=='setRaceFinal'||typeof v.teamId!=='string'||!v.teamId||v.teamId.length>120||typeof v.successful!=='boolean'||!Number.isSafeInteger(v.version)||(v.version as number)<0||typeof v.requestKey!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v.requestKey))throw new InputError('Review the team and Final Station result before confirming.');
 const teamId=v.teamId,successful=v.successful,version=v.version as number,requestKey=v.requestKey,hash=tokenHash(JSON.stringify({eventId,teamId,successful,version,runRevision:v.runRevision}));
 return db().$transaction(async tx=>{
  await tx.$queryRaw`SELECT id FROM "User" WHERE id=${actorId} FOR UPDATE`;
  await tx.$queryRaw`SELECT id FROM "Event" WHERE id=${eventId} FOR UPDATE`;
  const m=await scope(tx,actorId,eventId);await requireRunRevision(tx,eventId,v.runRevision);
  if(m.event.archivedAt||!['LIVE','ENDED'].includes(m.event.state))throw new InputError('Final Station entry is available while the race is Live or Ended. Reopen approved race results before correcting them.',409);
  const old=await tx.managementReceipt.findUnique({where:{actorId_requestKey:{actorId,requestKey}}});
  if(old){if(old.operation!=='setRaceFinal'||old.requestHash!==hash)throw new InputError('This request key was used for another result.',409);return {...old.responseJson as {message:string},replayed:true};}
  const team=await tx.team.findFirst({where:{id:teamId,eventId},select:{id:true,name:true}});if(!team)throw new InputError('Choose a team from this event.',404);
  const pinChallenge=await tx.finalChallenge.findUnique({where:{eventId_runRevision:{eventId,runRevision:await runRevision(tx,eventId)}}});
  if(pinChallenge?.enabled&&pinChallenge.startedAt&&!pinChallenge.endedAt)throw new InputError('Final Challenge is running. Its code/deadline determines results; refresh it before manual review.',409);
  const before=await tx.raceFinalResult.findUnique({where:{eventId_teamId:{eventId,teamId}}});
  if((before?.version??0)!==version)throw new InputError('This team result changed. Refresh and review it again.',409);
  await tx.raceFinalResult.upsert({where:{eventId_teamId:{eventId,teamId}},create:{eventId,teamId,actorId,successful},update:{actorId,successful,version:{increment:1}}});
  await invalidateOverall(tx,eventId,actorId,'Final Station result changed. Review Amazing Race and combined results.');
  const response={message:`${team.name}: ${successful?'Success':'Failed'} recorded. Race scores updated.`,teamName:team.name};
  await tx.auditEntry.create({data:{eventId,actorId,action:'RACE_FINAL_RESULT',targetId:teamId,detailsJson:{before:before?{successful:before.successful,version:before.version}:null,after:{successful,version:version+1}}}});
  await tx.managementReceipt.create({data:{actorId,requestKey,requestHash:hash,operation:'setRaceFinal',responseJson:response}});
  return response;
 },{maxWait:15000,timeout:20000});
}

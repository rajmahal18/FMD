import 'server-only';
import {db} from '@/lib/db';
import {hashPassword,verifyPassword} from '@/lib/password';
import {InputError} from '@/lib/validation';
import {validDefusalPin,type DefusalData} from '@/lib/final-challenge';
import {passwordSetupRequired} from './password-setup';
import {runRevision,requireRunRevision} from './run-revision';
import {invalidateOverall} from './overall-invalidation';
import type {Prisma} from '@/generated/prisma/client';
type Tx=Prisma.TransactionClient;
async function scope(tx:Tx,actorId:string,eventId:string){
 const m=await tx.eventMembership.findUnique({where:{eventId_userId:{eventId,userId:actorId}},include:{user:{select:{active:true,mustChangePassword:true}},event:true}});
 if(!m?.active||!m.user.active||await passwordSetupRequired(tx,actorId,eventId,m.user.mustChangePassword)||!['ORGANIZER','PARTICIPANT'].includes(m.role))throw new InputError('Active captain or organizer access is required.',403);
 if(m.role==='PARTICIPANT'&&(!m.isCaptain||!m.teamId))throw new InputError('Only captains can access the Final Challenge.',403);return m;
}
export async function finalChallengeReadiness(tx:Tx,eventId:string){
 const config=(await tx.overallRanking.findUnique({where:{eventId},select:{config:true}}))?.config as {raceRule?:string;raceScoring?:{stationIds?:string[]}}|undefined;
 const ids=config?.raceScoring?.stationIds;
 const teams=await tx.team.findMany({where:{eventId},include:{routeAssignment:true}});
 const outcomes=await tx.stationOutcome.findMany({where:{eventId},select:{teamId:true,stationId:true,visit:{select:{state:true,confirmedAt:true,releaseAt:true}}}});
 const now=new Date();
 const eligible=config?.raceRule==='STATION_PLACEMENTS'&&Array.isArray(ids)&&ids.length>0;
 const readyTeams=eligible?teams.filter(t=>Array.isArray(t.routeAssignment?.stationIds)&&ids.every(id=>(t.routeAssignment!.stationIds as string[]).includes(id)&&outcomes.some(o=>o.teamId===t.id&&o.stationId===id&&o.visit.state==='COMPLETED'&&o.visit.confirmedAt&&(!o.visit.releaseAt||o.visit.releaseAt<=now)))).length:0;
 const open=await tx.stationVisit.count({where:{eventId,state:{in:['QUEUED','ARRIVED','ACTIVE','AWAITING_CONFIRMATION']}}});
 return {teams,readyTeams,ready:!!eligible&&teams.length>0&&readyTeams===teams.length&&!open};
}
// Called with the event lock. Never overwrite manual or previously decided results.
async function settle(tx:Tx,c:NonNullable<Awaited<ReturnType<Tx['finalChallenge']['findUnique']>>>,eventId:string){
 if(!c.enabled||!c.startedAt||!c.deadlineAt||c.endedAt)return;
 const now=new Date();if(now<c.deadlineAt)return;
 const pending=await tx.finalChallengeTeam.findMany({where:{challengeId:c.id,successful:null}});
 for(const team of pending){
  await tx.finalChallengeTeam.update({where:{challengeId_teamId:{challengeId:c.id,teamId:team.teamId}},data:{successful:false}});
  if(!await tx.raceFinalResult.findUnique({where:{eventId_teamId:{eventId,teamId:team.teamId}}}))await tx.raceFinalResult.create({data:{eventId,teamId:team.teamId,actorId:c.ownerId,successful:false}});
 }
 await tx.finalChallenge.update({where:{id:c.id},data:{endedAt:c.deadlineAt}});
 if(pending.length){await invalidateOverall(tx,eventId,c.ownerId,'Final Challenge deadline reached. Review the race results.');await tx.auditEntry.create({data:{eventId,actorId:c.ownerId,action:'FINAL_CHALLENGE_EXPIRED',targetId:c.id,detailsJson:{failedTeamIds:pending.map(t=>t.teamId),deadlineAt:c.deadlineAt.toISOString()}}});}
}
export async function settleFinalChallengeForEvent(tx:Tx,eventId:string){
 const run=await runRevision(tx,eventId);let c=await tx.finalChallenge.findUnique({where:{eventId_runRevision:{eventId,runRevision:run}}});
 if(!c?.enabled||!c.startedAt||!c.deadlineAt||c.endedAt||new Date()<c.deadlineAt)return;
 await tx.$queryRaw`SELECT id FROM "Event" WHERE id=${eventId} FOR UPDATE`;
 const event=await tx.event.findUniqueOrThrow({where:{id:eventId},select:{archivedAt:true}});if(event.archivedAt)return;
 c=await tx.finalChallenge.findUniqueOrThrow({where:{id:c.id}});await settle(tx,c,eventId);
}
export async function readFinalChallenge(actorId:string,eventId:string):Promise<DefusalData>{return db().$transaction(async tx=>{
 const m=await scope(tx,actorId,eventId),revision=await runRevision(tx,eventId);let c=await tx.finalChallenge.findUnique({where:{eventId_runRevision:{eventId,runRevision:revision}}});
 if(c?.enabled&&c.startedAt&&!c.endedAt&&!m.event.archivedAt){await settleFinalChallengeForEvent(tx,eventId);c=await tx.finalChallenge.findUniqueOrThrow({where:{id:c.id}});}
 const organizer=m.role==='ORGANIZER',readiness=c||organizer?await finalChallengeReadiness(tx,eventId):{teams:[],readyTeams:0,ready:false};
 const records=c?await tx.finalChallengeTeam.findMany({where:{challengeId:c.id},include:{team:{select:{name:true}}},orderBy:{team:{name:'asc'}}}):[];
 const visible=organizer||!!c?.enabled&&!m.event.hideStationDetails;
 return {enabled:visible&&!!c?.enabled,organizer,runRevision:revision,revision:c?.revision??0,ready:visible&&readiness.ready,readyTeams:organizer?readiness.readyTeams:0,teamCount:organizer?readiness.teams.length:0,durationSeconds:visible?c?.durationSeconds??null:null,startedAt:visible?c?.startedAt?.toISOString()??null:null,deadlineAt:visible?c?.deadlineAt?.toISOString()??null:null,endedAt:visible?c?.endedAt?.toISOString()??null:null,checkedAt:new Date().toISOString(),blocked:m.event.archivedAt!==null||!['PREPARING','READY','LIVE'].includes(m.event.state),teams:visible?(organizer?(readiness.teams.map(t=>records.find(r=>r.teamId===t.id)??({teamId:t.id,team:{name:t.name},attempts:0,defusedAt:null,successful:null,pinHash:''}))):records.filter(t=>t.teamId===m.teamId)).map(t=>({id:t.teamId,name:t.team.name,status:t.successful===true?'DEFUSED':t.successful===false?'EXPIRED':c?.startedAt?'ALERT':'WAITING',attempts:t.attempts,defusedAt:t.defusedAt?.toISOString()??null,...(organizer?{pinConfigured:!!t.pinHash}:{})})):[]};
 },{timeout:15000});}
export async function finalChallengeAction(actorId:string,eventId:string,value:unknown){
 const v=value as {operation?:string;requestKey?:string;runRevision?:number;revision?:number;enabled?:boolean;durationSeconds?:number;pins?:Record<string,string>;pin?:string};
 if(!v||!['configure','start','submit'].includes(v.operation??'')||typeof v.requestKey!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v.requestKey))throw new InputError('Choose a Final Challenge action.');
 if(v.operation==='submit'&&!validDefusalPin(v.pin))throw new InputError('Enter exactly six digits.');
 const requestKey=v.requestKey,requestBody=JSON.stringify({eventId,...v});
 return db().$transaction(async tx=>{
  await tx.$queryRaw`SELECT id FROM "User" WHERE id=${actorId} FOR UPDATE`;
  await tx.$queryRaw`SELECT id FROM "Event" WHERE id=${eventId} FOR UPDATE`;
  const m=await scope(tx,actorId,eventId);await requireRunRevision(tx,eventId,v.runRevision);
  if(v.operation==='submit'?m.role!=='PARTICIPANT':m.role!=='ORGANIZER')throw new InputError('This action is not available for your role.',403);
  if(m.event.archivedAt||m.event.state==='PAUSED'||m.event.state==='FINALIZED')throw new InputError('Final Challenge actions are closed.',409);
  const old=await tx.managementReceipt.findUnique({where:{actorId_requestKey:{actorId,requestKey}}});
  if(old){if(old.operation!=='final-challenge:'+v.operation||!await verifyPassword(requestBody,old.requestHash))throw new InputError('Retry the original request or refresh.',409);return old.responseJson;}
  const run=await runRevision(tx,eventId);let c=await tx.finalChallenge.findUnique({where:{eventId_runRevision:{eventId,runRevision:run}}});
  if(c?.startedAt)await settle(tx,c,eventId);
  let response:{message:string;correct?:boolean;expired?:boolean};
  if(v.operation==='configure'){
   if(!['PREPARING','READY','LIVE'].includes(m.event.state))throw new InputError('Configure the challenge before the race ends.',409);
   if(c?.startedAt)throw new InputError('The challenge has started. Its PINs and duration are locked.',409);
   if((c?.revision??0)!==v.revision)throw new InputError('Settings changed. Refresh before saving.',409);
   if(typeof v.enabled!=='boolean'||!Number.isInteger(v.durationSeconds)||v.durationSeconds!<60||v.durationSeconds!>7200||!v.pins||typeof v.pins!=='object'||Array.isArray(v.pins))throw new InputError('Choose a duration from 1 to 120 minutes and six-digit PINs.');
   const readiness=await finalChallengeReadiness(tx,eventId);
   if(m.event.finalStationId)throw new InputError('This event uses the existing station-based finale. Keep that flow or review the configuration separately.',409);
   if(await tx.raceFinalResult.count({where:{eventId}}))throw new InputError('Final results already exist. They will not be replaced by a PIN challenge.',409);
   if(Object.keys(v.pins).some(id=>!readiness.teams.some(t=>t.id===id)))throw new InputError('Choose squads from this event.');
   for(const pin of Object.values(v.pins))if(pin!==''&&!validDefusalPin(pin))throw new InputError('PINs must contain exactly six digits.');
   const saved=c?await tx.finalChallengeTeam.findMany({where:{challengeId:c.id}}):[];
   if(v.enabled&&readiness.teams.some(t=>!v.pins![t.id]&&!saved.some(s=>s.teamId===t.id)))throw new InputError('Set a PIN for every squad before enabling.');
   c=await tx.finalChallenge.upsert({where:{eventId_runRevision:{eventId,runRevision:run}},create:{eventId,runRevision:run,ownerId:actorId,enabled:v.enabled,durationSeconds:v.durationSeconds!},update:{ownerId:actorId,enabled:v.enabled,durationSeconds:v.durationSeconds!,revision:{increment:1}}});
   for(const t of readiness.teams){const pin=v.pins[t.id];if(pin)await tx.finalChallengeTeam.upsert({where:{challengeId_teamId:{challengeId:c.id,teamId:t.id}},create:{challengeId:c.id,teamId:t.id,pinHash:await hashPassword(pin)},update:{pinHash:await hashPassword(pin)}});}
   response={message:v.enabled?'Final Challenge enabled. Captains switch only after all squads finish and release.':'Final Challenge saved and disabled.'};
  }else if(v.operation==='start'){
   if(m.event.state!=='LIVE'||!c?.enabled||c.startedAt)throw new InputError('Enable the challenge first. It can start only once while the race is Live.',409);
   if(c.revision!==v.revision)throw new InputError('Settings changed. Refresh before starting.',409);
   const ready=await finalChallengeReadiness(tx,eventId),configured=await tx.finalChallengeTeam.findMany({where:{challengeId:c.id}});
   if(!ready.ready||configured.length!==ready.teams.length||ready.teams.some(t=>!configured.some(s=>s.teamId===t.id)))throw new InputError('All squads must finish and release from all regular stations, and each needs a PIN.',409);
   if(await tx.raceFinalResult.count({where:{eventId}}))throw new InputError('Final results already exist. Nothing was started.',409);
   const now=new Date();await tx.finalChallenge.update({where:{id:c.id},data:{ownerId:actorId,startedAt:now,deadlineAt:new Date(now.getTime()+c.durationSeconds*1000),revision:{increment:1}}});response={message:'Shared countdown started for all squads.'};
  }else{
   if(!c?.enabled||!c.startedAt||!c.deadlineAt||m.event.hideStationDetails)throw new InputError('Wait for the organizer to start the Final Challenge.',409);
   const team=await tx.finalChallengeTeam.findUnique({where:{challengeId_teamId:{challengeId:c.id,teamId:m.teamId!}}});if(!team)throw new InputError('Your squad is not part of this challenge.',403);
   if(team.successful===true)response={message:'Threat neutralized. Your squad has already defused the threat.',correct:true};
   else if(team.successful===false||new Date()>=c.deadlineAt)response={message:'Time expired. No more attempts are accepted.',expired:true};
   else{
    if(m.event.state!=='LIVE')throw new InputError('Submissions are closed.',409);
    if(team.lastAttemptAt&&Date.now()-team.lastAttemptAt.getTime()<1000)throw new InputError('Wait one second before the next attempt.',429);
    const acceptedAt=new Date(),correct=await verifyPassword(v.pin!,team.pinHash);
    await tx.finalChallengeTeam.update({where:{challengeId_teamId:{challengeId:c.id,teamId:m.teamId!}},data:{attempts:{increment:1},lastAttemptAt:acceptedAt,...(correct?{successful:true,defusedAt:acceptedAt}:{})}});
    if(correct){
     if(await tx.raceFinalResult.findUnique({where:{eventId_teamId:{eventId,teamId:m.teamId!}}}))throw new InputError('A final result already exists. Ask the organizer to review.',409);
     await tx.raceFinalResult.create({data:{eventId,teamId:m.teamId!,actorId:c.ownerId,successful:true}});
     await invalidateOverall(tx,eventId,c.ownerId,'Final Challenge defused. Review race results.');
     if(!await tx.finalChallengeTeam.count({where:{challengeId:c.id,successful:null}}))await tx.finalChallenge.update({where:{id:c.id},data:{endedAt:acceptedAt}});
    }
    response={message:correct?'Threat neutralized. Your squad is defused.':'Incorrect PIN. Try again while time remains.',correct};
   }
  }
  await tx.auditEntry.create({data:{eventId,actorId,action:'FINAL_CHALLENGE_'+v.operation!.toUpperCase(),targetId:c?.id,detailsJson:{...(v.operation==='submit'?{teamId:m.teamId,correct:response.correct??false,expired:response.expired??false}:{enabled:v.enabled??true,durationSeconds:v.durationSeconds??c?.durationSeconds})}}});
  await tx.managementReceipt.create({data:{actorId,requestKey,requestHash:await hashPassword(requestBody),operation:'final-challenge:'+v.operation,responseJson:response}});return response;
 },{timeout:20000,maxWait:15000});
}

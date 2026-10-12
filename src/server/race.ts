import "server-only";
import {Prisma,type Station} from "@/generated/prisma/client";
import {db} from "@/lib/db";
import {InputError} from "@/lib/validation";
import {tokenHash} from "@/lib/password";
import {mayOperateStation} from "@/lib/policy";
import {admission,routeProgress} from "@/lib/routes";
import {stationCredential,resultPoints,nextDestination,type RaceCommand,type RaceResult,type ArrivalPreview} from "@/lib/race";
import {readiness} from "./readiness";
import {teamTotal} from "./score";
const inflight=["QUEUED","ARRIVED","ACTIVE","AWAITING_CONFIRMATION"] as const;
const occupied=["ARRIVED","ACTIVE","AWAITING_CONFIRMATION"] as const;
export function parseRace(value:unknown):RaceCommand{
 if(!value||typeof value!=="object"||Array.isArray(value))throw new InputError("Invalid race request.");const v=value as Record<string,unknown>;
 const fields:Record<string,string[]>={startEvent:[],checkIn:["credential"],leaveQueue:["visitId"],admitTeam:["visitId"],startChallenge:["visitId"],finishChallenge:["visitId"],confirmResult:["visitId","successful","points","bonus","penalty","reason"]};
 if(typeof v.operation!=="string"||!fields[v.operation]||Object.keys(v).some(k=>!["operation","requestKey",...fields[v.operation as string]].includes(k)))throw new InputError("Invalid race action.");
 if(typeof v.requestKey!=="string"||!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v.requestKey))throw new InputError("Refresh the action and try again.");
 if(v.operation==="checkIn"&&(typeof v.credential!=="string"||!v.credential.trim()||v.credential.length>1024))throw new InputError("Enter a station code or scan its QR.");
 if(!["checkIn","startEvent"].includes(v.operation)&&(typeof v.visitId!=="string"||!v.visitId||v.visitId.length>120))throw new InputError("Choose a team visit from this event.");
 if(v.operation==="confirmResult"){if(typeof v.successful!=="boolean")throw new InputError("Choose the challenge result.");for(const key of ["points","bonus","penalty"]){if(v[key]!==undefined&&(typeof v[key]!=="number"||!Number.isSafeInteger(v[key])||(v[key] as number)<0||(v[key] as number)>100000))throw new InputError("Points and adjustments must be whole numbers from 0 to 100000.");}if(v.reason!==undefined&&(typeof v.reason!=="string"||v.reason.length>500))throw new InputError("Keep the adjustment reason under 500 characters.");}
 return v as RaceCommand;
}
async function arrivalBudget(actorId:string,eventId:string){
 const key=tokenHash(`arrival:${actorId}:${eventId}`);const now=new Date();const expires=new Date(now.getTime()+5*60*1000);
 // Separate committed budget: invalid credential transactions must not roll back their attempts.
 const rows=await db().$queryRaw<{count:number}[]>`INSERT INTO "LoginAttempt" ("key","count","expiresAt") VALUES (${key},1,${expires}) ON CONFLICT ("key") DO UPDATE SET "count"=CASE WHEN "LoginAttempt"."expiresAt" < ${now} THEN 1 ELSE "LoginAttempt"."count"+1 END,"expiresAt"=CASE WHEN "LoginAttempt"."expiresAt" < ${now} THEN EXCLUDED."expiresAt" ELSE "LoginAttempt"."expiresAt" END RETURNING "count"`;
 if(rows[0].count>30)throw new InputError("Too many station-code attempts. Wait five minutes and retry.",429);
}
async function context(tx:Prisma.TransactionClient,actorId:string,eventId:string){
 // All race/setup commands lock actor then event, so membership, event state, queues and scores serialize.
 await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id"=${actorId} FOR UPDATE`;
 await tx.$queryRaw`SELECT "id" FROM "Event" WHERE "id"=${eventId} FOR UPDATE`;
 const m=await tx.eventMembership.findUnique({where:{eventId_userId:{eventId,userId:actorId}},include:{user:true,event:true,assignments:true}});
 if(!m?.active||!m.user.active)throw new InputError("Event access is no longer available.",404);if(m.user.mustChangePassword)throw new InputError("Change your temporary password first.",403);if(m.event.archivedAt)throw new InputError("This operation is archived and read-only.",409);return m;
}
function requireLive(state:string){if(state!=="LIVE")throw new InputError(state==="PAUSED"?"The operation is paused. Wait for it to resume.":"The operation is not live. No arrival or result was recorded.",409);}
async function captain(tx:Prisma.TransactionClient,m:{role:string;isCaptain:boolean;teamId:string|null},eventId:string){if(m.role!=="PARTICIPANT"||!m.isCaptain||!m.teamId)throw new InputError("Only your team’s active captain can check in or leave its queue.",403);const team=await tx.team.findFirst({where:{id:m.teamId,eventId}});if(!team)throw new InputError("Your team assignment needs organizer review.",409);return team;}
async function resolveArrival(tx:Prisma.TransactionClient,eventId:string,teamId:string,credential:string){
 let code:string;try{code=stationCredential(credential,eventId,process.env.APP_ORIGIN??"");}catch(e){throw new InputError((e as Error).message);}
 const station=await tx.station.findFirst({where:{eventId,arrivalCode:code}});if(!station)throw new InputError("Station code not found in this event. Check the sign and retry.",404);
 if(!station.configured||!station.available)throw new InputError("This station is unavailable. Ask the organizer where to wait.",409);
 const route=await tx.teamRouteAssignment.findUnique({where:{teamId},include:{route:true}});if(!route||route.route.eventId!==eventId)throw new InputError("Your team needs an assigned route.",409);
 const ids=route.stationIds as string[];const outcomes=await tx.stationOutcome.findMany({where:{eventId,teamId},select:{stationId:true}});const complete=new Set(outcomes.map(o=>o.stationId));
 if(complete.has(station.id))throw new InputError("Your team already has a confirmed result here. Refresh your mission.",409);
 const progress=routeProgress(route.mode,ids,complete);if(!progress.unlocked.includes(station.id))throw new InputError("This station is locked or is not on your team’s route.",409);
 const current=await tx.stationVisit.findFirst({where:{eventId,teamId,state:{in:[...inflight]}}});if(current&&current.stationId!==station.id)throw new InputError("Finish your current station or leave its waiting queue first.",409);
 const existing=await tx.stationVisit.findUnique({where:{teamId_stationId:{teamId,stationId:station.id}}});if(existing?.state==="COMPLETED")throw new InputError("This station’s progress needs organizer review.",409);
 return {station,existing};
}
async function stationQueue(tx:Prisma.TransactionClient,eventId:string,stationId:string){return tx.stationVisit.findMany({where:{eventId,stationId,state:"QUEUED"},orderBy:[{queuedAt:"asc"},{id:"asc"}]});}
export async function promoteQueue(tx:Prisma.TransactionClient,station:Station,actorId:string){
 if(!station.available||!station.queueEnabled)return;
 const occupancy=await tx.stationVisit.count({where:{eventId:station.eventId,stationId:station.id,state:{in:[...occupied]}}});const queue=await stationQueue(tx,station.eventId,station.id);const places=station.capacity===null?queue.length:Math.max(0,station.capacity-occupancy);
 for(const visit of queue.slice(0,places)){await tx.stationVisit.update({where:{id:visit.id},data:{state:"ARRIVED"}});await tx.auditEntry.create({data:{eventId:station.eventId,actorId,action:"RACE_QUEUE_ADMITTED",targetId:visit.id,detailsJson:{teamId:visit.teamId,stationId:station.id,automatic:true}}});}
}
export async function previewArrival(actorId:string,eventId:string,credential:string):Promise<ArrivalPreview>{
 await arrivalBudget(actorId,eventId);return db().$transaction(async tx=>{const m=await context(tx,actorId,eventId);const team=await captain(tx,m,eventId);requireLive(m.event.state);const {station,existing}=await resolveArrival(tx,eventId,team.id,credential);const occupancy=await tx.stationVisit.count({where:{eventId,stationId:station.id,state:{in:[...occupied]}}});const queue=await stationQueue(tx,eventId,station.id);return {teamName:team.name,stationId:station.id,stationName:station.name,location:station.location,existingState:existing&&existing.state!=="CANCELLED"?existing.state:null,admission:existing&&existing.state!=="CANCELLED"?existing.state==="QUEUED"?"WAIT":"ADMIT":admission(station.capacity,station.queueEnabled,occupancy,queue.map(v=>v.teamId),team.id)};},{maxWait:10000,timeout:15000});
}
export async function raceCommand(actorId:string,eventId:string,body:unknown):Promise<RaceResult>{
 const command=parseRace(body);const {requestKey,...input}=command;const requestHash=tokenHash(JSON.stringify(Object.fromEntries(Object.entries(input).sort(([a],[b])=>a.localeCompare(b))))+eventId);const operation=`race:${command.operation}`;
 if(command.operation==="checkIn"&&!await db().managementReceipt.findUnique({where:{actorId_requestKey:{actorId,requestKey}}}))await arrivalBudget(actorId,eventId);
 return db().$transaction(async tx=>{
  const m=await context(tx,actorId,eventId);let team:Awaited<ReturnType<typeof captain>>|undefined;
  if(command.operation==="startEvent"){if(m.role!=="ORGANIZER")throw new InputError("Organizer access is required to start the operation.",403);}else if(["checkIn","leaveQueue"].includes(command.operation))team=await captain(tx,m,eventId);
  const visit=command.visitId?await tx.stationVisit.findFirst({where:{id:command.visitId,eventId},include:{station:true,team:true,outcome:true}}):null;
  if(command.visitId){if(!visit)throw new InputError("Team visit not found in this event.",404);if(command.operation==="leaveQueue"){if(visit.teamId!==team!.id)throw new InputError("You can only leave your own team’s queue.",403);}else if(!mayOperateStation(m.role,m.assignments.some(a=>a.stationId===visit.stationId)))throw new InputError("You are not assigned to this station.",403);}
  const receipt=await tx.managementReceipt.findUnique({where:{actorId_requestKey:{actorId,requestKey}}});if(receipt){if(receipt.operation!==operation||receipt.requestHash!==requestHash)throw new InputError("This request key was already used with different details. Refresh before retrying.",409);return {...receipt.responseJson as RaceResult,replayed:true};}
  let result:RaceResult;let targetId=visit?.id;let details:Prisma.InputJsonValue={};
  if(command.operation==="startEvent"){
   if(!["PREPARING","READY"].includes(m.event.state))throw new InputError("This operation has already started or is closed.",409);const ready=await readiness(tx,eventId);if(ready.issues.length)throw new InputError(`Preparation is incomplete: ${ready.issues[0].message}`,409);await tx.event.update({where:{id:eventId},data:{state:"LIVE"}});targetId=eventId;details={teamCount:ready.teamCount,stationCount:ready.stationCount};result={message:"Operation started. Captain check-in and station handling are live.",state:"LIVE",redirect:`/events/${eventId}`};
  }else if(command.operation==="confirmResult"){
   if(!visit)throw new InputError("Choose a team visit.");let points:ReturnType<typeof resultPoints>;try{points=resultPoints(visit.station,{successful:command.successful!,points:command.points,bonus:command.bonus,penalty:command.penalty,reason:command.reason});}catch(e){throw new InputError((e as Error).message);}
   const resultHash=tokenHash(JSON.stringify({visitId:visit.id,...points}));
   if(visit.outcome){if(visit.outcome.resultHash!==resultHash)throw new InputError("This visit already has a different confirmed result. Refresh its history; no points were changed.",409);result={...visit.outcome.confirmationJson as RaceResult,replayed:true};}
   else{
    requireLive(m.event.state);if(!visit.station.available)throw new InputError("This station is unavailable. Ask the organizer to review it.",409);if(visit.state!=="AWAITING_CONFIRMATION")throw new InputError("Finish this physical challenge before confirming its result.",409);
    const route=await tx.teamRouteAssignment.findUnique({where:{teamId:visit.teamId},include:{route:true}});if(!route||route.route.eventId!==eventId||!(route.stationIds as string[]).includes(visit.stationId))throw new InputError("This team’s route needs organizer review.",409);
    const now=new Date();const durationSeconds=visit.startedAt?Math.max(0,Math.floor(((visit.finishedAt??now).getTime()-visit.startedAt.getTime())/1000)):null;
    const outcome=await tx.stationOutcome.create({data:{eventId,teamId:visit.teamId,stationId:visit.stationId,visitId:visit.id,actorId,successful:points.successful,basePoints:points.basePoints,bonus:points.bonus,penalty:points.penalty,reason:points.reason,durationSeconds,confirmedAt:now,resultHash,confirmationJson:{}}});
    const entries:{kind:"STATION"|"BONUS"|"PENALTY";amount:number}[]=[{kind:"STATION",amount:points.basePoints}];if(points.bonus)entries.push({kind:"BONUS",amount:points.bonus});if(points.penalty)entries.push({kind:"PENALTY",amount:-points.penalty});
    for(const entry of entries)await tx.scoreLedgerEntry.create({data:{eventId,teamId:visit.teamId,stationId:visit.stationId,outcomeId:outcome.id,...entry}});
    await tx.stationVisit.update({where:{id:visit.id},data:{state:"COMPLETED",confirmedAt:now}});
    const completed=await tx.stationOutcome.findMany({where:{eventId,teamId:visit.teamId},select:{stationId:true}});const stations=await tx.station.findMany({where:{eventId,id:{in:route.stationIds as string[]}},select:{id:true,name:true,available:true}});
    result={message:"Result confirmed. Points and route progress were saved together.",teamName:visit.team.name,stationName:visit.station.name,state:"COMPLETED",basePoints:points.basePoints,bonus:points.bonus,penalty:points.penalty,resultPoints:points.total,teamTotal:await teamTotal(tx,eventId,visit.teamId),nextDestination:nextDestination(route.mode,route.stationIds as string[],new Set(completed.map(o=>o.stationId)),stations),confirmedAt:now.toISOString()};
    await tx.stationOutcome.update({where:{id:outcome.id},data:{confirmationJson:result as Prisma.InputJsonValue}});await promoteQueue(tx,visit.station,actorId);targetId=outcome.id;details={visitId:visit.id,teamId:visit.teamId,stationId:visit.stationId,...points};
   }
  }else{
   requireLive(m.event.state);
   switch(command.operation){
    case "checkIn":{
     const {station,existing}=await resolveArrival(tx,eventId,team!.id,command.credential!);await promoteQueue(tx,station,actorId);
     const current=existing?await tx.stationVisit.findUnique({where:{id:existing.id}}):null;
     if(current&&current.state!=="CANCELLED"){result={message:"Your team is already checked in here.",teamName:team!.name,stationName:station.name,state:current.state,replayed:true};targetId=current.id;break;}
     const occupancy=await tx.stationVisit.count({where:{eventId,stationId:station.id,state:{in:[...occupied]}}});const queue=await stationQueue(tx,eventId,station.id);const decision=admission(station.capacity,station.queueEnabled,occupancy,queue.map(v=>v.teamId),team!.id);if(decision==="FULL")throw new InputError("This station is full. Wait nearby and retry; no arrival or points were recorded.",409);
     const state=decision==="WAIT"?"QUEUED":"ARRIVED";const values={state,queuedAt:state==="QUEUED"?new Date():null,startedAt:null,finishedAt:null,confirmedAt:null} as const;const saved=await tx.stationVisit.upsert({where:{teamId_stationId:{teamId:team!.id,stationId:station.id}},create:{eventId,teamId:team!.id,stationId:station.id,...values},update:values});targetId=saved.id;details={teamId:team!.id,stationId:station.id,state};result={message:state==="QUEUED"?"Your team joined the waiting queue. No points were awarded.":"Arrival confirmed. Meet the facilitator; no points were awarded.",teamName:team!.name,stationName:station.name,state};break;
    }
    case "leaveQueue":if(visit!.state!=="QUEUED")throw new InputError("Your team is no longer in the waiting queue. Refresh your mission.",409);await tx.stationVisit.update({where:{id:visit!.id},data:{state:"CANCELLED"}});await promoteQueue(tx,visit!.station,actorId);result={message:"Your team left the waiting queue. No result or points were recorded.",teamName:visit!.team.name,stationName:visit!.station.name,state:"CANCELLED"};break;
    case "admitTeam":{
     if(!visit!.station.available||visit!.state!=="QUEUED")throw new InputError("This team cannot be admitted now. Refresh the station.",409);const queue=await stationQueue(tx,eventId,visit!.stationId);const occupancy=await tx.stationVisit.count({where:{eventId,stationId:visit!.stationId,state:{in:[...occupied]}}});if(queue[0]?.id!==visit!.id||admission(visit!.station.capacity,true,occupancy,queue.map(v=>v.teamId),visit!.teamId)!=="ADMIT")throw new InputError("Admit the first waiting team when a place is available.",409);await tx.stationVisit.update({where:{id:visit!.id},data:{state:"ARRIVED"}});result={message:"Team admitted. The facilitator can start its challenge.",teamName:visit!.team.name,stationName:visit!.station.name,state:"ARRIVED"};break;
    }
    case "startChallenge":if(!visit!.station.available||visit!.state!=="ARRIVED")throw new InputError("Confirm arrival before starting this challenge.",409);await tx.stationVisit.update({where:{id:visit!.id},data:{state:"ACTIVE",startedAt:new Date(),finishedAt:null}});result={message:"Physical challenge started. Timing is recorded; no points were awarded.",teamName:visit!.team.name,stationName:visit!.station.name,state:"ACTIVE"};break;
    case "finishChallenge":if(!visit!.station.available||visit!.state!=="ACTIVE")throw new InputError("This challenge is not active. Refresh the station.",409);await tx.stationVisit.update({where:{id:visit!.id},data:{state:"AWAITING_CONFIRMATION",finishedAt:new Date()}});result={message:"Challenge finished. Review and confirm its result next.",teamName:visit!.team.name,stationName:visit!.station.name,state:"AWAITING_CONFIRMATION"};break;
    default:throw new InputError("Unknown race action.");
   }
  }
  if(visit&&!Object.keys(details).length)details={teamId:visit.teamId,stationId:visit.stationId,from:visit.state,to:result.state??visit.state,replayed:!!result.replayed};
  await tx.auditEntry.create({data:{eventId,actorId,action:`RACE_${command.operation.toUpperCase()}`,targetId,detailsJson:details}});
  await tx.managementReceipt.create({data:{actorId,requestKey,requestHash,operation,responseJson:result as Prisma.InputJsonValue}});return result;
 },{maxWait:15000,timeout:20000});
}

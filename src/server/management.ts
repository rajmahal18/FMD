import "server-only";
import { routeCommand } from "@/server/route-management";
import { arrivalAlphabet } from "@/lib/race";
import { randomBytes } from "node:crypto";
import { db } from "@/lib/db";
import { hashPassword,tokenHash } from "@/lib/password";
import { InputError,text,color,timezone,dateOnly,emailAddress,roleValue,logoType } from "@/lib/validation";
import { Prisma } from "@/generated/prisma/client";
export type ManagementResult={message:string;targetId?:string;redirect?:string;temporaryPassword?:string;email?:string;replayed?:boolean};
export async function manage(actorId:string,data:FormData):Promise<ManagementResult>{
 const operation=text(data,"operation",40,true);const eventId=text(data,"eventId");const requestKey=text(data,"requestKey",40,true);
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(requestKey))throw new InputError("Refresh the form and try again.");
 const file=data.get("logo");let logo:Uint8Array<ArrayBuffer>|undefined;let mime:string|undefined;
 if(file instanceof File&&file.size){if(file.size>1024*1024)throw new InputError("Logo must be under 1 MB.");logo=new Uint8Array(await file.arrayBuffer());mime=logoType(logo);}
 const inputs=Array.from(data.entries()).filter(([key])=>key!=="requestKey").map(([key,value])=>[key,typeof value==="string"?value:logo?tokenHash(Buffer.from(logo).toString("base64")):""]);
 const requestHash=tokenHash(JSON.stringify(inputs));
 return db().$transaction(async tx=>{
  // Serialize commands by actor; same-event commands also lock the event below.
  await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id"=${actorId} FOR UPDATE`;
  const actor=await tx.user.findUnique({where:{id:actorId}});
  if(!actor?.active||actor.mustChangePassword)throw new InputError("Sign in and complete your password change first.",403);
  const completed=await tx.managementReceipt.findUnique({where:{actorId_requestKey:{actorId,requestKey}}});
  if(operation==="deleteDraftEvent"&&completed){if(completed.requestHash!==requestHash||completed.operation!==operation)throw new InputError("This request was already saved with different details.",409);return {...completed.responseJson as ManagementResult,replayed:true};}
  if(operation!=="createEvent"){
   await tx.$queryRaw`SELECT "id" FROM "Event" WHERE "id"=${eventId} FOR UPDATE`;
   const membership=await tx.eventMembership.findUnique({where:{eventId_userId:{eventId,userId:actorId}},include:{event:true}});
   if(!membership?.active||membership.role!=="ORGANIZER")throw new InputError("Organizer access is required for this event.",403);
   if(membership.event.archivedAt)throw new InputError("This operation is archived and read-only. Restore it from Lifecycle before making changes.",409);
   if(membership.event.state!=="PREPARING")throw new InputError("Roster and setup changes are available while the event is Preparing.",409);
  }else if(!actor.canCreateEvents)throw new InputError("You do not have permission to create events.",403);
  const receipt=await tx.managementReceipt.findUnique({where:{actorId_requestKey:{actorId,requestKey}}});
  if(receipt){if(receipt.requestHash!==requestHash||receipt.operation!==operation)throw new InputError("This request was already saved with different details. Refresh before trying again.",409);return {...receipt.responseJson as ManagementResult,replayed:true,message:operation==="addMember"?"Already saved. Temporary passwords are not displayed again; ask the platform operator if recovery is needed.":"Already saved. No duplicate change was made."};}
  let result:ManagementResult;let auditEvent=eventId||undefined;let targetUserId:string|undefined;let details:Prisma.InputJsonValue={};
  const checkedTeam=async(id:string)=>{if(!id)return null;const t=await tx.team.findFirst({where:{id,eventId}});if(!t)throw new InputError("Choose a team from this event.");return t;};
  const checkedMember=async(id:string)=>{const m=await tx.eventMembership.findFirst({where:{id,eventId},include:{user:true}});if(!m)throw new InputError("This person does not belong to this event.",404);return m;};
  const checkedStation=async(id:string)=>{const s=await tx.station.findFirst({where:{id,eventId}});if(!s)throw new InputError("Choose a station from this event.");return s;};
  switch(operation){
   case "createEvent":{
    const name=text(data,"name",120,true);const zone=timezone(text(data,"timezone",80,true));
    const slug=(name.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,50)||"operation")+"-"+randomBytes(5).toString("hex");
    const event=await tx.event.create({data:{name,slug,timezone:zone,isDemo:data.get("isDemo")==="on",memberships:{create:{userId:actorId,role:"ORGANIZER"}}}});
    auditEvent=event.id;details={name,timezone:zone,isDemo:event.isDemo};result={message:"Operation created. Add your teams and agents next.",targetId:event.id,redirect:`/events/${event.id}/setup`};break;
   }
   case "updateEvent":{
    const name=text(data,"name",120,true);const zone=timezone(text(data,"timezone",80,true));const startsOn=dateOnly(text(data,"startsOn",10));const endsOn=dateOnly(text(data,"endsOn",10));
    if(startsOn&&endsOn&&endsOn<startsOn)throw new InputError("End date cannot be before the start date.");
    if(logo&&data.get("removeLogo")==="on")throw new InputError("Choose either a replacement logo or remove the current logo.");
    const before=await tx.event.findUniqueOrThrow({where:{id:eventId},select:{name:true,timezone:true,codename:true,briefing:true,accentColor:true,startsOn:true,endsOn:true}});
    const values={name,timezone:zone,startsOn,endsOn,codename:text(data,"codename",80)||null,briefing:text(data,"briefing",1200),accentColor:color(text(data,"accentColor",7,true))};
    await tx.event.update({where:{id:eventId},data:{...values,...(logo?{logoData:logo,logoMime:mime}:{}),...(data.get("removeLogo")==="on"?{logoData:null,logoMime:null}:{})}});
    details={before:JSON.parse(JSON.stringify(before)),after:JSON.parse(JSON.stringify(values)),logoChanged:!!logo||data.get("removeLogo")==="on"};result={message:"Event details saved.",targetId:eventId};break;
   }
   case "deleteDraftEvent":{
    const event=await tx.event.findUniqueOrThrow({where:{id:eventId}});
     if(await tx.votingBallot.count({where:{eventId}})||await tx.auditEntry.count({where:{eventId,action:"VOTING_PUBLISH"}}))throw new InputError("This event has voting history. Archive it instead of deleting it.",409);
    if(await tx.auditEntry.count({where:{eventId,action:'OVERALL_FINALIZE'}}))throw new InputError("This event has finalized overall result history. Archive it instead of deleting it.",409);
    if(await tx.contactPolicy.count({where:{eventId}}))throw new InputError("This event has a configured contact policy. Its records need an explicit retention workflow.",409);
    if(await tx.announcement.count({where:{eventId}}))throw new InputError("This event has announcement history. It cannot be deleted as an empty draft.",409);
    if(await tx.stationOutcome.count({where:{eventId}}))throw new InputError("This event has confirmed outcomes. Its history cannot be deleted as a draft.",409);
    if(text(data,"confirmation",120,true)!==event.name)throw new InputError("Type the exact event name to confirm deletion.");
    details={name:event.name,slug:event.slug,state:event.state,teams:await tx.team.count({where:{eventId}}),memberships:await tx.eventMembership.count({where:{eventId}}),stations:await tx.station.count({where:{eventId}})};
    await tx.teamRouteAssignment.deleteMany({where:{team:{eventId}}});await tx.event.delete({where:{id:eventId}});auditEvent=undefined;
    result={message:"Draft event deleted. Accounts and audit history are preserved.",targetId:eventId,redirect:"/workspace"};break;
   }
   case "addTeam":{
    const name=text(data,"name",80,true);const c=color(text(data,"color",7,true));const team=await tx.team.create({data:{eventId,name,color:c}});details={name,color:c};result={message:"Team added. You can assign agents to it now.",targetId:team.id};break;
   }
   case "updateTeam":{
    const team=await checkedTeam(text(data,"teamId",120,true));const values={name:text(data,"name",80,true),color:color(text(data,"color",7,true))};await tx.team.update({where:{id:team!.id},data:values});details={before:{name:team!.name,color:team!.color},after:values};result={message:"Team details saved.",targetId:team!.id};break;
   }
   case "removeTeam":{
    const team=await checkedTeam(text(data,"teamId",120,true));if(await tx.eventMembership.count({where:{teamId:team!.id}}))throw new InputError("Move or remove this team’s agents before deleting the team.",409);await tx.team.delete({where:{id:team!.id}});details={name:team!.name};result={message:"Empty team removed.",targetId:team!.id};break;
   }
   case "addMember":{
    const email=emailAddress(text(data,"email",254,true));const name=text(data,"name",100,true);const role=roleValue(text(data,"role",20,true));const teamId=role==="PARTICIPANT"?text(data,"teamId"):"";await checkedTeam(teamId);
    let user=await tx.user.findUnique({where:{email}});let temporaryPassword:string|undefined;
    if(user&&!user.active)throw new InputError("This account is disabled. Contact the platform operator.",409);
    if(!user){temporaryPassword=randomBytes(18).toString("base64url");user=await tx.user.create({data:{email,name,passwordHash:await hashPassword(temporaryPassword),mustChangePassword:true}});}
    const previous=await tx.eventMembership.findUnique({where:{eventId_userId:{eventId,userId:user.id}}});if(previous?.active)throw new InputError("This person is already in the event. Edit their existing assignment instead.",409);
    const member=await tx.eventMembership.upsert({where:{eventId_userId:{eventId,userId:user.id}},create:{eventId,userId:user.id,role,teamId:teamId||null},update:{role,active:true,teamId:teamId||null,isCaptain:false}});
    await tx.facilitatorAssignment.deleteMany({where:{membershipId:member.id}});targetUserId=user.id;details={email,role,teamId:teamId||null,newAccount:!!temporaryPassword};result={message:temporaryPassword?"Agent account created. Share these credentials privately.":"Existing account linked. Their password and profile were not changed.",targetId:member.id,email,...(temporaryPassword?{temporaryPassword}:{})};break;
   }
   case "updateMember":{
    const member=await checkedMember(text(data,"membershipId",120,true));const role=roleValue(text(data,"role",20,true));const teamId=role==="PARTICIPANT"?text(data,"teamId"):"";await checkedTeam(teamId);
    if(member.userId===actorId&&role!=="ORGANIZER")throw new InputError("You cannot remove your own organizer access.",409);
    if(member.active&&member.role==="ORGANIZER"&&role!=="ORGANIZER"&&await tx.eventMembership.count({where:{eventId,active:true,role:"ORGANIZER",user:{active:true}}})<=1)throw new InputError("Keep at least one active organizer.",409);
    const isCaptain=role==="PARTICIPANT"&&!!teamId&&data.get("isCaptain")==="on";
    if(data.get("isCaptain")==="on"&&!isCaptain)throw new InputError("A captain must be an active participant assigned to a team.");
    if(!member.active||!member.user.active)throw new InputError("Restore this person’s access before changing their assignment.",409);
    if(isCaptain)await tx.eventMembership.updateMany({where:{eventId,teamId,isCaptain:true,id:{not:member.id}},data:{isCaptain:false}});
    await tx.eventMembership.update({where:{id:member.id},data:{role,teamId:teamId||null,isCaptain}});if(role!=="FACILITATOR")await tx.facilitatorAssignment.deleteMany({where:{membershipId:member.id}});
    targetUserId=member.userId;details={before:{role:member.role,teamId:member.teamId,isCaptain:member.isCaptain},after:{role,teamId:teamId||null,isCaptain}};result={message:"Event assignment saved.",targetId:member.id};break;
   }
   case "removeMember":{
    const member=await checkedMember(text(data,"membershipId",120,true));if(member.userId===actorId)throw new InputError("You cannot remove your own event access.",409);
    if(member.active&&member.role==="ORGANIZER"&&await tx.eventMembership.count({where:{eventId,active:true,role:"ORGANIZER",user:{active:true}}})<=1)throw new InputError("Keep at least one active organizer.",409);
    await tx.facilitatorAssignment.deleteMany({where:{membershipId:member.id}});await tx.eventMembership.update({where:{id:member.id},data:{active:false,teamId:null,isCaptain:false}});targetUserId=member.userId;details={role:member.role,teamId:member.teamId};result={message:"Event access removed. Their account and other events are preserved.",targetId:member.id};break;
   }
   case "addStation":{
    const values={eventId,name:text(data,"name",100,true),location:text(data,"location",160),briefing:""};const station=await tx.station.create({data:values});details={name:station.name,location:station.location};result={message:"Station location added. Assign its facilitators below.",targetId:station.id};break;
   }
   case "updateStation":{
    const station=await checkedStation(text(data,"stationId",120,true));const values={name:text(data,"name",100,true),location:text(data,"location",160)};await tx.station.update({where:{id:station.id},data:values});details={before:{name:station.name,location:station.location},after:values};result={message:"Station location saved.",targetId:station.id};break;
   }
   case "assignFacilitator":{
    const member=await checkedMember(text(data,"membershipId",120,true));if(!member.active||!member.user.active||member.role!=="FACILITATOR")throw new InputError("Choose an active facilitator from this event.");
    const stations=[...new Set(data.getAll("stationId").map(String))];for(const id of stations)await checkedStation(id);
    const before=await tx.facilitatorAssignment.findMany({where:{membershipId:member.id},select:{stationId:true}});
    await tx.facilitatorAssignment.deleteMany({where:{membershipId:member.id}});for(const stationId of stations)await tx.facilitatorAssignment.create({data:{membershipId:member.id,stationId}});
    targetUserId=member.userId;details={before:before.map(s=>s.stationId),after:stations};result={message:"Facilitator station access saved.",targetId:member.id};break;
   }
   case "issueMissingStationCodes":{
    const stations=await tx.station.findMany({where:{eventId},select:{id:true,arrivalCode:true},orderBy:{id:"asc"}});
    if(!stations.length)throw new InputError("Add at least one station first.");
    const reserved=new Set(stations.flatMap(s=>s.arrivalCode?[s.arrivalCode]:[]));const issued:string[]=[];
    for(const station of stations){if(station.arrivalCode)continue;let code:string;do{code=Array.from(randomBytes(8),b=>arrivalAlphabet[b&31]).join("");}while(reserved.has(code));reserved.add(code);await tx.station.update({where:{id:station.id},data:{arrivalCode:code}});issued.push(station.id);}
    details={stationIds:issued,generated:issued.length,preserved:stations.length-issued.length};
    result={message:issued.length?`Generated arrival QR/codes for ${issued.length} stations. Existing codes and printed signs are unchanged. Open Print all station signs to print them together.`:"All stations already have arrival QR/codes. Existing codes are unchanged.",targetId:eventId};break;
   }
   case "issueStationCode":{
    const station=await checkedStation(text(data,"stationId",120,true));let code:string;
    do{code=Array.from(randomBytes(8),b=>arrivalAlphabet[b&31]).join("");}while(await tx.station.findFirst({where:{eventId,arrivalCode:code}}));
    await tx.station.update({where:{id:station.id},data:{arrivalCode:code}});details={stationId:station.id,rotated:!!station.arrivalCode};result={message:"Arrival QR/code issued. Print the current station sign; earlier signs no longer work.",targetId:station.id};break;
   }
   case "configureStation":case "saveRoute":case "assignRoute":case "assignAllFreeRoutes":case "removeRoute":case "unassignRoute":{
    const change=await routeCommand(tx,eventId,operation,data);const {details:changes,...response}=change;details=JSON.parse(JSON.stringify(changes));result=response;break;
   }
   default:throw new InputError("Unknown management action.");
  }
  await tx.auditEntry.create({data:{actorId,eventId:auditEvent,targetUserId,action:operation.toUpperCase(),targetId:result.targetId,detailsJson:details}});
  const {temporaryPassword:_secret,email:_email,...safe}=result;
  await tx.managementReceipt.create({data:{actorId,requestKey,requestHash,operation,responseJson:safe as Prisma.InputJsonValue}});
  return result;
 },{maxWait:10000,timeout:15000});
}

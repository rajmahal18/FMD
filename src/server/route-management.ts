import "server-only";
import {tokenHash} from "@/lib/password";
import { Prisma } from "@/generated/prisma/client";
import {InputError,text} from "@/lib/validation";
import {routeOrder,type RouteMode} from "@/lib/routes";
export function bulkRouteToken(route:{id:string;revision:number},teams:{id:string;routeAssignment:{id:string;assignedAt:Date}|null}[]){
 return tokenHash(JSON.stringify({routeId:route.id,revision:route.revision,teams:[...teams].sort((a,b)=>a.id.localeCompare(b.id)).map(t=>({id:t.id,assignmentId:t.routeAssignment?.id??null,assignedAt:t.routeAssignment?.assignedAt.toISOString()??null}))}));
}
function integer(data:FormData,key:string,min:number,max:number,optional=false){const value=text(data,key,10);if(optional&&!value)return null;if(!/^\d+$/.test(value)||Number(value)<min||Number(value)>max)throw new InputError(`${key.replace(/([A-Z])/g," $1")} must be a whole number from ${min} to ${max}.`);return Number(value);}
export async function routeCommand(tx:Prisma.TransactionClient,eventId:string,operation:string,data:FormData){
 const stationId=text(data,"stationId",120);const routeId=text(data,"routeId",120);
 if(operation==="configureStation"){
  const before=await tx.station.findFirst({where:{id:stationId,eventId}});if(!before)throw new InputError("Choose a station from this event.");
  const scoringMode=text(data,"scoringMode",10,true);if(scoringMode!=="FIXED"&&scoringMode!=="MANUAL")throw new InputError("Choose fixed or manual points.");
  const fixedPoints=integer(data,"fixedPoints",0,100000)!;const minimumPoints=integer(data,"minimumPoints",0,100000)!;const maximumPoints=integer(data,"maximumPoints",0,100000)!;
  if(minimumPoints>maximumPoints)throw new InputError("Minimum points cannot exceed maximum points.");
  const capacity=integer(data,"capacity",1,1000,true);const queueEnabled=data.get("queueEnabled")==="on";if(queueEnabled&&capacity===null)throw new InputError("Set a capacity before enabling the queue.");
  const values={allowAdjustments:data.get("allowAdjustments")==="on",maximumAdjustment:integer(data,"maximumAdjustment",0,100000,true)??before.maximumAdjustment,name:text(data,"name",100,true),location:text(data,"location",160,true),codename:text(data,"codename",80)||null,briefing:text(data,"briefing",2400,true),facilitatorInstructions:text(data,"facilitatorInstructions",4000,true),scoringMode,fixedPoints,minimumPoints,maximumPoints,timeLimitMinutes:integer(data,"timeLimitMinutes",1,1440,true),capacity,queueEnabled,available:data.get("available")==="on",configured:true} as const;
  await tx.station.update({where:{id:stationId},data:values});return {message:"Station briefing and rules saved.",targetId:stationId,details:{before,after:values}};
 }
 if(operation==="saveRoute"){
  const name=text(data,"name",100,true);const mode=text(data,"mode",12,true) as RouteMode;const ids=data.getAll("routeStationId").map(String);
  try{routeOrder(mode,ids,mode==="CIRCULAR"?ids[0]:null);}catch(e){throw new InputError((e as Error).message);}
  const stations=await tx.station.findMany({where:{eventId,id:{in:ids}}});if(stations.length!==ids.length)throw new InputError("Every stop must belong to this event.");if(stations.some(s=>!s.configured))throw new InputError("Configure each station’s briefing and rules first.");
  const previous=routeId?await tx.routePlan.findFirst({where:{id:routeId,eventId}}):null;if(routeId&&!previous)throw new InputError("Choose a route from this event.");
  const route=previous?await tx.routePlan.update({where:{id:routeId},data:{name,mode,stationIds:ids,revision:{increment:1}}}):await tx.routePlan.create({data:{eventId,name,mode,stationIds:ids}});
  return {message:"Route saved. Existing team assignments keep their previous snapshot until reassigned.",targetId:route.id,details:{name,mode,stationIds:ids,revision:route.revision}};
 }
 if(operation==="assignAllFreeRoutes"){
  const route=await tx.routePlan.findFirst({where:{id:routeId,eventId}});if(!route||route.mode!=="FREE")throw new InputError("Choose a free-roam route from this event.");
  const ids=route.stationIds as string[];try{routeOrder("FREE",ids);}catch(e){throw new InputError((e as Error).message);}
  const teams=await tx.team.findMany({where:{eventId},include:{routeAssignment:true}});if(!teams.length)throw new InputError("Add teams before assigning first stations.");
  if(text(data,"setupToken",64,true)!==bulkRouteToken(route,teams))throw new InputError("Teams or routes changed after the preview. Refresh and randomize again.",409);
  const stations=await tx.station.findMany({where:{eventId,id:{in:ids},configured:true,available:true}});if(stations.length!==ids.length)throw new InputError("All route stations must be configured and available.",409);
  if(await tx.stationVisit.count({where:{eventId}}))throw new InputError("This event already has station visits. Reset the run before assigning all teams.",409);
  let proposed:unknown;try{proposed=JSON.parse(text(data,"startingAssignments",100000,true));}catch{throw new InputError("Randomize first stations before saving.");}
  if(!Array.isArray(proposed)||proposed.length!==teams.length)throw new InputError("The preview must include every team exactly once.");
  const seen=new Set<string>();const counts=new Map(ids.map(id=>[id,0]));const assignments:{teamId:string;startStationId:string}[]=[];
  for(const row of proposed){if(!row||typeof row!=="object"||typeof row.teamId!=="string"||typeof row.startStationId!=="string"||!teams.some(t=>t.id===row.teamId)||seen.has(row.teamId)||!counts.has(row.startStationId))throw new InputError("Every team and starting station must belong to this event and route.");seen.add(row.teamId);counts.set(row.startStationId,counts.get(row.startStationId)!+1);assignments.push({teamId:row.teamId,startStationId:row.startStationId});}
  const loads=[...counts.values()];if(Math.max(...loads)-Math.min(...loads)>1)throw new InputError("Starting stations must be evenly distributed. Randomize again.");
  const assignedAt=new Date();for(const a of assignments){const values={routeId:route.id,routeRevision:route.revision,startStationId:a.startStationId,mode:route.mode,stationIds:ids,assignedAt};await tx.teamRouteAssignment.upsert({where:{teamId:a.teamId},create:{teamId:a.teamId,...values},update:values});}
  return {message:`First stations assigned for all ${teams.length} teams. Captains choose remaining stations after their first confirmed result.`,targetId:route.id,details:{before:teams.map(t=>({teamId:t.id,assignment:t.routeAssignment})),after:assignments,routeId:route.id,routeRevision:route.revision}};
 }
 if(operation==="assignRoute"){
  const teamId=text(data,"teamId",120,true);const team=await tx.team.findFirst({where:{id:teamId,eventId}});const route=await tx.routePlan.findFirst({where:{id:routeId,eventId}});if(!team||!route)throw new InputError("Choose a team and route from this event.");
  const startStationId=text(data,"startStationId",120)||null;let ids:string[];try{ids=routeOrder(route.mode,route.stationIds as string[],startStationId);}catch(e){throw new InputError((e as Error).message);}
  const stations=await tx.station.findMany({where:{eventId,id:{in:ids},configured:true,available:true}});if(stations.length!==ids.length)throw new InputError("All assigned stops must be configured and available.");
  const values={routeId:route.id,routeRevision:route.revision,startStationId,mode:route.mode,stationIds:ids,assignedAt:new Date()};await tx.teamRouteAssignment.upsert({where:{teamId},create:{teamId,...values},update:values});return {message:"Team route assigned. Preview saved below.",targetId:teamId,details:values};
 }
 if(operation==="removeRoute"){
  const route=await tx.routePlan.findFirst({where:{id:routeId,eventId},include:{assignments:true}});if(!route)throw new InputError("Choose a route from this event.");if(route.assignments.length)throw new InputError("Reassign its teams before removing this route.",409);await tx.routePlan.delete({where:{id:routeId}});return {message:"Unused route removed.",targetId:routeId,details:{name:route.name}};
 }
 if(operation==="unassignRoute"){
  const teamId=text(data,"teamId",120,true);if(!await tx.team.findFirst({where:{id:teamId,eventId}}))throw new InputError("Choose a team from this event.");await tx.teamRouteAssignment.deleteMany({where:{teamId}});return {message:"Team route removed.",targetId:teamId,details:{teamId}};
 }
 throw new InputError("Unknown route action.");
}

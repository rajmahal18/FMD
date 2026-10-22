import "server-only";
import {getRaceRule} from "./race-ranking";
import {activeAnnouncements} from "./announcements";
import {outcomePoints} from './outcome-points';
import {teamTotal} from "./score";
import {db} from "@/lib/db";
import {InputError} from "@/lib/validation";
import {missionState,type MissionData,type MissionVisit} from "@/lib/mission";
export async function readMission(userId:string,eventId:string):Promise<MissionData>{
 return db().$transaction(async tx=>{
  const member=await tx.eventMembership.findUnique({where:{eventId_userId:{eventId,userId}},include:{user:true,event:true}});
  if(!member?.active||!member.user.active)throw new InputError("Event access is no longer available.",404);
  if(member.user.mustChangePassword||member.role!=="PARTICIPANT")throw new InputError("Participant access is required.",403);
  const team=member.teamId?await tx.team.findFirst({where:{id:member.teamId,eventId},include:{routeAssignment:{include:{route:true}},members:{where:{active:true,role:"PARTICIPANT",user:{active:true}},include:{user:{select:{name:true}}}}}}):null;
  const assignment=team?.routeAssignment;const ids=assignment&&assignment.route.eventId===eventId&&Array.isArray(assignment.stationIds)&&assignment.stationIds.every(id=>typeof id==="string")?assignment.stationIds as string[]:[];
  // Whitelist public fields. Facilitator notes, credentials and score policy internals never cross this boundary.
  const stations=await tx.station.findMany({where:{eventId,id:{in:ids}},select:{id:true,name:true,codename:true,location:true,briefing:true,available:true,configured:true,timeLimitMinutes:true,capacity:true,queueEnabled:true}});
  const stationLoads=await tx.stationVisit.groupBy({by:["stationId","state"],where:{eventId,stationId:{in:ids},state:{in:["QUEUED","ARRIVED","ACTIVE","AWAITING_CONFIRMATION"]}},_count:{_all:true}});
  const publicStations=stations.map(s=>({...s,occupied:stationLoads.filter(v=>v.stationId===s.id&&v.state!=="QUEUED").reduce((n,v)=>n+v._count._all,0),queued:stationLoads.find(v=>v.stationId===s.id&&v.state==="QUEUED")?._count._all??0}));
  const records=team?await tx.stationVisit.findMany({where:{eventId,teamId:team.id,stationId:{in:ids}},include:{timePenalties:{where:{voidedAt:null},select:{seconds:true}},outcome:{include:{entries:true,corrections:{include:{entries:true}}}}},orderBy:{updatedAt:"asc"}}):[];
  const visits:MissionVisit[]=[];let integrityIssue=false;
  for(const v of records){let backed=false;let effective:number|undefined;try{if(v.outcome){effective=outcomePoints(v.outcome);backed=true;}}catch{integrityIssue=true;}if((v.state==="COMPLETED")!==!!v.outcome||v.outcome&&!backed)integrityIssue=true;let queuePosition:number|null=null;if(v.state==="QUEUED"&&v.queuedAt){queuePosition=1+await tx.stationVisit.count({where:{eventId,stationId:v.stationId,state:"QUEUED",OR:[{queuedAt:{lt:v.queuedAt}},{queuedAt:v.queuedAt,id:{lt:v.id}}]}});}visits.push({visitId:v.id,points:effective,durationSeconds:backed?v.outcome!.durationSeconds:null,timePenaltySeconds:backed?v.outcome!.timePenaltySeconds:v.timePenalties.reduce((n,p)=>n+p.seconds,0),stationId:v.stationId,state:v.state,confirmedAt:backed?v.confirmedAt?.toISOString()??null:null,startedAt:v.startedAt?.toISOString()??null,updatedAt:v.updatedAt.toISOString(),queuePosition});}
  const times=[assignment?.assignedAt,...records.map(v=>v.updatedAt)].filter((d):d is Date=>!!d);const lastChangedAt=times.length?new Date(Math.max(...times.map(d=>d.getTime()))).toISOString():null;
  const timed=visits.filter(v=>v.state==='COMPLETED'&&v.confirmedAt);const teamTimeSeconds=timed.some(v=>v.durationSeconds===null)?null:timed.reduce((n,v)=>n+(v.durationSeconds??0)+(v.timePenaltySeconds??0),0);
  const result={raceRule:await getRaceRule(tx,eventId),teamTimeSeconds,eventId,eventState:member.event.state,announcements:await activeAnnouncements(tx,eventId),teamTotal:team?await teamTotal(tx,eventId,team.id):0,agent:{id:userId,name:member.user.name,isCaptain:member.isCaptain},team:team?{name:team.name,color:team.color,captainName:team.members.find(m=>m.isCaptain)?.user.name??null,members:team.members.map(m=>({name:m.user.name,isCaptain:m.isCaptain}))}:null,route:assignment&&ids.length?{name:assignment.route.name,mode:assignment.mode,startStationId:assignment.startStationId,assignedAt:assignment.assignedAt.toISOString()}:null,stations:publicStations,stationIds:ids,visits,lastChangedAt,checkedAt:new Date().toISOString()};
  return {...result,view:missionState({eventState:result.eventState,mode:result.route?.mode??null,stationIds:ids,stations,visits,hasTeam:!!team,startStationId:assignment?.startStationId,integrityIssue})};
 },{isolationLevel:"RepeatableRead",timeout:10000});
}

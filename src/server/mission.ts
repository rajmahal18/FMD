import {occupiedVisits,settleStationTimers} from './station-timing';
import {promoteQueue} from './race';
import {passwordSetupRequired} from './password-setup';
import {arrivalPolicy} from "@/lib/arrival-policy";
import {finalStationStatus} from "./final-station";
import {displayStations} from "@/lib/station-name";
import {teamParticipation} from "./participation";
import {avatarUrl} from "@/lib/avatar";
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
  if((await passwordSetupRequired(tx,userId,eventId,member.user.mustChangePassword))||member.role!=="PARTICIPANT")throw new InputError("Participant access is required.",403);
  const team=member.teamId?await tx.team.findFirst({where:{id:member.teamId,eventId},include:{squadHandler:{include:{membership:{include:{user:{select:{name:true,avatarKey:true,active:true}}}}}},routeAssignment:{include:{route:true}},members:{where:{active:true,role:"PARTICIPANT",user:{active:true}},include:{user:{select:{name:true,avatarKey:true}}}}}}):null;
  if(team){await settleStationTimers(tx,eventId,{teamId:team.id});if(member.event.state==='LIVE'&&!member.event.archivedAt){const queues=await tx.stationVisit.findMany({where:{eventId,teamId:team.id,state:'QUEUED',station:{queueEnabled:true}},include:{station:true}});for(const q of queues)await promoteQueue(tx,q.station,userId);}}
  const assignment=team?.routeAssignment;const ids=assignment&&assignment.route.eventId===eventId&&Array.isArray(assignment.stationIds)&&assignment.stationIds.every(id=>typeof id==="string")?assignment.stationIds as string[]:[];
  // Whitelist public fields. Facilitator notes, credentials and score policy internals never cross this boundary.
  let stations=await tx.station.findMany({where:{eventId,id:{in:ids}},select:{id:true,name:true,codename:true,photoKey:true,location:true,briefing:true,available:true,configured:true,timeLimitMinutes:true,capacity:true,queueEnabled:true,brawn:true,brain:true,playersRequired:true}}).then(displayStations);
  if(member.event.finalStationId&&!member.event.finalStartedAt)stations=stations.map(s=>s.id===member.event.finalStationId?{...s,available:false}:s);
  const stationLoads=await tx.stationVisit.findMany({where:{eventId,stationId:{in:ids},OR:[{state:'QUEUED'},occupiedVisits()]},select:{id:true,stationId:true,state:true,startedAt:true,queuedAt:true,team:{select:{name:true}}}});
  const arrivals=await tx.auditEntry.findMany({where:{eventId,targetId:{in:stationLoads.filter(v=>v.state!=="QUEUED").map(v=>v.id)},action:{in:["RACE_CHECKIN","RACE_ADMITTEAM","RACE_QUEUE_ADMITTED"]}},select:{targetId:true,action:true,detailsJson:true,createdAt:true},orderBy:{createdAt:"desc"}});
  const publicStations=stations.map(s=>{const loads=stationLoads.filter(v=>v.stationId===s.id);return {...s,occupied:loads.filter(v=>v.state!=="QUEUED").length,queued:loads.filter(v=>v.state==="QUEUED").length,occupants:loads.filter(v=>v.state!=="QUEUED").map(v=>{const arrival=arrivals.find(a=>a.targetId===v.id&&(a.action!=="RACE_CHECKIN"||(a.detailsJson as {state?:string})?.state==="ARRIVED"));return {state:v.state,teamName:v.team.name,since:v.state==='AWAITING_CONFIRMATION'?null:arrival?.createdAt.toISOString()??v.startedAt?.toISOString()??null};})};});
  const records=team?await tx.stationVisit.findMany({where:{eventId,teamId:team.id,stationId:{in:ids}},include:{players:{select:{membershipId:true}},timePenalties:{where:{voidedAt:null},select:{seconds:true}},outcome:{include:{entries:true,corrections:{include:{entries:true}}}}},orderBy:{updatedAt:"asc"}}):[];
  const raceRule=await getRaceRule(tx,eventId);
  const visits:MissionVisit[]=[];let integrityIssue=false;
  for(const v of records){let backed=false;let effective:number|undefined;try{if(v.outcome){effective=outcomePoints(v.outcome);backed=true;}}catch{integrityIssue=true;}if((v.state==="COMPLETED")!==!!v.outcome||v.outcome&&!backed)integrityIssue=true;let queuePosition:number|null=null;if(v.state==="QUEUED"&&v.queuedAt){queuePosition=1+await tx.stationVisit.count({where:{eventId,stationId:v.stationId,state:"QUEUED",OR:[{queuedAt:{lt:v.queuedAt}},{queuedAt:v.queuedAt,id:{lt:v.id}}]}});}visits.push({visitId:v.id,playerIds:v.players.map(p=>p.membershipId),points:raceRule==='STATION_PLACEMENTS'?undefined:effective,stationId:v.stationId,state:v.state,releaseAt:v.releaseAt?.toISOString()??null,timerDeadlineAt:['ARRIVED','ACTIVE'].includes(v.state)&&!v.finishedAt?v.timerDeadlineAt?.toISOString()??null:null,confirmedAt:backed?v.confirmedAt?.toISOString()??null:null,startedAt:['ARRIVED','ACTIVE'].includes(v.state)&&!v.finishedAt?v.startedAt?.toISOString()??null:null,updatedAt:v.updatedAt.toISOString(),queuePosition});}
  const times=[assignment?.assignedAt,...records.map(v=>v.updatedAt)].filter((d):d is Date=>!!d);const lastChangedAt=times.length?new Date(Math.max(...times.map(d=>d.getTime()))).toISOString():null;
  const finalStation=await finalStationStatus(tx,eventId,team?.id);
  const result={arrivalPolicy:arrivalPolicy(member.event.arrivalPolicy),finalStation,plannedLineups:team?Object.fromEntries((await tx.stationLineup.findMany({where:{eventId,teamId:team.id}})).map(p=>[p.stationId,p.playerIds as string[]])):{},raceRule,eventId,eventState:member.event.state,announcements:await activeAnnouncements(tx,eventId),teamTotal:team?await teamTotal(tx,eventId,team.id):0,agent:{id:userId,membershipId:member.id,name:member.user.name,avatarUrl:avatarUrl(member.user.avatarKey),squadRole:member.squadRole,isCaptain:member.isCaptain},team:team?{handler:team.squadHandler?.membership.active&&team.squadHandler.membership.role==='FACILITATOR'&&team.squadHandler.membership.user.active?{name:team.squadHandler.membership.user.name,avatarUrl:avatarUrl(team.squadHandler.membership.user.avatarKey)}:null,name:team.name,color:team.color,captainName:team.members.find(m=>m.isCaptain)?.user.name??null,members:(await teamParticipation(tx,eventId,team.id)).map(p=>member.event.hideStationDetails?{...p,history:[]}:p)}:null,route:assignment&&ids.length?{name:assignment.route.name,mode:assignment.mode,startStationId:assignment.startStationId,assignedAt:assignment.assignedAt.toISOString()}:null,stations:publicStations.map(s=>({...s,briefing:visits.some(v=>v.stationId===s.id&&["ACTIVE","AWAITING_CONFIRMATION","COMPLETED"].includes(v.state))?s.briefing:''})),stationIds:ids,visits,lastChangedAt,checkedAt:new Date().toISOString()};
  const visibility={eventDetailsHidden:member.event.hideEventDetails,stationDetailsHidden:member.event.hideStationDetails,eventBriefing:member.event.hideEventDetails?"":member.event.briefing};
  if(member.event.hideStationDetails)return {...result,...visibility,finalStation:null,plannedLineups:{},route:null,stations:[],stationIds:[],visits:[],lastChangedAt:null,view:{...missionState({eventState:result.eventState,mode:null,stationIds:[],stations:[],visits:[],hasTeam:!!team}),status:"DETAILS_HIDDEN"}};
  return {...result,...visibility,view:missionState({eventState:result.eventState,mode:result.route?.mode??null,stationIds:ids,stations,visits,hasTeam:!!team,finalStationId:member.event.finalStationId,startStationId:assignment?.startStationId,integrityIssue})};
 },{isolationLevel:"RepeatableRead",timeout:10000});
}

import {routeProgress,type RouteMode} from "./routes";
export type EventStage="PREPARING"|"READY"|"LIVE"|"PAUSED"|"ENDED"|"FINALIZED";
export type VisitStage="QUEUED"|"ARRIVED"|"ACTIVE"|"AWAITING_CONFIRMATION"|"COMPLETED"|"CANCELLED";
export type MissionStation={id:string;name:string;codename:string|null;location:string;briefing:string;available:boolean;configured:boolean;timeLimitMinutes:number|null;capacity?:number|null;queueEnabled?:boolean;occupied?:number;queued?:number};
export type MissionVisit={stationId:string;state:VisitStage;confirmedAt:string|null;startedAt:string|null;updatedAt:string;queuePosition:number|null;visitId?:string;points?:number;durationSeconds?:number|null;timePenaltySeconds?:number};
export type MissionInput={eventState:EventStage;mode:RouteMode|null;stationIds:string[];stations:MissionStation[];visits:MissionVisit[];hasTeam:boolean;integrityIssue?:boolean;startStationId?:string|null};
export function missionState(input:MissionInput){
 const {stationIds:ids,mode,stations,visits,eventState}=input;
 const completeIds=new Set(visits.filter(v=>v.state==="COMPLETED"&&v.confirmedAt).map(v=>v.stationId));
 const missing=!mode||!ids.length||new Set(ids).size!==ids.length||ids.some(id=>!stations.some(s=>s.id===id&&s.configured));
 const progress=routeProgress(mode??"FIXED",ids,completeIds,new Set(stations.filter(s=>!s.available).map(s=>s.id)),input.startStationId);
 const active=visits.find(v=>ids.includes(v.stationId)&&["QUEUED","ARRIVED","ACTIVE","AWAITING_CONFIRMATION"].includes(v.state));
 const currentId=active?.stationId??progress.unlocked[0]??progress.paused[0]??null;
 let status:string;
 if(!input.hasTeam)status="NO_TEAM";
 else if(missing)status="NO_ROUTE";
 else if(input.integrityIssue)status="REVIEW_REQUIRED";
 else if(eventState==="PREPARING"||eventState==="READY")status="NOT_STARTED";
 else if(progress.complete)status="COMPLETE";
 else if(eventState==="ENDED"||eventState==="FINALIZED")status="ENDED";
 else if(eventState==="PAUSED")status="EVENT_PAUSED";
 else if(active)status=active.state;
 else if(progress.unlocked.length)status="HEAD_TO_STATION";
 else status="STATION_PAUSED";
 return {status,currentId,progress,active:active??null};
}
export type MissionData={raceRule?:import('./race-ranking').RaceRule;teamTimeSeconds?:number|null;announcements?:import("./control").AnnouncementData[];eventId:string;eventState:EventStage;agent:{id:string;name:string;squadRole?:string|null;isCaptain:boolean};team:{name:string;color:string;captainName:string|null;members:{name:string;squadRole?:string|null;isCaptain:boolean}[]}|null;route:{name:string;mode:RouteMode;assignedAt:string;startStationId?:string|null}|null;stations:MissionStation[];visits:MissionVisit[];stationIds:string[];lastChangedAt:string|null;checkedAt:string;teamTotal:number;view:ReturnType<typeof missionState>};

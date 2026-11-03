import {routeProgress,type RouteMode} from "./routes";
export type EventStage="PREPARING"|"READY"|"LIVE"|"PAUSED"|"ENDED"|"FINALIZED";
export type VisitStage="QUEUED"|"ARRIVED"|"ACTIVE"|"AWAITING_CONFIRMATION"|"COMPLETED"|"CANCELLED";
export type MissionStation={brawn?:number|null;brain?:number|null;playersRequired?:number|null;id:string;name:string;codename:string|null;location:string;briefing:string;available:boolean;configured:boolean;timeLimitMinutes:number|null;capacity?:number|null;queueEnabled?:boolean;occupied?:number;occupants?:{state?:string;teamName:string;since:string|null}[];queued?:number};
export type MissionVisit={arrivalApprovedAt?:string|null;lineupSubmittedAt?:string|null;stationId:string;state:VisitStage;confirmedAt:string|null;startedAt:string|null;finishedAt?:string|null;updatedAt:string;queuePosition:number|null;visitId?:string;playerIds?:string[];points?:number;durationSeconds?:number|null;timePenaltySeconds?:number};
export type MissionInput={eventState:EventStage;mode:RouteMode|null;stationIds:string[];stations:MissionStation[];visits:MissionVisit[];hasTeam:boolean;integrityIssue?:boolean;finalStationId?:string|null;startStationId?:string|null};
export function missionState(input:MissionInput){
 const {mode,stations,visits,eventState}=input;const ids=input.finalStationId?[...input.stationIds.filter(id=>id!==input.finalStationId),...input.stationIds.filter(id=>id===input.finalStationId)]:input.stationIds;
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
export type MissionData={arrivalPolicy?:import("./arrival-policy").ArrivalPolicy;finalStation?:import("./arrival-policy").FinalStationStatus|null;plannedLineups?:Record<string,string[]>;eventDetailsHidden?:boolean;stationDetailsHidden?:boolean;eventBriefing?:string;raceRule?:import('./race-ranking').RaceRule;teamTimeSeconds?:number|null;announcements?:import("./control").AnnouncementData[];eventId:string;eventState:EventStage;agent:{id:string;membershipId?:string;name:string;avatarUrl?:string|null;squadRole?:string|null;isCaptain:boolean};team:{handler?:{name:string;avatarUrl:string|null}|null;name:string;color:string;captainName:string|null;members:{id?:string;name:string;avatarUrl?:string|null;squadRole?:string|null;isCaptain:boolean;played?:number;explored?:number;history?:import("./participation").ParticipationHistory[]}[]}|null;route:{name:string;mode:RouteMode;assignedAt:string;startStationId?:string|null}|null;stations:MissionStation[];visits:MissionVisit[];stationIds:string[];lastChangedAt:string|null;checkedAt:string;teamTotal:number;view:ReturnType<typeof missionState>};

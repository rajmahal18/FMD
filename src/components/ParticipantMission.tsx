"use client";
import {timeoutSignal} from "@/lib/timeout-signal";
import {formatSeconds} from "@/lib/time-penalties";
import {Announcements} from "./Announcements";
import {PendingRaceRequests,RaceAction} from "./RaceAction";
import {useCallback,useEffect,useRef,useState} from "react";
import type {MissionData} from "@/lib/mission";
const copy:Record<string,{title:string;instruction:string}>={
 REVIEW_REQUIRED:{title:"Progress needs organizer review",instruction:"A station confirmation needs review. Stay with your team and ask the organizer for help."},
 NO_TEAM:{title:"Waiting for your team",instruction:"Ask the organizer to assign you to a team."},
 NO_ROUTE:{title:"Your route is being prepared",instruction:"Stay with your team. The organizer needs to finish your station assignment."},
 NOT_STARTED:{title:"Awaiting the start",instruction:"Meet your team and wait for the organizer’s start signal. This is your first destination preview."},
 COMPLETE:{title:"Operation complete",instruction:"Every required station has been confirmed. Return to the event meeting point and wait for the organizer’s announcement."},
 ENDED:{title:"The operation has ended",instruction:"New station visits are closed. Your confirmed progress is shown below."},
 EVENT_PAUSED:{title:"Operation paused",instruction:"Stay with your team. Wait for the organizer to resume the operation."},
 STATION_PAUSED:{title:"Station unavailable",instruction:"This stop is still required. Ask the organizer where to wait."},
 HEAD_TO_STATION:{title:"Head to this station",instruction:"Go to the location below and meet the assigned facilitator."},
 QUEUED:{title:"Waiting for your turn",instruction:"Stay near the station. The facilitator will call your team when a place is available."},
 ARRIVED:{title:"Arrival confirmed",instruction:"Meet the facilitator and wait for them to start your physical challenge."},
 ACTIVE:{title:"Challenge in progress",instruction:"Follow the facilitator’s instructions. Your next stop unlocks after their result confirmation."},
 AWAITING_CONFIRMATION:{title:"Awaiting confirmation",instruction:"Your team is waiting for the facilitator’s confirmed result. Stay at the station until it is recorded."}
};
function time(value:string){return new Date(value).toLocaleTimeString(undefined,{hour:"2-digit",minute:"2-digit",second:"2-digit"});}
export function ParticipantMission({initial}:{initial:MissionData}){
 const [data,setData]=useState<MissionData|null>(initial);const [error,setError]=useState("");const [busy,setBusy]=useState(false);const [selected,setSelected]=useState("");const inFlight=useRef(false);const alive=useRef(true);
 const refresh=useCallback(async()=>{if(inFlight.current)return;if(!navigator.onLine){setError("Connection lost. Showing your last confirmed update.");return;}inFlight.current=true;setBusy(true);
 try{const response=await fetch(`/api/events/${initial.eventId}/mission`,{cache:"no-store",signal:timeoutSignal(8000)});if(!alive.current)return;if([401,403,404].includes(response.status)){setData(null);setError(response.status===401?"Your session has ended. Sign in again.":"Your event access has changed. Ask the organizer for help.");return;}if(!response.ok)throw new Error("Refresh failed");const next=await response.json() as MissionData;if(alive.current){setData(next);setError("");}}
 catch{if(alive.current)setError("Unable to refresh. Showing your last confirmed update. Retry when your connection returns.");}finally{inFlight.current=false;if(alive.current)setBusy(false);}
 },[initial.eventId]);
 useEffect(()=>{alive.current=true;const interval=setInterval(()=>{if(document.visibilityState==="visible")void refresh();},10000);const online=()=>void refresh();const offline=()=>setError("Connection lost. Showing your last confirmed update.");const visible=()=>{if(document.visibilityState==="visible")void refresh();};window.addEventListener("online",online);window.addEventListener("offline",offline);document.addEventListener("visibilitychange",visible);if(!navigator.onLine)offline();return()=>{alive.current=false;clearInterval(interval);window.removeEventListener("online",online);window.removeEventListener("offline",offline);document.removeEventListener("visibilitychange",visible);};},[refresh]);
 if(!data)return <section className="panel"><h2>Mission access unavailable</h2><p role="alert">{error}</p><a className="button" href="/login">Sign in again</a></section>;
 const {view,stations,stationIds}=data;const state=copy[view.status];const freeChoice=data.route?.mode==="FREE"&&!view.active&&["HEAD_TO_STATION","NOT_STARTED"].includes(view.status);const currentId=freeChoice&&view.progress.unlocked.includes(selected)?selected:view.currentId;const current=stations.find(s=>s.id===currentId);const isFinished=view.status==="COMPLETE";const showStation=current&&!['NO_TEAM','NO_ROUTE','COMPLETE','REVIEW_REQUIRED'].includes(view.status);
 return <div className="participant-layout"><div className="mission-main">
 <Announcements items={data.announcements}/><PendingRaceRequests eventId={data.eventId} actorId={data.agent.id} onSuccess={()=>void refresh()}/>
 <div className="agent-strip"><strong>{data.team?.name??"No team assigned"}</strong><span className="tag">{data.agent.isCaptain?"Team captain":"Team member"}</span></div>
 <section id="current-mission" data-status={view.status} className={`mission participant-card ${isFinished?"mission-complete":""}`} aria-labelledby="mission-state">
 <h2 id="mission-state">{state.title}</h2>
 {showStation&&<div className="destination"><h3>{current.name}</h3><div className="destination-location"><strong>{current.location||"Ask the organizer for the location"}</strong></div></div>}
 <p className="next-action">{state.instruction}</p>
 {showStation&&<>
 {freeChoice&&view.progress.unlocked.length>1&&<label className="station-choice">Choose your next station<select value={currentId??""} onChange={e=>setSelected(e.target.value)}>{view.progress.unlocked.map(id=><option value={id} key={id}>{stations.find(s=>s.id===id)?.name}</option>)}</select><span className="fine">Check in when you arrive.</span></label>}
 {view.active?.queuePosition&&<p>Queue position: <strong>{view.active.queuePosition}</strong></p>}
 {!current.available&&<p className="notice">Station unavailable. Wait for the organizer's instructions.</p>}
 {view.status==="HEAD_TO_STATION"&&data.agent.isCaptain&&<a className="button mission-arrival" href={`/events/${data.eventId}/check-in`}>Scan or enter station code</a>}
 {view.status==="HEAD_TO_STATION"&&!data.agent.isCaptain&&<p>{data.team?.captainName??"Your captain"} handles team check-in.</p>}
 {view.status==="QUEUED"&&data.agent.isCaptain&&view.active?.visitId&&<RaceAction eventId={data.eventId} actorId={data.agent.id} input={{operation:"leaveQueue",visitId:view.active.visitId}} label="Leave waiting queue" description={`Leave queue: ${data.team?.name} at ${current.name}`} confirm="Leave this station's waiting queue?" onSuccess={()=>void refresh()}/>}
 {!!view.active?.timePenaltySeconds&&<p className="notice">Recorded time penalties: +{view.active.timePenaltySeconds} seconds</p>}
 {(current.briefing||current.timeLimitMinutes)&&<details className="mission-directions"><summary>Station instructions</summary>{current.briefing&&<p>{current.briefing}</p>}{current.timeLimitMinutes&&<p>Time limit: {current.timeLimitMinutes} minutes. The facilitator starts the timer.</p>}</details>}
 </>}
 {stationIds.length>0&&<div className="mission-progress"><label htmlFor="mission-progress">{view.progress.completedCount} of {stationIds.length} stations completed</label><progress id="mission-progress" max={stationIds.length} value={view.progress.completedCount}/></div>}
 </section>
 <div className="sync-status" aria-label="Mission updates"><div><p suppressHydrationWarning>Updated {time(data.checkedAt)}</p>{error&&<p role="alert" className="connection-error">{error}</p>}</div><button className="secondary" disabled={busy} onClick={()=>void refresh()}>{busy?"Refreshing...":"Refresh mission"}</button></div>
 </div>
 <div className="mission-support"><details id="route-history" className="panel" open={isFinished}><summary>Route &amp; completed stations</summary><p>{data.route?`${data.route.name} | ${data.route.mode==="FREE"?"Choose your order":"Follow the assigned order"}`:"No route assigned yet"}</p><p>{data.raceRule==='TIME'?`Confirmed station time: ${data.teamTimeSeconds===null?'Timing unavailable':formatSeconds(data.teamTimeSeconds??0)}`:`Confirmed total: ${data.teamTotal} points`}</p>
 <ol className="participant-route">{stationIds.map(id=>{const station=stations.find(s=>s.id===id);const visit=data.visits.find(v=>v.stationId===id);const done=visit?.state==="COMPLETED"&&visit.confirmedAt;return <li key={id}><div><strong>{station?.name??"Station needs organizer attention"}</strong>{done&&<p suppressHydrationWarning>Confirmed at {time(visit.confirmedAt!)}</p>}{done&&data.raceRule==='TIME'&&<p>{visit.durationSeconds===null?'Timing unavailable':formatSeconds((visit.durationSeconds??0)+(visit.timePenaltySeconds??0))} total | +{visit.timePenaltySeconds??0}s penalties</p>}{done&&data.raceRule!=='TIME'&&visit.points!==undefined&&<p>{visit.points} points</p>}</div><span className="tag">{done?"Completed":view.active?.stationId===id?copy[view.active.state]?.title:!station?.available?"Unavailable":view.progress.locked.includes(id)?"Locked":"Not visited"}</span></li>;})}</ol></details>
 <details id="team-file" className="panel"><summary>Team members</summary><p>Captain: {data.team?.captainName??"Not assigned yet"}</p>{data.team?<ul className="team-members">{data.team.members.map((m,i)=><li key={i}>{m.name}{m.isCaptain&&<span className="tag">Captain</span>}</li>)}</ul>:<p>Ask the organizer to assign your team.</p>}</details></div></div>;
}

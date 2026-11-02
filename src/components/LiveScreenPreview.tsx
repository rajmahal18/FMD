'use client';
import Link from 'next/link';
import {useState} from 'react';
import {PlayerShell} from './PlayerShell';
import {ParticipantMission} from './ParticipantMission';
import {FacilitatorBoard} from './FacilitatorBoard';
import {ScreenPreviewProvider} from './ScreenPreviewContext';
import {facilitatorPreviewStates,participantPreviewStates,previewField,previewMission,samplePreviewStation,type ScreenPreviewData} from '@/lib/screen-preview';

export function LiveScreenPreview({initial}:{initial:ScreenPreviewData}){
 const [view,setView]=useState(initial.view),[stationId,setStationId]=useState(initial.stations[0].id),[state,setState]=useState(initial.view==='participant'?'HEAD_TO_STATION':'ACTIVE');
 const stations=initial.stations.some(s=>s.id==='sample')?initial.stations:[...initial.stations,samplePreviewStation];
 const station=stations.find(s=>s.id===stationId)??samplePreviewStation;
 const states=view==='participant'?participantPreviewStates:facilitatorPreviewStates;
 const effective=states.some(s=>s.id===state)?state:states[0].id;
 return <div className="screen-preview-page"><header className="screen-preview-controls"><div className="screen-preview-heading"><div><div className="eyebrow">PREVIEW ONLY · SAMPLE TEAMS & PROGRESS</div><h1>Live screen preview</h1><p>{initial.eventName} <span className="tag">Actual event: {initial.actualState.toLowerCase()}</span></p></div><Link className="button secondary" href={`/events/${initial.eventId}${initial.allowParticipant?'/setup':''}`}>Exit preview</Link></div>
  <p>Sample screens only. No event changes are recorded.</p>
  <details className="screen-preview-options"><summary>Change screen or station <span>{states.find(s=>s.id===effective)?.label}</span></summary>
  {initial.allowParticipant&&<div className="screen-preview-view" role="group" aria-label="Preview perspective"><button type="button" aria-pressed={view==='participant'} onClick={()=>{setView('participant');setState('HEAD_TO_STATION');}}>Participant screen</button><button type="button" aria-pressed={view==='facilitator'} onClick={()=>{setView('facilitator');setState('ACTIVE');}}>Facilitator screen</button></div>}
  <div className="screen-preview-fields"><label>Screen state<select value={effective} onChange={e=>setState(e.target.value)}>{states.map(s=><option value={s.id} key={s.id}>{s.label}</option>)}</select></label><label>Station setup<select value={station.id} onChange={e=>setStationId(e.target.value)}>{stations.map(s=><option value={s.id} key={s.id}>{s.name}{s.id==='sample'?' · generic example':''}</option>)}</select></label></div>
  <p className="fine">Station text uses your available setup; missing text is labelled as a sample. You do not need to start the event or complete setup. Recording actions and in-preview navigation are disabled.</p></details>
 </header><ScreenPreviewProvider><PlayerShell name={view==='participant'?'Sample captain · preview':'Sample facilitator · preview'} title={view==='participant'?'Participant preview':'Facilitator preview'} mode={view} eventId="screen-preview"><div className="screen-preview-ribbon" role="status">{view==='participant'?'Participant':'Facilitator'} preview · {states.find(s=>s.id===effective)?.label} · no changes recorded</div>{view==='participant'?<ParticipantMission key={`participant:${station.id}:${effective}`} initial={previewMission(station,effective,initial.rule,initial.checkedAt)}/>:<FacilitatorBoard key={`facilitator:${station.id}:${effective}`} controller initial={previewField(station,effective,initial.rule,initial.checkedAt)}/>}</PlayerShell></ScreenPreviewProvider></div>;
}

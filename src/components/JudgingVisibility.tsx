'use client';
import {useEffect,useState} from 'react';
import type {JudgingContestData,JudgingVisibility as Visibility} from '@/lib/judging';
import type {JudgingAction} from './JudgingEditor';
export function JudgingVisibility({contest,run,disabled}:{contest:JudgingContestData;run:JudgingAction;disabled:boolean}){
 const [facilitators,setFacilitators]=useState<Visibility>(contest.facilitatorVisibility??'PUBLISHED'),[participants,setParticipants]=useState<Visibility>(contest.participantVisibility??'PUBLISHED');
 const [dirty,setDirty]=useState(false);
 const [editRevision,setEditRevision]=useState(contest.visibilityRevision);
 useEffect(()=>{if(!dirty){setFacilitators(contest.facilitatorVisibility??'PUBLISHED');setParticipants(contest.participantVisibility??'PUBLISHED');setEditRevision(contest.visibilityRevision);}},[contest.visibilityRevision,contest.facilitatorVisibility,contest.participantVisibility,dirty]);
 async function save(){if(await run({operation:'setVisibility',contestId:contest.id,visibilityRevision:editRevision,facilitatorVisibility:facilitators,participantVisibility:participants}))setDirty(false);}
 return <details className="judging-visibility"><summary>Results visibility</summary><p className="fine">Controls this judging event only. Individual judge sheets stay private.</p><fieldset disabled={disabled}>
  {([{label:'Facilitators',value:facilitators,set:setFacilitators},{label:'Participants',value:participants,set:setParticipants}] as const).map(group=><section key={group.label}><h4>{group.label}</h4><label className="check"><input type="checkbox" checked={group.value!=='HIDDEN'} onChange={e=>{group.set(e.target.checked?'PUBLISHED':'HIDDEN');setDirty(true);}}/>Show results to {group.label.toLowerCase()}</label><label className="check"><input type="checkbox" checked={group.value==='LIVE'} disabled={group.value==='HIDDEN'||disabled} onChange={e=>{group.set(e.target.checked?'LIVE':'PUBLISHED');setDirty(true);}}/>Include partial results</label><small>{group.value==='HIDDEN'?'Hidden, including published results':group.value==='LIVE'?'Submitted scores update automatically':'Published results only'}</small></section>)}
  <button type="button" disabled={disabled||!dirty} onClick={()=>void save()}>Save results visibility</button>
  {dirty&&<button type="button" className="secondary" disabled={disabled} onClick={()=>setDirty(false)}>Reset changes</button>}
 </fieldset></details>;
}

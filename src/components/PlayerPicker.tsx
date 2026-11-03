'use client';

import {useEffect,useState} from 'react';
import {PersonName} from './Avatar';
import {RaceAction} from './RaceAction';
import {useRunRevision} from './RunRevision';
import {useFieldDraft} from './useFieldDraft';
import type {PlayerParticipation} from '@/lib/participation';

export function PlayerPicker({eventId,actorId,stationId,stationName,players,required,visitId,credential,queued=false,initialIds=[],disabled=false,onSuccess}:{eventId:string;actorId:string;stationId:string;stationName:string;players:PlayerParticipation[];required:number|null;visitId?:string;credential?:string;queued?:boolean;initialIds?:string[];disabled?:boolean;onSuccess:()=>void}){
 const revision=useRunRevision();
 const [draft,setDraft,clearDraft]=useFieldDraft<{ids:string}>(`${actorId}:${eventId}:${revision}:lineup:${stationId}:${visitId??'arrival'}`,{ids:JSON.stringify(initialIds)});
 const [pending,setPending]=useState(false);
 const operation=visitId?'startChallenge':'checkIn';
 useEffect(()=>{const read=()=>{try{setPending(!!sessionStorage.getItem(`spy-race:${actorId}:${eventId}:${operation}:${visitId??'event'}`));}catch{setPending(false);}};read();window.addEventListener('spy-race-pending',read);return()=>window.removeEventListener('spy-race-pending',read);},[eventId,actorId,operation,visitId]);
 let storedIds:unknown;try{storedIds=JSON.parse(draft.ids);}catch{storedIds=[];}
 const ids:string[]=Array.isArray(storedIds)?storedIds.filter((id):id is string=>typeof id==='string'&&players.some(p=>p.id===id)):[];
 const valid=required===null?ids.length>0:ids.length===required;
 const full=required!==null&&ids.length>=required;
 return <section className="player-picker" aria-label={`Choose players for ${stationName}`}>
  <h3>Choose {required??'your'} players</h3><p>{required===null?'Select the teammates who will play.':`Choose exactly ${required} teammates for this station.`} {queued?'Your team will wait for admission before the timer can start.':'Confirming starts the timer, including reading instructions and preparation.'}</p>
  {required!==null&&players.length<required&&<p className="notice">This station needs {required} players, but your team has {players.length} active members. Ask the organizer to review the roster or station requirement.</p>}
  <fieldset className="player-options" disabled={disabled||pending}><legend className="sr-only">Team players</legend>{players.map(player=>{const selected=ids.includes(player.id);return <label key={player.id} className={`player-option${selected?' is-selected':''}`}>
   <input type="checkbox" checked={selected} disabled={!selected&&full} onChange={()=>setDraft({ids:JSON.stringify(selected?ids.filter(id=>id!==player.id):[...ids,player.id])})}/>
   <span className="player-option-person"><PersonName name={player.name} avatarUrl={player.avatarUrl} size="medium"/><span className="player-option-meta">{player.squadRole??'Team member'}{player.isCaptain?' · Captain':''}</span><span className="participation-count">{player.played} played / {player.explored} explored</span></span>
   <span className="player-selection-state">{selected?'✓ Selected':'Not selected'}</span>
  </label>;})}</fieldset>
  <div className="player-selection-bar"><div role="status" aria-live="polite"><strong>{ids.length}{required!==null?` of ${required}`:''} selected</strong><span>{full?'Deselect a player to change the lineup.':queued?'Timing has not started.':'Instructions appear after the timer starts.'}</span></div>
   <RaceAction eventId={eventId} actorId={actorId} input={{operation,...(visitId?{visitId}:{credential}),playerIds:ids}} label={queued?'Confirm players & join queue':'Confirm players & start timer'} description={`${stationName}: ${ids.map(id=>players.find(p=>p.id===id)?.name).join(', ')}${queued?' · join queue':' · start timer including instructions'}`} disabled={disabled||!valid} onRecorded={clearDraft} onSuccess={onSuccess}/>
  </div>
 </section>;
}

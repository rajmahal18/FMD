"use client";
import {RoleLabel} from "./RoleLabel";
import type {ArrivalPolicy} from "@/lib/arrival-policy";


import {useEffect,useRef,useState} from 'react';
import {SelectionDock} from './SelectionDock';
import {PersonName} from './Avatar';
import {RaceAction} from './RaceAction';
import {useRunRevision} from './RunRevision';
import {useFieldDraft} from './useFieldDraft';
import type {PlayerParticipation} from '@/lib/participation';

export function PlayerPicker({eventId,actorId,stationId,stationName,players,required,visitId,credential,queued=false,policy="CAPTAIN_CONFIRM",advance=false,initialIds=[],disabled=false,onSuccess}:{eventId:string;actorId:string;stationId:string;stationName:string;players:PlayerParticipation[];required:number|null;visitId?:string;credential?:string;queued?:boolean;policy?:ArrivalPolicy;advance?:boolean;initialIds?:string[];disabled?:boolean;onSuccess:()=>void}){
 const revision=useRunRevision();const picker=useRef<HTMLElement>(null);
 const [draft,setDraft,clearDraft]=useFieldDraft<{ids:string}>(`${actorId}:${eventId}:${revision}:lineup:${stationId}:${visitId??'arrival'}`,{ids:JSON.stringify(initialIds)});
 const [pending,setPending]=useState(false);const [search,setSearch]=useState('');
 const operation=advance?'saveLineup':visitId?'startChallenge':'checkIn';
 const approval=policy!=='CAPTAIN_CONFIRM';const timing=policy==='SCAN_APPROVAL_TIMED';const hint=advance?'Save now, scan the station QR on arrival, then wait for facilitator approval to start timing.':approval?timing?'The timer is already running. Submit the lineup to begin play.':'Submit the players, then wait for facilitator arrival and lineup approval. Timing has not started.':queued?'Your team will wait for admission before the timer can start.':'Confirming starts the timer, including reading instructions and preparation.';
 useEffect(()=>{const read=()=>{try{setPending(!!sessionStorage.getItem(`spy-race:${actorId}:${eventId}:${operation}:${advance?stationId:visitId??'event'}`));}catch{setPending(false);}};read();window.addEventListener('spy-race-pending',read);return()=>window.removeEventListener('spy-race-pending',read);},[eventId,actorId,operation,visitId,advance,stationId]);
 let storedIds:unknown;try{storedIds=JSON.parse(draft.ids);}catch{storedIds=[];}
 const ids:string[]=Array.isArray(storedIds)?storedIds.filter((id):id is string=>typeof id==='string'&&players.some(p=>p.id===id)):[];
 const valid=required===null?ids.length>0:ids.length===required;
 const full=required!==null&&ids.length>=required;
 const visiblePlayers=players.filter(p=>(p.name+' '+(p.squadRole??'')).toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()));
 const remaining=required===null?Math.max(0,1-ids.length):Math.max(0,required-ids.length);
 return <section ref={picker} className="player-picker" aria-label={`Choose players for ${stationName}`}>
  <h3>Choose {required??'your'} players</h3><p>{required===null?'Select the teammates who will play.':`Choose exactly ${required} teammates for this station.`} {hint}</p>
  {required!==null&&players.length<required&&<p className="notice">This station needs {required} players, but your team has {players.length} active members. Ask the organizer to review the roster or station requirement.</p>}
  <div className="player-picker-tools"><label>Find a teammate<input type="search" value={search} onChange={e=>setSearch(e.target.value)} autoComplete="off" placeholder="Name or squad role"/></label><button type="button" className="secondary" disabled={!ids.length||pending||disabled} onClick={()=>setDraft({ids:'[]'})}>Clear selection</button></div>
  {search&&<p className="fine" role="status">Showing {visiblePlayers.length} of {players.length} teammates. {ids.length} selected in total.</p>}
  {!visiblePlayers.length&&<p className="notice">No teammates match this search. <button type="button" className="secondary" onClick={()=>setSearch('')}>Clear search</button></p>}
  <fieldset className="player-options" disabled={disabled||pending}><legend className="sr-only">Team players</legend>{visiblePlayers.map(player=>{const selected=ids.includes(player.id);return <label key={player.id} className={`player-option${selected?' is-selected':''}`}>
   <input type="checkbox" checked={selected} disabled={!selected&&full} onChange={()=>setDraft({ids:JSON.stringify(selected?ids.filter(id=>id!==player.id):[...ids,player.id])})}/>
   <span className="player-option-person"><PersonName name={player.name} avatarUrl={player.avatarUrl} size="medium"/><span className="player-option-meta"><RoleLabel role={player.squadRole??'Team member'}/>{player.isCaptain&&<RoleLabel role="Captain"/>}</span><span className="participation-count">{player.played} played / {player.explored} explored</span></span>
   <span className="player-selection-state">{selected?'✓ Selected':'Not selected'}</span>
  </label>;})}</fieldset>
  <SelectionDock anchor={picker}><div role="status" aria-live="polite"><strong>{ids.length}{required!==null?` of ${required}`:''} selected</strong><span>{pending?'Waiting for server confirmation. Retry the saved request if needed.':valid?approval?hint:queued?'Ready to join the queue. Timing has not started.':'Ready. Confirming locks the lineup and starts timing.':`Choose ${remaining} more ${remaining===1?'player':'players'} to continue.`}</span></div>
   <RaceAction eventId={eventId} actorId={actorId} input={{operation,...(advance?{stationId}:visitId?{visitId}:{credential}),playerIds:ids}} label={advance?'Save advance lineup':approval?'Submit lineup':queued?'Confirm players & join queue':'Confirm players & start timer'} description={`${stationName}: ${ids.map(id=>players.find(p=>p.id===id)?.name).join(', ')}${approval?' - submit lineup for approval':queued?' - join queue':' - start timer including instructions'}`} disabled={disabled||!valid} onRecorded={advance?undefined:clearDraft} onSuccess={onSuccess}/>
  </SelectionDock>
 </section>;
}

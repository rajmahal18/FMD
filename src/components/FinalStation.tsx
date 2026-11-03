'use client';
import {useEffect,useState} from 'react';
import type {FinalStationStatus} from '@/lib/arrival-policy';
import {RaceAction} from './RaceAction';
import {formatSeconds} from '@/lib/time-penalties';
import {timeoutSignal} from '@/lib/timeout-signal';
export function FinalStationNotice({status,checkedAt}:{status:FinalStationStatus;checkedAt:string}){
 const [now,setNow]=useState(Date.parse(checkedAt));useEffect(()=>{const server=Date.parse(checkedAt),local=Date.now();setNow(server);const timer=setInterval(()=>setNow(server+Date.now()-local),1000);return()=>clearInterval(timer);},[checkedAt]);
 const remaining=status.deadlineAt?Math.max(0,Math.ceil((Date.parse(status.deadlineAt)-now)/1000)):null;
 return <section className="final-station-status" aria-label="Shared Final Station"><h3>{status.name} · HQ finale</h3>{remaining!==null?<><p>Shared countdown</p><strong className="final-countdown" role="timer">{formatSeconds(remaining)}</strong><p>{status.ownComplete?`Your Final Station result is confirmed: ${status.ownPoints??0} points.`:remaining===0?'Time is up. Wait for the facilitator to confirm the physical challenge result.':'All squads share this deadline. Follow the Final Station facilitator.'}</p></>:<p>{status.ready?'All teams have cleared their regular stations. Gather at HQ and wait for the organizer’s shared start.':`${status.readyTeams} of ${status.teamCount} teams cleared their regular stations. The Final Station cannot start until everyone is complete.`}</p>}</section>;
}
export function FinalStationControl({eventId,actorId,initial,checkedAt,state}:{eventId:string;actorId:string;initial:FinalStationStatus|null;checkedAt:string;state:string}){
 const [data,setData]=useState({status:initial,checkedAt,state});const [error,setError]=useState('');
 async function refresh(){try{const response=await fetch(`/api/events/${eventId}/final-station`,{cache:'no-store',signal:timeoutSignal(8000)});if(!response.ok)throw Error();setData(await response.json());setError('');}catch{setError('Connection lost. Showing the last confirmed HQ update.');}}
 useEffect(()=>{if(!initial)return;const timer=setInterval(()=>{if(document.visibilityState==='visible')void refresh();},8000);return()=>clearInterval(timer);},[eventId]);
 if(!data.status)return null;
 return <details className="panel" open><summary>HQ Final Station</summary><FinalStationNotice status={data.status} checkedAt={data.checkedAt}/>{!data.status.startedAt&&<RaceAction eventId={eventId} actorId={actorId} input={{operation:'startFinalStation'}} label="Start shared HQ countdown" description="Start the Final Station for every squad at the same server timestamp." confirm="Confirm all squads are assembled and ready. This starts one shared Final Station countdown for everyone." disabled={!data.status.ready||data.state!=='LIVE'||!!error} onSuccess={()=>void refresh()}/>}<p className="fine">The server rechecks every team’s confirmed regular-station results before starting.</p>{error&&<p role="status">{error}</p>}</details>;
}

'use client';
import {useEffect,useRef,useState,type ReactNode} from 'react';
import Link from 'next/link';
import type {DefusalData,DefusalTeam} from '@/lib/final-challenge';
import {ProjectorControls} from './ProjectorControls';
function useDefusalNow(checkedAt?:string){
 const [now,setNow]=useState(Date.now());
 useEffect(()=>{const base=checkedAt?Date.parse(checkedAt):Date.now(),local=Date.now();setNow(base);const timer=setInterval(()=>setNow(base+Date.now()-local),250);return()=>clearInterval(timer);},[checkedAt]);return now;
}

function useChallenge(eventId:string,enabled=true){
 const [data,setData]=useState<DefusalData|null>(null),[error,setError]=useState(''),alive=useRef(true),running=useRef(false);
 async function refresh(){if(!enabled||running.current)return;running.current=true;try{const r=await fetch(`/api/events/${eventId}/final-challenge`,{cache:'no-store',signal:AbortSignal.timeout(10000)}),body=await r.json();if(!r.ok)throw Error(body.error??'Unable to refresh.');if(alive.current){setData(body);setError('');}}catch(e){if(alive.current)setError(e instanceof Error?e.message:'Connection lost.');}finally{running.current=false;}}
 useEffect(()=>{alive.current=true;if(!enabled){setData(null);return;}void refresh();const timer=setInterval(()=>{if(document.visibilityState==='visible')void refresh();},2000);const online=()=>void refresh();window.addEventListener('online',online);return()=>{alive.current=false;clearInterval(timer);window.removeEventListener('online',online);};},[eventId,enabled]);
 return {data,error,refresh};
}
function ChallengeClock({data,onDeadline}:{data:DefusalData;onDeadline:()=>void}){
 const [now,setNow]=useState(Date.parse(data.checkedAt)),callback=useRef(onDeadline);callback.current=onDeadline;
 useEffect(()=>{const base=Date.parse(data.checkedAt),local=Date.now();let notified=false;const tick=()=>{const time=base+Date.now()-local;setNow(time);if(data.deadlineAt&&time>=Date.parse(data.deadlineAt)&&!notified){notified=true;callback.current();}};tick();const timer=setInterval(tick,250);return()=>clearInterval(timer);},[data.checkedAt,data.deadlineAt]);
 if(!data.startedAt)return <p className="defusal-clock" data-phase="waiting">Awaiting organizer&apos;s start</p>;
 if(data.endedAt&&data.teams.every(t=>t.status==='DEFUSED'))return <p className="defusal-clock" data-phase="complete">{data.organizer?"All threats neutralized":"Threat neutralized"}</p>;
 const seconds=Math.max(0,Math.ceil((Date.parse(data.deadlineAt!)-now)/1000));
 return <p className="defusal-clock" role="timer" aria-label="Shared countdown">{String(Math.floor(seconds/60)).padStart(2,'0')}:{String(seconds%60).padStart(2,'0')}</p>;
}
function ThreatTile({team}:{team:DefusalTeam}){
 const [failed,setFailed]=useState(false);const source=team.status==='DEFUSED'?'threat-neutralized':team.status==='EXPIRED'?'explosion':'red-alert';
 useEffect(()=>setFailed(false),[source]);
 const label=team.status==='DEFUSED'?'THREAT NEUTRALIZED':team.status==='EXPIRED'?'DETONATED':team.status==='ALERT'?'RED ALERT':'AWAITING START';
 return <section className={`threat-tile threat-${team.status.toLowerCase()}`} aria-label={`${team.name}: ${label}`}>
 {team.status!=='WAITING'&&!failed&&<video key={source} src={`/videos/final-challenge/${source}.mp4`} autoPlay muted loop playsInline preload="auto" aria-hidden="true" onError={()=>setFailed(true)}/>}
 <div className="threat-overlay"><h2>{team.name}</h2><strong>{label}</strong>{team.status==='ALERT'&&<span>Awaiting defusal</span>}</div></section>;
}
export function FinalChallengeGate({eventId,active,children}:{eventId:string;active:boolean;children:ReactNode}){
 const {data,error,refresh}=useChallenge(eventId,active),[pin,setPin]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 const pending=useRef<{requestKey:string;pin:string}|null>(null);
 const now=useDefusalNow(data?.checkedAt);
 // A disabled/unconfigured challenge does not replace the existing mission.
 if(!active||!data?.enabled||!data.ready||!data.teams.length)return <>{children}</>;
 const original=data.teams[0],team:DefusalTeam=original.status==='ALERT'&&data.deadlineAt&&now>=Date.parse(data.deadlineAt)?{...original,status:'EXPIRED'}:original;
 async function submit(){if(busy||!data)return;setBusy(true);setMessage('');const request=pending.current??{requestKey:crypto.randomUUID(),pin};pending.current=request;
  try{const r=await fetch(`/api/events/${eventId}/final-challenge`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({operation:'submit',runRevision:data.runRevision,...request}),signal:AbortSignal.timeout(10000)}),body=await r.json();if(!r.ok){if(r.status<500)pending.current=null;throw Error(body.error??'Unable to confirm.');}pending.current=null;setPin('');setMessage(body.message);await refresh();}catch(e){setMessage(e instanceof Error?e.message:'Connection lost. Retry the same attempt.');}finally{setBusy(false);}}
 return <section className="captain-defusal"><p className="eyebrow">FINAL CHALLENGE</p><h1>Defuse the threat</h1><ChallengeClock data={data} onDeadline={()=>void refresh()}/><ThreatTile team={team}/>{error&&<p role="alert">{error} Showing the last confirmed status.</p>}{team.status==='ALERT'&&<form onSubmit={e=>{e.preventDefault();void submit();}}><label>Six-digit PIN<input type="text" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} autoComplete="off" aria-label="Six-digit PIN" value={pin} onChange={e=>setPin(e.target.value.replace(/[^0-9]/g,'').slice(0,6))} disabled={busy||!!pending.current}/></label><button disabled={busy||data.blocked||(!pending.current&&pin.length!==6)}>{busy?'Checking...':pending.current?'Retry saved attempt':'Submit code'}</button><p className="fine">Incorrect codes can be retried while time remains. Wait one second between attempts.</p></form>}{team.status==='WAITING'&&<p>Stay with your squad. Code entry opens when the organizer starts the shared countdown.</p>}{message&&<p role="status">{message}</p>}</section>;
}
export function FinalChallengeAdmin({eventId}:{eventId:string}){
 const {data,error,refresh}=useChallenge(eventId),[minutes,setMinutes]=useState(''),[enabled,setEnabled]=useState(false),[pins,setPins]=useState<Record<string,string>>({}),[busy,setBusy]=useState(false),[notice,setNotice]=useState(''),[dirty,setDirty]=useState(false),[formRevision,setFormRevision]=useState(0);
 const loaded=useRef(false),pending=useRef<Record<string,unknown>|null>(null);
 useEffect(()=>{if(data&&!loaded.current){setMinutes(data.durationSeconds?String(data.durationSeconds/60):'');setEnabled(data.enabled);setFormRevision(data.revision);setDirty(false);loaded.current=true;}},[data]);
 async function command(operation:'configure'|'start'){
  if(!data||busy)return;
  if(operation==='start'&&!pending.current&&!window.confirm(`Start the shared ${data.durationSeconds!/60}-minute countdown for all ${data.teamCount} squads? PINs and duration will be locked.`))return;
  setBusy(true);setNotice('');const payload=pending.current??{operation,requestKey:crypto.randomUUID(),runRevision:data.runRevision,revision:operation==='configure'?formRevision:data.revision,...(operation==='configure'?{durationSeconds:Number(minutes)*60,enabled,pins}:{})};pending.current=payload;
  try{const r=await fetch(`/api/events/${eventId}/final-challenge`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),signal:AbortSignal.timeout(20000)}),body=await r.json();if(!r.ok){if(r.status<500)pending.current=null;throw Error(body.error??'Unable to confirm.');}pending.current=null;setPins({});loaded.current=false;setDirty(false);setNotice(body.message);await refresh();}catch(e){setNotice(e instanceof Error?e.message:'Connection lost. Retry the original action.');}finally{setBusy(false);}
 }
 return <div className="defusal-admin"><h1>Final Challenge</h1><p>Configure the shared countdown and squad PINs. Captains stay on the regular race until every squad has completed and released from all stations.</p><Link className="button secondary" target="_blank" rel="noopener noreferrer" href={`/events/${eventId}/final-challenge/display`}>Open control-center display</Link>{error&&<p role="alert">{error}</p>}{notice&&<p role="status">{notice}</p>}{data&&<><p><strong>{data.readyTeams} / {data.teamCount}</strong> squads ready. {data.enabled?'Enabled':'Disabled'}</p><ChallengeClock data={data} onDeadline={()=>void refresh()}/>{!data.startedAt?<><form onSubmit={e=>{e.preventDefault();void command('configure');}}><fieldset disabled={busy||data.blocked||!!pending.current}><label>Shared duration (minutes)<input type="number" min={1} max={120} step={1} required value={minutes} onChange={e=>{setMinutes(e.target.value);setDirty(true);}}/></label><div className="defusal-pin-list">{data.teams.map(t=><label key={t.id}>{t.name}<span className="fine">{t.pinConfigured?'PIN saved. Leave blank to keep it.':'Set a six-digit PIN.'}</span><input type="password" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} autoComplete="new-password" value={pins[t.id]??''} onChange={e=>{setPins({...pins,[t.id]:e.target.value.replace(/[^0-9]/g,'').slice(0,6)});setDirty(true);}}/></label>)}</div><label className="check"><input type="checkbox" checked={enabled} onChange={e=>{setEnabled(e.target.checked);setDirty(true);}}/>Enable Final Challenge</label></fieldset><button disabled={busy||data.blocked} type="submit">{pending.current?'Retry saved action':'Save settings'}</button></form><button className="defusal-start" disabled={busy||data.blocked||!data.ready||!data.enabled||dirty||!!pending.current} onClick={()=>void command('start')}>Start shared countdown</button></>:<p>The countdown has started. PINs and duration are locked.</p>}<div className="defusal-status-list">{data.teams.map(t=><div key={t.id}><strong>{t.name}</strong><span>{t.status==='DEFUSED'?'Defused':t.status==='EXPIRED'?'Time expired':t.status==='ALERT'?'Awaiting defusal':'Awaiting start'}</span><small>{t.attempts} attempts</small></div>)}</div></>}</div>;
}
export function FinalChallengeDisplay({eventId}:{eventId:string}){
 const {data,error,refresh}=useChallenge(eventId);
 const stage=useRef<HTMLElement>(null);
 const now=useDefusalNow(data?.checkedAt);
 return <main ref={stage} className="defusal-display"><ProjectorControls target={stage}/><header className="defusal-display-heading"><div className="defusal-display-title"><p className="eyebrow">FINAL CHALLENGE</p><h1>Control center</h1></div>{data&&<ChallengeClock data={data} onDeadline={()=>void refresh()}/>}<div className="defusal-display-progress"><strong>{data?.teams.filter(t=>t.status==='DEFUSED').length??0}<span> / {data?.teams.length??0}</span></strong><span>Threats neutralized</span></div>{error&&<p role="alert" className="defusal-connection">Connection lost. Showing confirmed statuses and the saved deadline.</p>}</header>{data?<div className="threat-grid">{data.teams.map(t=><ThreatTile key={t.id} team={t.status==='ALERT'&&data.deadlineAt&&now>=Date.parse(data.deadlineAt)?{...t,status:'EXPIRED'}:t}/>)}</div>:<p>Loading control center...</p>}</main>;
}

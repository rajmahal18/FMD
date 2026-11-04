'use client';
import Link from 'next/link';
import {useEffect,useRef,useState} from 'react';
import {audienceStatus,sharingLabels,type ResultCenterData,type ResultItem,type SharingMode,type SharingPreview} from '@/lib/result-sharing';
import {JudgingDialog} from './JudgingScoreSheet';
import {SpyIcon} from './SpyIcon';
import {ErrorNotice} from './ErrorNotice';
export function ResultCenter({initial,share}:{initial:ResultCenterData;share?:string}){
 const [data,setData]=useState(initial),[selected,setSelected]=useState<ResultItem|null>(initial.organizer?initial.items.find(i=>i.key===share)??null:null),[facilitators,setFacilitators]=useState<SharingMode>(selected?.facilitators??'HIDDEN'),[participants,setParticipants]=useState<SharingMode>(selected?.participants??'HIDDEN'),[preview,setPreview]=useState<SharingPreview|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
 const inflight=useRef(false),retry=useRef({token:'',key:''});
 async function refresh(){const r=await fetch(`/api/events/${data.eventId}/result-sharing`,{cache:'no-store',signal:AbortSignal.timeout(15000)});const next=await r.json();if(!r.ok)throw Error(next.error??'Unable to refresh results.');setData(next);}
 useEffect(()=>{const timer=setInterval(()=>{if(!selected&&!inflight.current&&document.visibilityState==='visible')void refresh().catch(()=>setError('Connection lost. Sharing status may be outdated. Refresh before making changes.'));},10000);return()=>clearInterval(timer);},[selected,data.eventId]);
 function open(item:ResultItem){setSelected(item);setFacilitators(item.facilitators);setParticipants(item.participants);setPreview(null);setError('');retry.current={token:'',key:''};}
 async function send(confirm:boolean){if(!selected||inflight.current)return;inflight.current=true;setBusy(true);setError('');setMessage('');
  if(confirm&&preview&&retry.current.token!==preview.token)retry.current={token:preview.token,key:crypto.randomUUID()};
  try{const r=await fetch(`/api/events/${data.eventId}/result-sharing`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({operation:confirm?'confirm':'preview',key:selected.key,sourceRevision:selected.sourceRevision,sharingRevision:selected.sharingRevision,runRevision:data.runRevision,facilitators,participants,...(confirm?{token:preview?.token,requestKey:retry.current.key}:{})}),signal:AbortSignal.timeout(15000)});const next=await r.json();if(!r.ok)throw Error(next.error??'Unable to update sharing.');
   if(confirm){setMessage(next.message);setSelected(null);setPreview(null);await refresh();}else setPreview(next);
  }catch(e){setError(e instanceof Error?e.message:'Confirmation was not received. Retry safely.');}finally{inflight.current=false;setBusy(false);}
 }
 return <div className="result-center"><div className="section-heading"><p>{data.organizer?'Choose a result to review or share.':'Results shared by your organizer.'}</p><button className="secondary" disabled={busy} onClick={()=>{setError('');void refresh().catch(e=>setError(e.message));}}>Refresh</button></div>
  {data.organizer&&<p className="result-privacy-note"><SpyIcon name="staff"/><span>Approving results does not share them.</span></p>}
  {error&&!selected&&<ErrorNotice>{error}</ErrorNotice>}{message&&<p className="notice" role="status">{message}</p>}
  <div className="result-center-list">{data.items.map(item=><section className="result-center-row" key={item.key}><div className="result-source-name"><SpyIcon name={item.kind==='judging'?'staff':item.kind==='voting'?'vote':'rank'}/><div><Link href={item.href}>{item.name}</Link><small>{item.kind==='overall'?'Weighted total across activities':item.kind==='judging'?'Judged activity':item.kind==='voting'?'Voting award':'Race and Agent Contact'}</small></div></div>{data.organizer&&<><span className={`result-state ${item.approved?'is-approved':''}`}>{item.status}</span><div className="result-audiences"><span>Participants <strong className={item.participants==='HIDDEN'?'is-hidden':'is-visible'}>{audienceStatus(item.participants)}</strong></span><span>Facilitators <strong className={item.facilitators==='HIDDEN'?'is-hidden':'is-visible'}>{audienceStatus(item.facilitators)}</strong></span></div></>}<div className="result-row-actions"><Link className="text-action" href={item.href}>View results</Link>{data.organizer&&<button type="button" className="secondary" onClick={()=>open(item)} disabled={data.archived}>Sharing</button>}</div></section>)}</div>
  {!data.items.length&&<section className="sealed-results"><h2>No results shared yet</h2><p>Your organizer will make results available here when ready.</p></section>}
  {selected&&data.organizer&&<JudgingDialog title={`${preview?'Review sharing':'Sharing'}: ${selected.name}`} onClose={()=>{if(!busy){setSelected(null);setPreview(null);setError('');}}}>
   {error&&<ErrorNotice>{error}</ErrorNotice>}
   {!preview?<><p className="fine">Choose what each audience can see. Nothing changes until you review and confirm.</p><fieldset disabled={busy||data.archived} className="result-sharing-fields">{([{name:'Participants',value:participants,set:setParticipants},{name:'Facilitators',value:facilitators,set:setFacilitators}] as const).map(a=><label key={a.name}>{a.name}<select value={a.value} onChange={e=>a.set(e.target.value as SharingMode)}><option value="HIDDEN">Hidden</option><option value="PUBLISHED" disabled={!selected.approved}>Approved results{!selected.approved?' (approve first)':''}</option>{selected.kind==='judging'&&<option value="LIVE">Live scores (includes partial)</option>}</select></label>)}</fieldset>
    {!selected.approved&&<p>Approve results first to share a fixed result.{selected.kind==='judging'?' Live scores update with every submitted sheet.':''}</p>}
    {participants==='LIVE'&&<p className="notice">Participants will see partial scores and future score changes immediately.</p>}
    <button type="button" disabled={busy||data.archived||participants===selected.participants&&facilitators===selected.facilitators} onClick={()=>void send(false)}>{busy?'Preparing review...':'Review sharing changes'}</button>
   </>:<><dl className="result-sharing-summary"><div><dt>Participants</dt><dd>{sharingLabels[preview.previous.participants]} → <strong>{sharingLabels[preview.participants]}</strong></dd></div><div><dt>Facilitators</dt><dd>{sharingLabels[preview.previous.facilitators]} → <strong>{sharingLabels[preview.facilitators]}</strong></dd></div></dl><ul>{preview.effects.map(effect=><li key={effect}>{effect}</li>)}</ul>
    {(preview.participants!=='HIDDEN'||preview.facilitators!=='HIDDEN')&&<section><h3>Results being shared</h3><div className="result-share-rows">{preview.rows.map((row,i)=><div key={i}><strong>{row.name}</strong><span>{row.value}</span></div>)}</div>{!preview.rows.length&&<p>No submitted scores yet. Scores will appear as judges submit.</p>}</section>}
    <div className="result-sharing-actions"><button type="button" disabled={busy} onClick={()=>void send(true)}>{busy?'Confirming...':'Confirm sharing changes'}</button><button type="button" className="secondary" disabled={busy} onClick={()=>{setPreview(null);setError('');}}>Back to audience settings</button></div>
   </>}
  </JudgingDialog>}
 </div>;
}

'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import type {JudgingContestData,JudgingData,JudgingRow} from '@/lib/judging';
import {RecordTabs} from './RecordTabs';
import {JudgingEditor,type JudgingAction} from './JudgingEditor';
import {JudgingDialog,JudgingScoreSheet} from './JudgingScoreSheet';
import {ErrorNotice} from './ErrorNotice';
import {useActionFeedback} from './ActionFeedback';

function ContestResults({contest,organizer,run,busy}:{contest:JudgingContestData;organizer:boolean;run:JudgingAction;busy:boolean}){
 const [selected,setSelected]=useState<JudgingRow|null>(null),[reason,setReason]=useState('');
 return <section className="judging-results"><h3>{contest.state==='PUBLISHED'?'Published results':'Score overview'}</h3>{organizer&&<p className="fine">Equal-weight average of submitted judge totals. Drafts are excluded. Ranks appear when every judge has scored every entrant.</p>}
  <div className="judging-results-labels" aria-hidden="true"><span>Rank</span><span>Entrant</span><span>Average</span><span>Submitted</span></div>
  {contest.results.map(row=><button type="button" className="judging-result-row" key={row.id} onClick={()=>{setSelected(row);setReason('');}} aria-label={`View ${row.name} judging details`}><span className="judging-rank">{row.rank??'—'}</span><span><strong>{row.name}</strong>{row.teamName&&<small>{row.teamName}</small>}</span><span className="judging-average">{row.average===null?'Not scored':row.average.toFixed(2)}<small> / {row.maximum}</small></span><span className="judging-progress">{row.submitted}/{row.judges}<small> judges</small></span></button>)}
  {selected&&<JudgingDialog title={selected.name} onClose={()=>setSelected(null)}><p>Average: <strong>{selected.average?.toFixed(2)??'Not scored'} / {selected.maximum}</strong> · {selected.submitted}/{selected.judges} judges submitted</p>{organizer?<>{(contest.breakdown??[]).filter(s=>s.candidateId===selected.id).map(sheet=><section className="judging-breakdown" key={sheet.judgeId}><h3>{sheet.judgeName}</h3><dl className="judging-review">{contest.config.criteria.map(c=><div key={c.id}><dt>{c.name}</dt><dd>{sheet.scores[c.id]} / {c.maximum}</dd></div>)}</dl><p><strong>Total: {sheet.total.toFixed(2)}</strong></p>{contest.state==='CLOSED'&&<button type="button" className="secondary" disabled={busy||reason.trim().length<5} onClick={()=>{void run({operation:'reopenScore',contestId:contest.id,revision:contest.revision,judgeId:sheet.judgeId,candidateId:selected.id,reason}).then(ok=>{if(ok)setSelected(null);});}}>Reopen this judge’s score</button>}</section>)}{contest.state==='CLOSED'&&<label className="judging-reason">Correction reason<input value={reason} maxLength={500} minLength={5} onChange={e=>setReason(e.target.value)} placeholder="Explain why this score should be reopened"/></label>}</>:<p>Final result based on equally weighted judge totals. Individual judge sheets remain private.</p>}</JudgingDialog>}
 </section>;
}
function ContestOperations({data,contest,run,busy}:{data:JudgingData;contest:JudgingContestData;run:JudgingAction;busy:boolean}){
 const [reason,setReason]=useState('');const organizer=data.role==='ORGANIZER';
 return <div><div className="judging-heading"><div><h2>{contest.name}</h2></div><span className={`tag judging-state-${contest.state.toLowerCase()}`}>{contest.state==='DRAFT'?'Not open':contest.state}</span></div>{contest.instructions&&<details className="judging-instructions"><summary>Judging instructions</summary><p>{contest.instructions}</p></details>}
  {organizer&&<><div className="judging-toolbar"><span>{contest.judgeCount} assigned judges · {contest.candidates.length} entrants</span>{contest.state!=='PUBLISHED'&&contest.state!=='OPEN'&&<button disabled={busy||data.archived||data.eventState==='PAUSED'} onClick={()=>void run({operation:'open',contestId:contest.id,revision:contest.revision})}>{contest.state==='CLOSED'?'Reopen scoring':'Open scoring'}</button>}{contest.state==='OPEN'&&<button disabled={busy||data.archived} className="secondary" onClick={()=>void run({operation:'close',contestId:contest.id,revision:contest.revision})}>Close scoring</button>}{contest.state==='CLOSED'&&<button disabled={busy||data.archived||!contest.results.length||contest.results.some(r=>r.rank===null)} onClick={()=>void run({operation:'publish',contestId:contest.id,revision:contest.revision})}>Publish final judging results</button>}</div>{contest.state==='DRAFT'&&<p><Link className="text-action" href={`/events/${data.eventId}/judging-settings`}>Configure criteria, entrants & judges</Link></p>}{contest.state==='PUBLISHED'&&<details className="judging-correction"><summary>Withdraw publication for a correction</summary><p>The previous published result is retained in the audit. Scores must be explicitly reopened before a judge can edit.</p><label>Reason<input value={reason} onChange={e=>setReason(e.target.value)} minLength={5} maxLength={500}/></label><button className="secondary" disabled={busy||data.archived||reason.trim().length<5} onClick={()=>void run({operation:'unpublish',contestId:contest.id,revision:contest.revision,reason})}>Withdraw publication</button></details>}</>}
  {contest.assigned&&<><p className="fine">Select an entrant to score. Your sheets are private to you and organizers.</p><RecordTabs label="Entrants to judge" items={contest.candidates.map(candidate=>{const sheet=contest.ownSheets.find(s=>s.candidateId===candidate.id);return {id:candidate.id,name:candidate.name,badge:sheet?.submittedAt?'Submitted':sheet?'Draft':'Not scored',content:<JudgingScoreSheet key={`${data.runRevision}:${candidate.id}:${sheet?.version??0}:${contest.config.criteria.map(c=>`${c.id}=${c.maximum}`).join(',')}`} data={data} contest={contest} candidate={candidate} sheet={sheet} run={run} busy={busy}/>};})}/></>}
  {(organizer||contest.state==='PUBLISHED')&&<ContestResults key={`${contest.id}:${contest.revision}`} contest={contest} organizer={organizer} run={run} busy={busy}/>}
 </div>;
}
export function JudgingWorkspace({initial,setup=false}:{initial:JudgingData;setup?:boolean}){
 const [data,setData]=useState(initial),[busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
 const inflight=useRef(false),request=useRef({hash:'',key:''});const feedback=useActionFeedback();
 const refresh=useCallback(async()=>{const response=await fetch(`/api/events/${initial.eventId}/judging`,{cache:'no-store',signal:AbortSignal.timeout(15000)});const next=await response.json();if(!response.ok)throw Error(next.error??'Unable to refresh judging.');setData(next as JudgingData);},[initial.eventId]);
 useEffect(()=>{if(setup||initial.role==='ORGANIZER')return;const timer=setInterval(()=>{if(!inflight.current&&document.visibilityState==='visible')void refresh().catch(()=>setError('Unable to refresh. Your input is kept; reconnect and refresh before submitting.'));},10000);return()=>clearInterval(timer);},[setup,initial.role,refresh]);
 const run:JudgingAction=async body=>{
  if(inflight.current)return false;
  if(body.operation==='publish'&&!await feedback.confirm('Publish the complete equal-weight judging results to all event members?','Publish judging results'))return false;
  inflight.current=true;setBusy(true);setError('');setMessage('');
  const payload={...body,runRevision:data.runRevision};const hash=JSON.stringify(payload);if(request.current.hash!==hash)request.current={hash,key:crypto.randomUUID()};
  try{
   const response=await fetch(`/api/events/${data.eventId}/judging`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...payload,requestKey:request.current.key}),signal:AbortSignal.timeout(15000)});const result=await response.json();
   if(!response.ok)throw Error(result.error??'Unable to save judging.');
   setMessage(result.message);await refresh();request.current={hash:'',key:''};return true;
  }catch(e){setError(e instanceof Error?e.message:'Confirmation was not received. Your input is kept. Retry safely.');return false;}finally{inflight.current=false;setBusy(false);}
 };
 return <div className="judging-workspace"><div className="section-heading"><p className="record-intro">{setup?'Configure criteria, entrants and facilitator judges.':data.role==='ORGANIZER'?'Manage scoring and publish complete results.':data.role==='FACILITATOR'?'Score assigned contests. Drafts do not count until submitted.':'Published judging results.'}</p><button className="secondary" disabled={busy} aria-label="Refresh judging" onClick={()=>{setError('');void refresh().catch(e=>setError(e.message));}}>Refresh</button></div>{data.archived&&<p className="notice">Archived event · judging is read-only.</p>}{error&&<ErrorNotice>{error}</ErrorNotice>}{message&&<p className="judging-saved" role="status">{message}</p>}
  <RecordTabs label="Judging contests" empty={data.role==='FACILITATOR'?'No judging assignments or published results yet. Your organizer assigns judges per contest.':'No published judging results yet.'} items={[
   ...data.contests.map(contest=>({id:contest.id,name:contest.name,badge:contest.state.toLowerCase(),content:setup?<><h2>{contest.name}</h2><JudgingEditor key={contest.revision} data={data} contest={contest} run={run} busy={busy}/></>:<ContestOperations data={data} contest={contest} run={run} busy={busy}/>})),
   ...(setup?[{id:'new-contest',name:'+ Add contest',content:<><h2>Add a judged contest</h2><p className="fine">Gala templates follow the supplied criteria. Voting/contact awards remain separate.</p><JudgingEditor data={data} run={run} busy={busy}/></>}]:[])
  ]}/>
 </div>;
}

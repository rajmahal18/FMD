'use client';
import {useEffect,useRef,useState,type ReactNode} from 'react';
import type {JudgingCandidate,JudgingContestData,JudgingData,JudgingSheet} from '@/lib/judging';
import type {JudgingAction} from './JudgingEditor';
export function JudgingDialog({title,children,onClose}:{title:string;children:ReactNode;onClose:()=>void}){
 const dialog=useRef<HTMLDialogElement>(null);
 useEffect(()=>{dialog.current?.showModal();},[]);
 return <dialog ref={dialog} className="judging-dialog" aria-label={title} onCancel={e=>{e.preventDefault();onClose();}} onClick={e=>{if(e.target===e.currentTarget){const r=e.currentTarget.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)onClose();}}}><div className="judging-dialog-heading"><h2>{title}</h2><button type="button" className="secondary" aria-label="Close details" onClick={onClose}>×</button></div>{children}</dialog>;
}
export function JudgingScoreSheet({data,contest,candidate,sheet,run,busy}:{data:JudgingData;contest:JudgingContestData;candidate:JudgingCandidate;sheet?:JudgingSheet;run:JudgingAction;busy:boolean}){
 const [values,setValues]=useState<Record<string,string>>(()=>Object.fromEntries(Object.entries(sheet?.scores??{}).map(([id,v])=>[id,String(v)]))),[review,setReview]=useState(false);
 const submitted=!!sheet?.submittedAt,open=contest.state==='OPEN'&&data.eventState!=='PAUSED'&&!data.archived&&candidate.active;
 const key=`spy-judging:${data.eventId}:${data.runRevision}:${data.actorMembershipId}:${contest.id}:${contest.revision}:${candidate.id}:${sheet?.version??0}`;
 const storageReady=useRef(false);
 useEffect(()=>{storageReady.current=false;try{const raw=sessionStorage.getItem(key);if(raw&&!submitted){const parsed=JSON.parse(raw);if(parsed&&typeof parsed==='object')setValues(Object.fromEntries(contest.config.criteria.filter(c=>typeof parsed[c.id]==='string').map(c=>[c.id,parsed[c.id]])));}}catch{}storageReady.current=true;},[key,submitted,contest.config.criteria]);
 function change(id:string,value:string){const next={...values,[id]:value};setValues(next);if(storageReady.current)try{sessionStorage.setItem(key,JSON.stringify(next));}catch{}}
 const scores=Object.fromEntries(Object.entries(values).filter(([,v])=>v!=='').map(([id,v])=>[id,Number(v)])),maximum=contest.config.criteria.reduce((n,c)=>n+c.maximum,0),total=Math.round(Object.values(scores).reduce((n,v)=>n+v,0)*100)/100;
 async function save(submit:boolean){const ok=await run({operation:submit?'submitScore':'saveDraft',contestId:contest.id,revision:contest.revision,candidateId:candidate.id,version:sheet?.version??0,scores});if(ok){try{sessionStorage.removeItem(key);}catch{}setReview(false);}}
 return <section className="judging-score-sheet"><div className="judging-heading"><div><div className="eyebrow">YOUR SCORE SHEET</div><h3>{candidate.name}</h3>{candidate.teamName&&<p>{candidate.teamName}</p>}</div><span className={`tag ${submitted?'judging-submitted':''}`}>{submitted?'Submitted':sheet?'Draft saved':'Not submitted'}</span></div>
  {!open&&!submitted&&<p className="notice">{data.archived?'This event is archived.':data.eventState==='PAUSED'?'The event is paused. Your draft is kept.':'Scoring is not open. Your input is kept until the organizer opens this contest.'}</p>}
  <form onSubmit={e=>{e.preventDefault();setReview(true);}}><fieldset disabled={busy||!open||submitted}>{contest.config.criteria.map(c=><label className="judging-score-row" key={c.id}><span><strong>{c.name}</strong>{c.description&&<small>{c.description}</small>}</span><span className="judging-score-input"><input aria-label={`${c.name} score out of ${c.maximum}`} type="number" inputMode="decimal" min={0} max={c.maximum} step="0.01" required value={values[c.id]??''} onChange={e=>change(c.id,e.target.value)}/><span>/ {c.maximum}</span></span></label>)}</fieldset>
   <div className="judging-score-total"><span>{submitted?'Submitted total':'Your current total'}</span><strong>{total.toFixed(2)} <small>/ {maximum}</small></strong></div>
   {submitted?<p className="judging-submitted-note">This score counts once. Ask the organizer to reopen it if a correction is needed.</p>:<div className="judging-toolbar"><button type="button" className="secondary" disabled={busy||!open} onClick={()=>void save(false)}>Save draft</button><button type="submit" disabled={busy||!open}>Review score</button></div>}
  </form>
  {review&&<JudgingDialog title={`Review score · ${candidate.name}`} onClose={()=>{if(!busy)setReview(false);}}><p>Check every criterion before submitting. Other judges cannot see your scores.</p><dl className="judging-review">{contest.config.criteria.map(c=><div key={c.id}><dt>{c.name}</dt><dd>{values[c.id]} / {c.maximum}</dd></div>)}</dl><div className="judging-score-total"><span>{candidate.name}</span><strong>{total.toFixed(2)} / {maximum}</strong></div><p className="fine">Submitting locks this sheet. An organizer must reopen it for corrections.</p><div className="judging-toolbar"><button type="button" className="secondary" disabled={busy} onClick={()=>setReview(false)}>Back to score</button><button type="button" disabled={busy||!open} onClick={()=>void save(true)}>{busy?'Submitting…':'Confirm & submit score'}</button></div></JudgingDialog>}
 </section>;
}

'use client';
import {useEffect,useState} from 'react';
import {judgingNumber,type JudgingContestData,type JudgingData,type JudgingRow} from '@/lib/judging';
import type {JudgingAction} from './JudgingEditor';
type Preview={previewToken:string;revision:number;added:{id:string;name:string;retainedSubmissions:number}[];removed:{id:string;name:string}[];before:JudgingRow[];after:JudgingRow[]};
export function JudgingLineupOverride({data,contest,run,busy}:{data:JudgingData;contest:JudgingContestData;run:JudgingAction;busy:boolean}){
 const [ids,setIds]=useState(contest.judgeIds??[]),[dirty,setDirty]=useState(false),[reason,setReason]=useState(''),[preview,setPreview]=useState<Preview|null>(null),[loading,setLoading]=useState(false),[error,setError]=useState(''),[search,setSearch]=useState('');
 useEffect(()=>{if(!dirty)setIds(contest.judgeIds??[]);},[contest.judgeIds,dirty]);
 const disabled=busy||loading||data.archived;
 async function review(){setLoading(true);setError('');setPreview(null);try{
  const response=await fetch(`/api/events/${data.eventId}/judging`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({operation:'previewJudges',contestId:contest.id,revision:contest.revision,runRevision:data.runRevision,requestKey:crypto.randomUUID(),judgeIds:ids}),signal:AbortSignal.timeout(15000)});
  const result=await response.json();if(!response.ok)throw Error(result.error??'Unable to preview judges.');setPreview(result);
 }catch(e){setError(e instanceof Error?e.message:'Unable to preview judges.');}finally{setLoading(false);}}
 if(contest.state==='PUBLISHED')return null;
 return <details className="judging-visibility judging-lineup"><summary>Override judge lineup</summary><p className="fine">Saved sheets stay in the history. Only current judges count toward standings. Scoring stays {contest.state==='OPEN'?'open':contest.state.toLowerCase()}.</p>
  <fieldset disabled={disabled}><label>Find a facilitator<input type="search" value={search} onChange={e=>setSearch(e.target.value)}/></label>
   <div className="judging-lineup-options">{data.people.filter(p=>(p.active&&p.role==='FACILITATOR'||ids.includes(p.id))&&p.name.toLowerCase().includes(search.toLowerCase())).map(p=><label className="check" key={p.id}><input type="checkbox" checked={ids.includes(p.id)} disabled={disabled||(!p.active&&!ids.includes(p.id))} onChange={e=>{setIds(e.target.checked?[...ids,p.id]:ids.filter(id=>id!==p.id));setDirty(true);setPreview(null);}}/>{p.name}{!p.active?' (inactive)':''}</label>)}</div>
   <p className="fine">{ids.length} judges selected</p><button type="button" className="secondary" disabled={disabled||!dirty||!ids.length} onClick={()=>void review()}>{loading?'Preparing preview...':'Preview lineup changes'}</button>
   {dirty&&<button type="button" className="secondary" disabled={disabled} onClick={()=>{setDirty(false);setPreview(null);setReason('');setError('');}}>Reset changes</button>}
  </fieldset>
  {error&&<p role="alert">{error}</p>}
  {preview&&<section aria-label="Judge lineup preview"><h3>Review lineup changes</h3><p><strong>Add:</strong> {preview.added.map(p=>`${p.name}${p.retainedSubmissions?` (${p.retainedSubmissions} saved submissions will count again)`:''}`).join(', ')||'None'}</p><p><strong>Remove:</strong> {preview.removed.map(p=>p.name).join(', ')||'None'}</p><p className="fine">Removed judges lose scoring access immediately. Their sheets are retained. Ranks wait for every current judge to submit every entrant.</p>
   <dl className="judging-review">{preview.after.map(row=>{const old=preview.before.find(r=>r.id===row.id);return <div key={row.id}><dt>{row.name}</dt><dd>{old?.average==null?'Not scored':judgingNumber(old.average)} → {row.average===null?'Not scored':judgingNumber(row.average)}<small> · {row.submitted}/{row.judges} submitted{row.rank===null?' · Rank pending':` · Rank ${row.rank}`}</small></dd></div>;})}</dl>
   <label>Override reason<input value={reason} minLength={5} maxLength={500} disabled={disabled} onChange={e=>setReason(e.target.value)}/></label><button type="button" disabled={disabled||reason.trim().length<5} onClick={()=>{void run({operation:'overrideJudges',contestId:contest.id,revision:preview.revision,judgeIds:ids,previewToken:preview.previewToken,reason}).then(ok=>{setPreview(null);if(ok){setDirty(false);setReason('');}});}}>Confirm judge lineup</button>
  </section>}
 </details>;
}

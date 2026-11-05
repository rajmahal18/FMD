'use client';
import {useRef,useState} from 'react';
import {SpyIcon} from './SpyIcon';
import {timeoutSignal} from '@/lib/timeout-signal';
import {fileSize,inboxFileAccept,inboxFileLimit,inboxMaxFiles,inboxTotalFileLimit,type InboxFile} from '@/lib/inbox-files';
import type {InboxData} from '@/lib/inbox';
type Upload={key:string;file:File;info?:InboxFile;error?:string};
export function InboxAttachments({files,eventId}:{files:InboxFile[];eventId:string}){
 if(!files.length)return null;
 return <section className="inbox-attachments" aria-label="Attachments"><h3><SpyIcon name="attachment"/>Attachments</h3>{files.map(file=><a key={file.id} href={`/api/events/${eventId}/inbox/attachments/${file.id}`} download={file.name}><SpyIcon name="attachment"/><span><strong>{file.name}</strong><small>{fileSize(file.size)}</small></span><span className="attachment-download">Download</span></a>)}</section>;
}
export function InboxCompose({data,disabled,onSend}:{data:InboxData;disabled:boolean;onSend:(input:Record<string,unknown>)=>Promise<void>}){
 const [selected,setSelected]=useState<string[]>([]),[search,setSearch]=useState(''),[subject,setSubject]=useState('Double Agent offer'),[body,setBody]=useState(''),[review,setReview]=useState(false),[uploads,setUploads]=useState<Upload[]>([]),[uploading,setUploading]=useState(false),[error,setError]=useState('');
 const working=useRef(false),fileInput=useRef<HTMLInputElement>(null);
 const teams=Array.from(new Set(data.people.map(p=>p.teamId))),teamCount=teams.filter(Boolean).length,chosen=data.people.filter(p=>selected.includes(p.id)),chosenTeams=new Set(chosen.flatMap(p=>p.teamId?[p.teamId]:[]));
 const attachments=uploads.flatMap(u=>u.info?[u.info]:[]),notReady=uploading||uploads.some(u=>!u.info),locked=disabled||uploading;
 async function uploadOne(item:Upload){
  const form=new FormData();form.set('file',item.file);form.set('uploadKey',item.key);
  try{
   const response=await fetch(`/api/events/${data.eventId}/inbox/attachments`,{method:'POST',body:form,signal:timeoutSignal(30000)}),result=await response.json();
   if(!response.ok)throw new Error(result.error??'Upload failed. Retry this file.');
   setUploads(current=>current.map(u=>u.key===item.key?{...u,info:result,error:undefined}:u));
  }catch(e){setUploads(current=>current.map(u=>u.key===item.key?{...u,error:e instanceof Error?e.message:'Upload failed. Retry this file.'}:u));}
 }
 async function uploadFiles(files:File[]){
  if(working.current||disabled)return;setError('');
  if(uploads.length+files.length>inboxMaxFiles){setError('Choose up to 5 attachments.');return;}
  if(files.some(f=>!f.size||f.size>inboxFileLimit)||uploads.reduce((sum,u)=>sum+u.file.size,0)+files.reduce((sum,f)=>sum+f.size,0)>inboxTotalFileLimit){setError('Use nonempty files up to 3 MB each, 10 MB total.');return;}
  working.current=true;setUploading(true);const added=files.map(file=>({key:crypto.randomUUID(),file}));setUploads(current=>[...current,...added]);
  try{for(const item of added)await uploadOne(item);}finally{working.current=false;setUploading(false);if(fileInput.current)fileInput.current.value='';}
 }
 async function retry(item:Upload){if(working.current||disabled)return;working.current=true;setUploading(true);try{await uploadOne(item);}finally{working.current=false;setUploading(false);}}
 async function remove(item:Upload){
  if(working.current||disabled)return;working.current=true;setUploading(true);setError('');
  try{if(item.info){const r=await fetch(`/api/events/${data.eventId}/inbox/attachments/${item.info.id}`,{method:'DELETE',signal:timeoutSignal(10000)});if(!r.ok&&r.status!==409){const result=await r.json();throw new Error(result.error??'Unable to remove attachment.');}}setUploads(current=>current.filter(u=>u.key!==item.key));}catch(e){setError(e instanceof Error?e.message:'Unable to remove attachment.');}finally{working.current=false;setUploading(false);}
 }
 function choose(id:string){const person=data.people.find(p=>p.id===id)!;setSelected(current=>current.includes(id)?current.filter(v=>v!==id):[...current.filter(v=>!person.teamId||data.people.find(p=>p.id===v)?.teamId!==person.teamId),id]);}
 return <details className="inbox-compose"><summary><SpyIcon name="mail"/>New offer</summary>
  {!data.emailConfigured&&<p className="notice">Email is not configured. Messages still appear in the inbox; email attempts will show as failed.</p>}
  {error&&<p className="inbox-error" role="alert">{error}</p>}
  {review?<section className="inbox-review"><h2>Review offer</h2><p><strong>{chosen.length} recipients</strong> · {chosenTeams.size} of {teamCount} teams</p><ul className="inbox-recipient-review">{chosen.map(p=><li key={p.id}><strong>{p.name}</strong><span>{p.team??'No team'}</span></li>)}</ul>{chosenTeams.size<teamCount&&<p className="notice">{teamCount-chosenTeams.size} teams have no recipient selected for this send.</p>}<h3>{subject}</h3><p className="inbox-message-body">{body}</p><InboxAttachments files={attachments} eventId={data.eventId}/><p>Each recipient gets a private offer and answers separately. Organizers receive email copies.</p><div className="inbox-actions"><button disabled={disabled||notReady} onClick={()=>void onSend({operation:'send',recipientIds:selected,attachmentIds:attachments.map(f=>f.id),subject,body})}>Send to {chosen.length} {chosen.length===1?'participant':'participants'}</button><button className="secondary" disabled={disabled} onClick={()=>setReview(false)}>Edit</button></div></section>:
  <form className="management-form" onSubmit={e=>{e.preventDefault();if(!selected.length){setError('Choose at least one participant.');return;}if(notReady){setError('Finish or remove failed uploads before reviewing.');return;}setError('');setReview(true);}}><fieldset disabled={locked}>
   <section className="inbox-recipient-picker" aria-label="Recipients"><div className="inbox-recipient-heading"><h3>Recipients</h3><span role="status">{selected.length} selected · {chosenTeams.size}/{teamCount} teams</span></div><label>Find participant<input value={search} onChange={e=>setSearch(e.target.value)} type="search" placeholder="Name or team"/></label><p className="fine">Choose one participant per team. Choosing another replaces your selection for that team.</p>
   <div className="inbox-recipient-groups">{teams.map(teamId=>{
    const members=data.people.filter(p=>p.teamId===teamId),visible=members.filter(p=>(p.name+' '+(p.team??'')).toLocaleLowerCase().includes(search.toLocaleLowerCase()));if(!visible.length)return null;
    return <section className="inbox-recipient-team" key={teamId??'unassigned'}><h4>{members[0].team??'No team'}<span>{members.some(p=>selected.includes(p.id))?'Selected':'None selected'}</span></h4>{visible.map(p=><label key={p.id} className={`inbox-recipient-option${selected.includes(p.id)?' chosen':''}`}><input type="checkbox" checked={selected.includes(p.id)} onChange={()=>choose(p.id)}/><span>{p.name}</span></label>)}</section>;
   })}{!data.people.some(p=>(p.name+' '+(p.team??'')).toLocaleLowerCase().includes(search.toLocaleLowerCase()))&&<p>No matching participants.</p>}</div>{selected.length>0&&<button type="button" className="secondary" onClick={()=>setSelected([])}>Clear selection</button>}</section>
   <label>Subject<input required maxLength={120} value={subject} onChange={e=>setSubject(e.target.value)}/></label><label>Message<textarea required rows={7} maxLength={5000} value={body} onChange={e=>setBody(e.target.value)}/></label>
   <section className="inbox-upload" aria-label="Attach files"><h3><SpyIcon name="attachment"/>Attachments</h3><label className="inbox-file-label">Add files<input ref={fileInput} type="file" multiple accept={inboxFileAccept} disabled={locked||uploads.length>=inboxMaxFiles} onChange={e=>void uploadFiles(Array.from(e.target.files??[]))}/></label><p className="fine">PDF, Word, PowerPoint, Excel, text or images. Up to 5 files, 3 MB each, 10 MB total.</p></section>
  </fieldset>
   {!!uploads.length&&<ul className="inbox-upload-list">{uploads.map(item=><li key={item.key}><SpyIcon name="attachment"/><span><strong>{item.file.name}</strong><small>{fileSize(item.file.size)} · {item.info?'Ready':item.error?'Upload failed':'Uploading…'}</small>{item.error&&<span role="alert" className="inbox-error">{item.error}</span>}</span><div>{item.error&&<button type="button" className="secondary" disabled={locked} onClick={()=>void retry(item)}>Retry upload</button>}<button type="button" className="secondary" disabled={locked} onClick={()=>void remove(item)}>Remove</button></div></li>)}</ul>}
   <div className="inbox-actions"><button type="button" className="secondary" disabled={locked||notReady||!subject.trim()||!body.trim()} onClick={()=>void onSend({operation:'sendTest',attachmentIds:attachments.map(f=>f.id),subject,body})}>Send test to myself</button><button type="submit" disabled={disabled||notReady||!selected.length}>{uploading?'Uploading files…':'Review offer'}</button></div><p className="fine">Test offers go only to your organizer inbox and your own email. Your draft and recipient selection are kept.</p>
  </form>}
 </details>;
}

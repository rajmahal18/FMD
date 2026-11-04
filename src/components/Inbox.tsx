'use client';
import {useEffect,useRef,useState} from 'react';
import {SpyIcon} from './SpyIcon';
import {InboxCompose,InboxAttachments} from './InboxCompose';
import {timeoutSignal} from '@/lib/timeout-signal';
import type {InboxData} from '@/lib/inbox';
const deliveryLabels:Record<string,string>={PENDING:'Not sent yet',SENDING:'Sending',ACCEPTED:'Email server accepted',FAILED:'Failed to send',UNKNOWN:'Delivery uncertain',SKIPPED:'Not sent · access changed'};
export function Inbox({initial,selectedId,initialChoice}:{initial:InboxData;selectedId?:string;initialChoice?:string}){
 const [data,setData]=useState(initial),[selected,setSelected]=useState(selectedId??''),[choice,setChoice]=useState(initialChoice==='YES'||initialChoice==='NO'?initialChoice:''),[search,setSearch]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const [composeVersion,setComposeVersion]=useState(0),[pending,setPending]=useState<Record<string,unknown>|null>(null);
 const running=useRef(false),heading=useRef<HTMLHeadingElement>(null),storageKey=`spy-inbox:${initial.actorId}:${initial.eventId}`;
 useEffect(()=>{try{const saved=sessionStorage.getItem(storageKey);if(saved){const value=JSON.parse(saved);if(value&&typeof value.requestKey==='string')setPending(value);}}catch{}},[storageKey]);
 async function refresh(){const r=await fetch(`/api/events/${data.eventId}/inbox`,{cache:'no-store',signal:timeoutSignal(10000)});if(!r.ok)throw new Error('Unable to refresh inbox. Try again.');setData(await r.json());}
 useEffect(()=>{const timer=setInterval(()=>{if(document.visibilityState==='visible'&&!running.current)void refresh().catch(()=>{});},15000);return()=>clearInterval(timer);},[data.eventId]);
 async function action(input:Record<string,unknown>){
  if(running.current)return;running.current=true;setBusy(true);setError('');setNotice('');
  const command=pending??{...input,requestKey:crypto.randomUUID()};
  try{
   sessionStorage.setItem(storageKey,JSON.stringify(command));setPending(command);
   const r=await fetch(`/api/events/${data.eventId}/inbox`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(command),signal:timeoutSignal(45000)}),result=await r.json();
   if(!r.ok){if(r.status<500){sessionStorage.removeItem(storageKey);setPending(null);}throw new Error(result.error??'Unable to confirm. Refresh before retrying.');}
   sessionStorage.removeItem(storageKey);setPending(null);setNotice(result.message);setChoice('');setSelected(result.id);if(command.operation==='send')setComposeVersion(v=>v+1);
   await refresh();
  }catch(e){setError(e instanceof Error?e.message:'Connection lost. Retry the saved action to check whether it was recorded.');}
  finally{running.current=false;setBusy(false);}
 }
 const current=data.messages.find(m=>m.id===selected),visible=data.messages.filter(m=>(m.subject+' '+m.recipientName).toLowerCase().includes(search.toLowerCase())),disabled=busy||data.blocked||!!pending;
 function open(id:string){setSelected(id);setChoice('');setNotice('');requestAnimationFrame(()=>heading.current?.focus());}
 return <div className="inbox-workspace">
  {data.blocked&&<p className="notice">This event is paused or archived. You can read messages; sending and responses are closed.</p>}
  {error&&<p role="alert" className="inbox-error">{error}</p>}{notice&&<p role="status" className="inbox-success">{notice}</p>}
  {pending&&<div className="inbox-pending"><p>An action is waiting for confirmation.</p><button disabled={busy} onClick={()=>void action(pending)}>{busy?'Confirming…':'Retry saved action'}</button></div>}
  {data.organizer&&<InboxCompose key={composeVersion} data={data} disabled={disabled} onSend={action}/>}
  <div className={`inbox-layout${current?' has-message':''}`}><section className="inbox-list" aria-label="Messages"><div className="inbox-list-heading"><h2>{data.organizer?'Sent offers':'Messages'}</h2><button className="secondary" disabled={busy} onClick={()=>void refresh().catch(e=>setError(e.message))}>Refresh</button></div>{data.messages.length>0&&<label className="inbox-search">Search messages<input type="search" value={search} onChange={e=>setSearch(e.target.value)}/></label>}
   {!visible.length&&<p className="inbox-empty">{search?'No messages match your search.':data.organizer?'No offers sent yet.':'No messages yet.'}</p>}
   <div className="inbox-message-list">{visible.map(m=><button key={m.id} className={`inbox-message-row${selected===m.id?' selected':''}`} aria-pressed={selected===m.id} onClick={()=>open(m.id)}><SpyIcon name="mail"/><span><strong>{m.subject}</strong><small>{data.organizer?m.recipientName:m.senderName}</small></span><span className={`inbox-answer ${m.response==='YES'?'accepted':m.response==='NO'?'declined':'waiting'}`}>{m.response==='YES'?'Accepted':m.response==='NO'?'Declined':'Awaiting answer'}</span></button>)}</div>
  </section>
  {current?<section className="inbox-detail" aria-label="Message detail"><button className="secondary inbox-back" onClick={()=>{setSelected('');setChoice('');}}>← Messages</button><header><h2 ref={heading} tabIndex={-1}>{current.subject}</h2><p>{data.organizer?`To ${current.recipientName}`:`From ${current.senderName}`}</p><time suppressHydrationWarning>{new Date(current.createdAt).toLocaleString()}</time></header><p className="inbox-message-body">{current.body}</p><InboxAttachments files={current.attachments} eventId={data.eventId}/>
   {current.response?<p className={`inbox-answer-summary ${current.response==='YES'?'accepted':'declined'}`} role="status"><SpyIcon name="mission"/>{current.response==='YES'?'Offer accepted':'Offer declined'}{current.respondedAt&&<time suppressHydrationWarning>{new Date(current.respondedAt).toLocaleString()}</time>}</p>:!data.organizer?<section className="inbox-offer-action"><h3>{choice?'Confirm your answer':'Your answer'}</h3>{choice?<><p>{choice==='YES'?'Accept this offer?':'Decline this offer?'} Your answer is final.</p><div className="inbox-actions"><button disabled={disabled} onClick={()=>void action({operation:'respond',id:current.id,response:choice})}>{choice==='YES'?'Confirm acceptance':'Confirm decline'}</button><button className="secondary" disabled={busy||!!pending} onClick={()=>setChoice('')}>Back</button></div></>:<div className="inbox-actions"><button disabled={disabled} onClick={()=>setChoice('YES')}>Yes, accept</button><button className="secondary" disabled={disabled} onClick={()=>setChoice('NO')}>No, decline</button></div>}</section>:<p className="inbox-answer waiting">Awaiting participant answer</p>}
   {data.organizer&&<details className="inbox-delivery" open><summary>Email status</summary><p className="fine">Accepted means the email server accepted the message; it does not confirm delivery to the inbox or that it was read.</p>{current.deliveries.map(d=><div className="inbox-delivery-row" key={d.id}><span><strong>{d.name}</strong><small>{d.kind==='OFFER'?'Participant offer':d.kind==='COPY'?'Organizer copy':'Response notification'}</small></span><span className={d.status==='ACCEPTED'?'status-good':d.status==='FAILED'?'danger-text':''}>{deliveryLabels[d.status]??d.status}</span>{d.status==='FAILED'&&<button className="secondary" disabled={disabled} onClick={()=>void action({operation:'retry',id:d.id})}>Retry email</button>}</div>)}</details>}
  </section>:<p className="inbox-select-prompt">Select a message to read it.</p>}
  </div>
 </div>;
}

'use client';
import {useRef,useState} from 'react';
import {RoleLabel} from './RoleLabel';
import {JudgingDialog} from './JudgingScoreSheet';
import {ErrorNotice} from './ErrorNotice';
type Person={id:string;name:string;email:string;role:string;team:string|null;available:boolean;unavailable:string|null};
export function AccountSwitcher({eventId,people}:{eventId:string;people:Person[]}){
 const [search,setSearch]=useState(''),[role,setRole]=useState(''),[selected,setSelected]=useState<Person|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState('');const running=useRef(false);
 const visible=people.filter(p=>(!role||p.role===role)&&[p.name,p.email,p.team].join(' ').toLowerCase().includes(search.trim().toLowerCase()));
 async function enter(){if(!selected||running.current)return;running.current=true;setBusy(true);setError('');try{
  const response=await fetch('/api/auth/switch-account',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({eventId,membershipId:selected.id}),signal:AbortSignal.timeout(15000)});const result=await response.json();if(!response.ok)throw Error(result.error??'Unable to switch accounts.');window.location.assign(result.redirect);
 }catch(e){setError(e instanceof Error?e.message:'Unable to confirm the switch. Refresh to check your current account.');running.current=false;setBusy(false);}}
 return <div className="account-switcher"><p>Use a member’s actual account for this event. Submitted scores, votes and other actions are real.</p><div className="account-switch-filters"><label>Find an account<input type="search" value={search} placeholder="Name, email or team" onChange={e=>setSearch(e.target.value)}/></label><label>Role<select value={role} onChange={e=>setRole(e.target.value)}><option value="">All roles</option><option value="PARTICIPANT">Participants</option><option value="FACILITATOR">Facilitators &amp; judges</option><option value="ORGANIZER">Organizers</option></select></label></div>
  <div className="account-switch-list">{visible.map(p=><button type="button" className="account-switch-row" key={p.id} disabled={!p.available} onClick={()=>{setError('');setSelected(p);}}><div><strong>{p.name}</strong><small>{p.email}{p.team?' · '+p.team:''}</small></div><span><RoleLabel role={p.role}/><small>{p.unavailable??'Switch to account'}</small></span></button>)}</div>{!visible.length&&<p>No matching accounts.</p>}
  {selected&&<JudgingDialog title={`Switch to ${selected.name}?`} onClose={()=>{if(!busy)setSelected(null);}}><p><RoleLabel role={selected.role}/>{selected.team?' · '+selected.team:''}</p><p>You will use this account’s permissions in this event. Actions affect the real event data and are recorded in the audit.</p><p>Use <strong>Return to organizer</strong> when finished. Password and security changes require your own organizer account.</p>{error&&<ErrorNotice>{error}</ErrorNotice>}<div className="account-switch-actions"><button type="button" disabled={busy} onClick={()=>void enter()}>{busy?'Switching...':'Switch to account'}</button><button type="button" className="secondary" disabled={busy} onClick={()=>setSelected(null)}>Cancel</button></div></JudgingDialog>}
 </div>;
}

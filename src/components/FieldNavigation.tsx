'use client';
import {usePathname} from 'next/navigation';
import {useEffect,useState} from 'react';
import {AppLink} from './AppLink';

export function FieldNavigation({eventId}:{eventId:string}){
 const base=`/events/${eventId}`,path=usePathname();const [history,setHistory]=useState(false);
 useEffect(()=>{const read=()=>setHistory(location.hash==='#field-history');read();window.addEventListener('hashchange',read);window.addEventListener('popstate',read);return()=>{window.removeEventListener('hashchange',read);window.removeEventListener('popstate',read);};},[path]);
 const atStation=path===base||path===`${base}/field`;
 const items=[{label:'Station',href:base,active:atStation&&!history,kind:'station'},{label:'Teams',href:`${base}/people`,active:path===`${base}/people`,kind:'teams'},{label:'History',href:`${base}#field-history`,active:atStation&&history,kind:'history'}];
 return <nav className="field-bottom-nav" aria-label="Field navigation">{items.map(item=><AppLink prefetch={false} key={item.kind} href={item.href} aria-current={item.active?'page':undefined} onNavigate={()=>{setHistory(item.kind==='history');window.dispatchEvent(new CustomEvent("spy-field-panel",{detail:item.kind==='history'?'history':'work'}));if(item.kind==='station'&&atStation){window.history.replaceState(null,'',base);window.dispatchEvent(new HashChangeEvent('hashchange'));}}}><svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{item.kind==='station'?<><path d="m12 3 8 5v8l-8 5-8-5V8Z"/><path d="m8 12 3 3 5-6"/></>:item.kind==='teams'?<><circle cx="9" cy="8" r="3"/><path d="M3 21v-2a6 6 0 0 1 12 0v2M17 5a3 3 0 0 1 0 6m1 4a5 5 0 0 1 3 4v2"/></>:<><path d="M3 11a9 9 0 1 1 2 7M3 4v7h7M12 7v5l3 2"/></>}</svg><span>{item.label}</span></AppLink>)}</nav>;
}

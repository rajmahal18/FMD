'use client';
import {useScreenPreviewPath} from './ScreenPreviewContext';
import {usePathname,useSearchParams} from 'next/navigation';
import {useEffect,useState} from 'react';
import {AppLink} from './AppLink';

export function FieldNavigation({eventId,judgingEnabled=false}:{eventId:string;judgingEnabled?:boolean}){
 const base=`/events/${eventId}`,actualPath=usePathname(),query=useSearchParams(),previewPath=useScreenPreviewPath(),path=previewPath??actualPath;const [history,setHistory]=useState(false),[progress,setProgress]=useState(false);
 useEffect(()=>{const read=()=>{setHistory(location.hash==='#field-history');setProgress(location.hash==='#team-progress');};read();window.addEventListener('hashchange',read);window.addEventListener('popstate',read);return()=>{window.removeEventListener('hashchange',read);window.removeEventListener('popstate',read);};},[path]);
 const atStation=path===base||path===`${base}/field`;
 const items=[...(judgingEnabled?[{label:'Judge',href:`${base}/judging`,active:path===`${base}/judging`&&query.get('view')!=='results',kind:'judge'}]:[]),{label:'Station',href:`${base}/field`,active:atStation&&!history&&!progress,kind:'station'},{label:'Progress',href:`${base}/field#team-progress`,active:atStation&&progress,kind:'teams'},{label:'History',href:`${base}/field#field-history`,active:atStation&&history,kind:'history'}];
 return <nav className="field-bottom-nav" aria-label="Field navigation">{items.map(item=><AppLink prefetch={false} key={item.kind} href={item.href} aria-current={item.active?'page':undefined} onNavigate={()=>{if(item.kind==='judge')return;setHistory(item.kind==='history');setProgress(item.kind==='teams');window.dispatchEvent(new CustomEvent("spy-field-panel",{detail:item.kind==='history'?'history':item.kind==='teams'?'progress':'work'}));if(item.kind==='station'&&atStation){window.history.replaceState(null,'',`${base}/field`);window.dispatchEvent(new HashChangeEvent('hashchange'));}}}><svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{item.kind==='judge'?<path d="M4 21h16M8 17l9-9-4-4-9 9 4 4Zm2-10 7 7M3 18l3 3"/>:item.kind==='station'?<><path d="m12 3 8 5v8l-8 5-8-5V8Z"/><path d="m8 12 3 3 5-6"/></>:item.kind==='teams'?<><circle cx="9" cy="8" r="3"/><path d="M3 21v-2a6 6 0 0 1 12 0v2M17 5a3 3 0 0 1 0 6m1 4a5 5 0 0 1 3 4v2"/></>:<><path d="M3 11a9 9 0 1 1 2 7M3 4v7h7M12 7v5l3 2"/></>}</svg><span>{item.label}</span></AppLink>)}</nav>;
}

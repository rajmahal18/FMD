'use client';
import {createContext,useContext,useEffect,useId,useState,type ReactNode} from 'react';
import {usePathname} from 'next/navigation';
type Status='checking'|'off'|'requesting'|'active'|'released'|'blocked'|'unsupported';
const Context=createContext<{enabled:boolean;status:Status;toggle:()=>void;retry:()=>void}|null>(null);
const preference='spy-screen-awake';
export function ScreenAwakeProvider({children}:{children:ReactNode}){
 const path=usePathname(),eventScreen=path.startsWith('/events/')||path.startsWith('/account/')||path==='/workspace';
 const [enabled,setEnabled]=useState(true),[ready,setReady]=useState(false),[status,setStatus]=useState<Status>('checking'),[attempt,setAttempt]=useState(0);
 useEffect(()=>{try{setEnabled(localStorage.getItem(preference)!=='off');}catch{}setReady(true);},[]);
 useEffect(()=>{
  if(!ready)return;
  if(!eventScreen||!enabled){setStatus('off');return;}
  if(!window.isSecureContext||!navigator.wakeLock?.request){setStatus('unsupported');return;}
  let lock:WakeLockSentinel|null=null,pending=false,disposed=false,generation=0;
  const release=()=>{generation++;const current=lock;lock=null;if(current&&!current.released)void current.release().catch(()=>{});};
  const acquire=async()=>{
   if(disposed||pending||document.visibilityState!=='visible'||lock&&!lock.released)return;
   pending=true;const currentGeneration=generation;setStatus('requesting');
   try{
    const current=await navigator.wakeLock.request('screen');
    if(disposed||currentGeneration!==generation||document.visibilityState!=='visible'){await current.release();return;}
    lock=current;setStatus('active');
    current.addEventListener('release',()=>{if(lock===current){lock=null;if(!disposed)setStatus('released');}},{once:true});
   }catch{if(!disposed&&currentGeneration===generation)setStatus('blocked');}
   finally{pending=false;if(!disposed&&currentGeneration!==generation&&document.visibilityState==='visible')void acquire();}
  };
  const visibility=()=>{if(document.visibilityState==='visible')void acquire();else{release();setStatus('released');}};
  const pageHide=()=>{release();};const pageShow=()=>{void acquire();};
  document.addEventListener('visibilitychange',visibility);window.addEventListener('pagehide',pageHide);window.addEventListener('pageshow',pageShow);void acquire();
  return()=>{disposed=true;release();document.removeEventListener('visibilitychange',visibility);window.removeEventListener('pagehide',pageHide);window.removeEventListener('pageshow',pageShow);};
 },[ready,enabled,eventScreen,attempt]);
 function toggle(){const next=!enabled;setEnabled(next);try{localStorage.setItem(preference,next?'on':'off');}catch{}}
 return <Context.Provider value={{enabled,status,toggle,retry:()=>setAttempt(n=>n+1)}}>{children}</Context.Provider>;
}
export function ScreenAwakeControl(){
 const value=useContext(Context),id=useId();if(!value)return null;
 const {enabled,status,toggle,retry}=value;const unavailable=status==='unsupported';
 const message=status==='active'?'Screen is staying awake while this page is visible.':status==='unsupported'?'Unavailable in this browser. Use your phone’s display settings.':status==='blocked'?'Phone or browser declined. You can retry or use display settings.':status==='released'?'Screen lock released. It resumes when you return; you can also retry.':status==='off'?'Using your phone’s normal screen timeout.':status==='requesting'?'Requesting screen awake…':'Checking browser support…';
 return <div className="screen-awake-control"><button type="button" className="screen-awake-switch" role="switch" aria-checked={enabled&&!unavailable} aria-describedby={id} disabled={unavailable||status==='checking'} onClick={toggle}><span>Keep screen awake</span><strong>{unavailable?'Unavailable':!enabled?'Off':status==='active'?'On':status==='requesting'?'Starting':status==='released'?'Paused':status==='blocked'?'Blocked':'Checking'}</strong></button><small id={id} role="status">{message}</small>{enabled&&['blocked','released'].includes(status)&&<button className="secondary screen-awake-retry" type="button" onClick={retry}>Retry screen awake</button>}</div>;
}

'use client';
import {useEffect,useState} from 'react';
import {usePathname,useRouter,useSearchParams} from 'next/navigation';
export function useJudgingNavigation(eventId:string|undefined,enabled:boolean,initial:{focused:boolean;judgingEnabled:boolean}){
 const [status,setStatus]=useState(initial),path=usePathname(),query=useSearchParams(),router=useRouter();
 useEffect(()=>setStatus(initial),[initial.focused,initial.judgingEnabled]);
 useEffect(()=>{
  if(!eventId||!enabled)return;
  let disposed=false,busy=false;const controller=new AbortController();
  const refresh=async()=>{if(busy||document.visibilityState!=='visible')return;busy=true;try{const response=await fetch(`/api/events/${eventId}/judging-focus`,{cache:'no-store',signal:AbortSignal.any([controller.signal,AbortSignal.timeout(10000)])});if(response.ok){const next=await response.json();if(!disposed&&typeof next.focused==='boolean'&&typeof next.judgingEnabled==='boolean')setStatus(next);}}catch{}finally{busy=false;}};
  void refresh();const timer=setInterval(()=>void refresh(),10000);
  window.addEventListener('focus',refresh);document.addEventListener('visibilitychange',refresh);window.addEventListener('results-changed',refresh);
  return()=>{disposed=true;controller.abort();clearInterval(timer);window.removeEventListener('focus',refresh);document.removeEventListener('visibilitychange',refresh);window.removeEventListener('results-changed',refresh);};
 },[eventId,enabled]);
 const offScoring=enabled&&!!eventId&&status.focused&&path!==`/events/${eventId}/inbox`&&(path!==`/events/${eventId}/judging`||query.get('view')==='results');
 useEffect(()=>{if(offScoring)router.replace(`/events/${eventId}/judging`);},[offScoring,eventId,router]);
 return {...status,offScoring};
}

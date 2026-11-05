'use client';
import {useEffect,useRef} from 'react';
import {useRouter} from 'next/navigation';
export function FieldArrivalFocus({eventId,enabled}:{eventId:string;enabled:boolean}){
 const router=useRouter(),seen=useRef(new Set<string>());
 useEffect(()=>{
  if(!enabled)return;
  let disposed=false,busy=false;const controller=new AbortController();
  const refresh=async()=>{if(busy||document.visibilityState!=='visible')return;busy=true;try{
   const response=await fetch(`/api/events/${eventId}/field-arrivals`,{cache:'no-store',signal:AbortSignal.any([controller.signal,AbortSignal.timeout(10000)])});if(!response.ok)return;
   const body=await response.json() as {runRevision:number;arrivals:{id:string;stationId:string;arrivalAt:string|null;startedAt:string|null}[]};if(disposed)return;
   const key=`spy-arrival-focus:${eventId}:${body.runRevision}`;try{for(const id of JSON.parse(sessionStorage.getItem(key)??'[]'))seen.current.add(id);}catch{}
   const fresh=body.arrivals.filter(v=>!seen.current.has(`${v.id}:${v.startedAt??v.arrivalAt}`));
   if(!fresh.length||document.querySelector('[data-result-dirty="true"],dialog[open]'))return;
   const next=fresh[0];for(const v of fresh)seen.current.add(`${v.id}:${v.startedAt??v.arrivalAt}`);
   try{sessionStorage.setItem(key,JSON.stringify([...seen.current].slice(-1000)));}catch{}
   router.replace(`/events/${eventId}/field?stationId=${encodeURIComponent(next.stationId)}&visitId=${encodeURIComponent(next.id)}`);
  }catch{}finally{busy=false;}};
  void refresh();const timer=setInterval(()=>void refresh(),3000);window.addEventListener('focus',refresh);document.addEventListener('visibilitychange',refresh);
  return()=>{disposed=true;controller.abort();clearInterval(timer);window.removeEventListener('focus',refresh);document.removeEventListener('visibilitychange',refresh);};
 },[eventId,enabled,router]);
 return null;
}

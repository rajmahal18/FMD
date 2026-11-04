'use client';
import Link from 'next/link';
import {useEffect,useState} from 'react';
import {audienceStatus,type ResultCenterData} from '@/lib/result-sharing';
export function ResultAudience({initial,resultKey}:{initial:ResultCenterData;resultKey:string}){
 const [data,setData]=useState(initial),[error,setError]=useState(false);
 useEffect(()=>{let alive=true;const refresh=async()=>{try{const r=await fetch(`/api/events/${initial.eventId}/result-sharing`,{cache:'no-store',signal:AbortSignal.timeout(15000)});if(!r.ok)throw Error();const next=await r.json();if(alive){setData(next);setError(false);}}catch{if(alive)setError(true);}};const timer=setInterval(()=>{if(document.visibilityState==='visible')void refresh();},10000);window.addEventListener('results-changed',refresh);return()=>{alive=false;clearInterval(timer);window.removeEventListener('results-changed',refresh);};},[initial.eventId]);
 const item=data.items.find(r=>r.key===resultKey);
 return <div className="result-context"><Link href={`/events/${data.eventId}/results`}>← All results</Link>{data.organizer&&item&&<><div className="result-audiences"><span>Participants <strong className={item.participants==='HIDDEN'?'is-hidden':'is-visible'}>{audienceStatus(item.participants)}</strong></span><span>Facilitators <strong className={item.facilitators==='HIDDEN'?'is-hidden':'is-visible'}>{audienceStatus(item.facilitators)}</strong></span></div><Link className="text-action" href={`/events/${data.eventId}/results?share=${encodeURIComponent(resultKey)}`}>Manage sharing</Link>{error&&<span role="status">Sharing status could not refresh.</span>}</>}</div>;
}

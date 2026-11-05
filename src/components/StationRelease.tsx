'use client';
import {useEffect,useRef,useState} from 'react';
export function StationRelease({releaseAt,checkedAt,onRelease}:{releaseAt:string;checkedAt:string;onRelease:()=>void}){
 const [remaining,setRemaining]=useState(5),callback=useRef(onRelease);callback.current=onRelease;
 useEffect(()=>{const server=Date.parse(checkedAt),local=Date.now();let refreshed=0;const tick=()=>{const now=server+Date.now()-local,seconds=Math.max(0,Math.ceil((Date.parse(releaseAt)-now)/1000));setRemaining(seconds);if(!seconds&&Date.now()-refreshed>1000){refreshed=Date.now();callback.current();}};tick();const timer=setInterval(tick,250);return()=>clearInterval(timer);},[releaseAt,checkedAt]);
 return <div className="notice station-release" role="status"><strong>Result confirmed</strong><p>{remaining?`Squad releases in ${remaining} ${remaining===1?'second':'seconds'}.`:'Release ready. Updating station progress...'}</p><p>Scores and penalties are locked.</p></div>;
}

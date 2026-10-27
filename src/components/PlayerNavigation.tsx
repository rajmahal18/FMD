"use client";
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {useEffect,useRef,useState} from 'react';

function Icon({kind}:{kind:'contact'|'mission'|'ranks'|'voting'|'profile'}){
 if(kind==='voting')return <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="m9 3 8 4-4 8-8-4Z"/><path d="m9 8 2 2 3-3M5 14H3v7h18v-7h-4"/></svg>;
 if(kind==='profile')return <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/></svg>;
 return <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{kind==='contact'?<><path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h2v2h-2zM20 14v6h-6"/></>:kind==='mission'?<><path d="m12 3 8 5v8l-8 5-8-5V8Z"/><path d="m8 12 3 3 5-6"/></>:<><path d="M4 20h16M7 16v-5M12 16V4M17 16V8"/></>}</svg>;
}
export function PlayerNavigation({eventId}:{eventId:string}){
 const base=`/events/${eventId}`,path=usePathname();
 const [open,setOpen]=useState(false);
 const ranks=useRef<HTMLDivElement>(null),trigger=useRef<HTMLButtonElement>(null);
 const mission=path===base||path===`${base}/check-in`,contact=path===`${base}/contact`,ranked=path===`${base}/results`||path===`${base}/overall`;
 useEffect(()=>{setOpen(false);},[path]);
 useEffect(()=>{
  if(!open)return;
  function outside(e:PointerEvent){if(!ranks.current?.contains(e.target as Node))setOpen(false);}
  function escape(e:KeyboardEvent){if(e.key==='Escape'){setOpen(false);trigger.current?.focus();}}
  document.addEventListener('pointerdown',outside);document.addEventListener('keydown',escape);
  return ()=>{document.removeEventListener('pointerdown',outside);document.removeEventListener('keydown',escape);};
 },[open]);
 return <nav className="player-bottom-nav" aria-label="Event navigation"><div className="player-bottom-inner">
  <Link prefetch={false} href={`${base}/voting`} className={`player-bottom-item${path===`${base}/voting`?' active':''}`} aria-current={path===`${base}/voting`?'page':undefined}><Icon kind="voting"/><span>Voting</span></Link>
  <Link prefetch={false} href={`${base}/contact`} className={`player-bottom-item${contact?' active':''}`} aria-current={contact?'page':undefined}><Icon kind="contact"/><span>Contact</span></Link>
  <Link prefetch={false} href={base} className={`player-bottom-item player-mission-link${mission?' active':''}`} aria-current={mission?'page':undefined}><span className="player-mission-icon"><Icon kind="mission"/></span><span>Spy Chase</span></Link>
  <div className="player-ranks" ref={ranks} onBlur={e=>{if(!e.currentTarget.contains(e.relatedTarget as Node|null))setOpen(false);}}>
   <button ref={trigger} type="button" className={`player-bottom-item${ranked?' active':''}`} aria-expanded={open} aria-controls="player-ranks-options" onClick={()=>setOpen(!open)}><Icon kind="ranks"/><span>Ranks <span aria-hidden="true">▴</span></span></button>
   {open&&<div id="player-ranks-options" className="player-ranks-options"><Link prefetch={false} href={`${base}/results`} aria-current={path===`${base}/results`?'page':undefined} onClick={()=>setOpen(false)}>Race results</Link><Link prefetch={false} href={`${base}/overall`} aria-current={path===`${base}/overall`?'page':undefined} onClick={()=>setOpen(false)}>Overall ranking</Link></div>}
  </div>
  <Link prefetch={false} href={`${base}/agents/me`} className={`player-bottom-item${path===`${base}/agents/me`?' active':''}`} aria-current={path===`${base}/agents/me`?'page':undefined}><Icon kind="profile"/><span>Profile</span></Link>
 </div></nav>;
}

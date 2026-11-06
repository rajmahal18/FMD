'use client';
import {useEffect,useRef,useState,type RefObject} from 'react';

export function ProjectorControls({target}:{target:RefObject<HTMLElement|null>}){
 const [fullscreen,setFullscreen]=useState(false),[supported,setSupported]=useState(false),[visible,setVisible]=useState(true),[error,setError]=useState('');
 const hide=useRef<ReturnType<typeof setTimeout>|null>(null);
 useEffect(()=>{setSupported(!!document.fullscreenEnabled&&typeof target.current?.requestFullscreen==='function');const changed=()=>{setFullscreen(document.fullscreenElement===target.current);setError('');};document.addEventListener('fullscreenchange',changed);return()=>document.removeEventListener('fullscreenchange',changed);},[target]);
 useEffect(()=>{
  const show=()=>{setVisible(true);if(hide.current)clearTimeout(hide.current);if(fullscreen)hide.current=setTimeout(()=>setVisible(false),3000);};
  show();window.addEventListener('pointermove',show);window.addEventListener('pointerdown',show);window.addEventListener('keydown',show);
  return()=>{if(hide.current)clearTimeout(hide.current);window.removeEventListener('pointermove',show);window.removeEventListener('pointerdown',show);window.removeEventListener('keydown',show);};
 },[fullscreen]);
 useEffect(()=>{const element=target.current;if(!element)return;element.dataset.presenting=String(fullscreen);element.dataset.controls=visible?'visible':'hidden';return()=>{delete element.dataset.presenting;delete element.dataset.controls;};},[target,fullscreen,visible]);
 async function toggle(){try{if(document.fullscreenElement===target.current)await document.exitFullscreen();else await target.current?.requestFullscreen();}catch{setError('Fullscreen unavailable. Use your browser\'s fullscreen option (F11 on Windows).');setVisible(true);}}
 return <div className={`display-controls${fullscreen&&!visible?' controls-hidden':''}`} onFocus={()=>setVisible(true)}>
 <button type="button" className="display-fullscreen" data-presentation-control="fullscreen" disabled={!supported} aria-pressed={fullscreen} onClick={e=>{if(e.detail>0)e.currentTarget.blur();void toggle();}}>
 <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">{fullscreen?<path d="M3 9h6V3m12 6h-6V3M3 15h6v6m12-6h-6v6"/>:<path d="M9 3H3v6m12-6h6v6M3 15v6h6m12-6v6h-6"/>}</svg>{fullscreen?'Exit fullscreen':'Enter fullscreen'}</button>
 {!supported&&<p className="display-fullscreen-hint">Use your browser&apos;s fullscreen option.</p>}{error&&<p role="alert" className="display-fullscreen-hint">{error}</p>}</div>;
}

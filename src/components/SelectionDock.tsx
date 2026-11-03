'use client';

import {useEffect,useRef,useState,type ReactNode,type RefObject} from 'react';
import {createPortal} from 'react-dom';

/** Keep selection actions in the viewport, outside animated/overflowing ancestors. */
export function SelectionDock({anchor,children}:{anchor:RefObject<HTMLElement|null>;children:ReactNode}){
 const bar=useRef<HTMLDivElement>(null);
 const [position,setPosition]=useState<{left:number;width:number;bottom:number;visible:boolean}|null>(null);
 const [height,setHeight]=useState(0);
 useEffect(()=>{
  let frame=0;
  const measure=()=>{
   const element=anchor.current;if(!element)return;
   const rect=element.getBoundingClientRect();
   const dock=element.closest('.player-shell')?.querySelector('.player-bottom-nav,.field-bottom-nav');
   const bottom=dock&&getComputedStyle(dock).position==='fixed'?innerHeight-dock.getBoundingClientRect().top+8:16;
   const next={left:rect.left,width:rect.width,bottom,visible:!!element.getClientRects().length&&rect.top<innerHeight-bottom&&rect.bottom>80};
   setPosition(old=>old&&Object.keys(next).every(key=>old[key as keyof typeof old]===next[key as keyof typeof next])?old:next);
  };
  const update=()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(measure);};
  const observer=new ResizeObserver(update);if(anchor.current)observer.observe(anchor.current);
  window.addEventListener('scroll',update,{passive:true});window.addEventListener('resize',update);measure();
  return()=>{cancelAnimationFrame(frame);observer.disconnect();window.removeEventListener('scroll',update);window.removeEventListener('resize',update);};
 },[anchor]);
 useEffect(()=>{
  const element=bar.current;if(!element)return;
  const observer=new ResizeObserver(()=>setHeight(element.getBoundingClientRect().height));observer.observe(element);
  return()=>observer.disconnect();
 },[position?.visible]);
 return <><div className="selection-dock-space" aria-hidden="true" style={{height:height?height+16:0}}/>{position?.visible&&createPortal(<div ref={bar} className="player-selection-bar" style={{left:position.left,width:position.width,bottom:position.bottom}}>{children}</div>,document.body)}</>;
}

'use client';
import {useEffect,useRef,type ReactNode} from 'react';
import {usePathname} from 'next/navigation';

export function ControllerAccount({children}:{children:ReactNode}){
 const menu=useRef<HTMLDetailsElement>(null);const path=usePathname();
 useEffect(()=>{if(menu.current)menu.current.open=false;},[path]);
 useEffect(()=>{
  const outside=(event:PointerEvent)=>{if(menu.current&&!menu.current.contains(event.target as Node))menu.current.open=false;};
  const escape=(event:KeyboardEvent)=>{if(event.key==='Escape'&&menu.current?.open){menu.current.open=false;menu.current.querySelector('summary')?.focus();}};
  document.addEventListener('pointerdown',outside);document.addEventListener('keydown',escape);
  return()=>{document.removeEventListener('pointerdown',outside);document.removeEventListener('keydown',escape);};
 },[]);
 return <details ref={menu} className="player-account" onClick={event=>{if((event.target as HTMLElement).closest('a')&&menu.current)menu.current.open=false;}}>{children}</details>;
}

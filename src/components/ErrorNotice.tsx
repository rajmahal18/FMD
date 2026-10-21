'use client';
import {createContext,useCallback,useContext,useEffect,useId,useRef,useState,type ReactNode} from 'react';

type Notice={id:string;message:string};
type Notices={report:(id:string,message:string)=>void;remove:(id:string)=>void};
const ErrorNotices=createContext<Notices|null>(null);

export function ErrorModalProvider({children}:{children:ReactNode}){
 const [notices,setNotices]=useState<Notice[]>([]);const dialog=useRef<HTMLDialogElement>(null);const close=useRef<HTMLButtonElement>(null);
 const lastTrigger=useRef<HTMLElement|null>(null);const returnFocus=useRef<HTMLElement|null>(null);
 const title=useId(),description=useId();const active=notices[0];
 const report=useCallback((id:string,message:string)=>setNotices(current=>{
  const existing=current.find(n=>n.id===id);if(existing?.message===message)return current;
  return existing?current.map(n=>n.id===id?{id,message}:n):[...current,{id,message}];
 }),[]);
 const remove=useCallback((id:string)=>setNotices(current=>current.filter(n=>n.id!==id)),[]);
 const dismiss=()=>{if(active)remove(active.id);};
 useEffect(()=>{
  // Form fieldsets disable while submitting, which can move focus to the body
  // before an error arrives. Remember the focused control before that happens.
  const capture=(event:SubmitEvent)=>{const focused=document.activeElement;lastTrigger.current=focused instanceof HTMLElement&&focused!==document.body?focused:event.submitter;};
  document.addEventListener('submit',capture,true);return()=>document.removeEventListener('submit',capture,true);
 },[]);
 useEffect(()=>{
  const element=dialog.current;if(!element)return;
  if(active){if(!element.open){const focused=document.activeElement;returnFocus.current=focused instanceof HTMLElement&&focused!==document.body?focused:lastTrigger.current;element.showModal();}close.current?.focus();}
  else if(element.open){element.close();if(returnFocus.current?.isConnected)returnFocus.current.focus();returnFocus.current=null;}
 },[active]);
 const open=!!active;
 useEffect(()=>{if(!open)return;const previous=document.body.style.overflow;document.body.style.overflow='hidden';return()=>{document.body.style.overflow=previous;};},[open]);
 return <ErrorNotices.Provider value={{report,remove}}>{children}<dialog ref={dialog} className="error-modal" role="alertdialog" aria-modal="true" aria-labelledby={title} aria-describedby={description} onCancel={e=>{e.preventDefault();dismiss();}}>
  <div className="error-modal-heading"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 3 2 21h20L12 3Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/><path d="M12 9v5m0 3v1" stroke="currentColor" strokeWidth="2"/></svg><h2 id={title}>Error notice</h2></div>
  <p id={description} aria-live="assertive" aria-atomic="true">{active?.message}</p><div className="error-modal-actions"><button ref={close} type="button" onClick={dismiss}>Close</button></div>
 </dialog></ErrorNotices.Provider>;
}

export function ErrorNotice({children}:{children:ReactNode}){
 const context=useContext(ErrorNotices);const id=useId();const message=typeof children==='string'?children:'';
 const report=context?.report,remove=context?.remove;
 useEffect(()=>{if(message)report?.(id,message);return()=>remove?.(id);},[id,message,report,remove]);
 return <noscript><p role="alert">{children}</p></noscript>;
}

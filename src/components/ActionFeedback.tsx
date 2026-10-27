"use client";

import {createContext,useCallback,useContext,useEffect,useId,useRef,useState,type ReactNode} from "react";

type Notice={id:string;title:string;content:ReactNode;state:"busy"|"success"|"error"|"confirm";label?:string;trigger:HTMLElement|null};
type Feedback={begin:(title:string,content?:ReactNode)=>string;finish:(id:string,title:string,content:ReactNode,error?:boolean)=>void;confirm:(message:string,label?:string)=>Promise<boolean>;close:(id:string)=>void};
const Context=createContext<Feedback|null>(null);

export function ActionFeedbackProvider({children}:{children:ReactNode}){
 const [notices,setNotices]=useState<Notice[]>([]);
 const dialog=useRef<HTMLDialogElement>(null),button=useRef<HTMLButtonElement>(null);
 const resolvers=useRef(new Map<string,(answer:boolean)=>void>());
 const heading=useId(),description=useId(),active=notices[0];
 const trigger=()=>document.activeElement instanceof HTMLElement?document.activeElement:null;
 const begin=useCallback((title:string,content:ReactNode="Please wait for confirmation.")=>{
  const id=crypto.randomUUID(),focused=trigger();setNotices(list=>[...list,{id,title,content,state:"busy",trigger:focused}]);return id;
 },[]);
 const finish=useCallback((id:string,title:string,content:ReactNode,error=false)=>setNotices(list=>list.map(n=>n.id===id?{...n,title,content,state:error?"error":"success"}:n)),[]);
 const close=useCallback((id:string)=>setNotices(list=>list.filter(n=>n.id!==id||n.state==="busy"||n.state==="confirm")),[]);
 const confirm=useCallback((message:string,label="Continue")=>new Promise<boolean>(resolve=>{
  const id=crypto.randomUUID(),focused=trigger();resolvers.current.set(id,resolve);setNotices(list=>[...list,{id,title:"Confirm action",content:message,state:"confirm",label,trigger:focused}]);
 }),[]);
 const dismiss=(answer=false)=>{
  if(!active||active.state==="busy")return;
  resolvers.current.get(active.id)?.(answer);resolvers.current.delete(active.id);
  setNotices(list=>list.filter(n=>n.id!==active.id));
  if(notices.length===1){dialog.current?.close();if(active.trigger?.isConnected)active.trigger.focus();}
 };
 useEffect(()=>{
  if(!active){dialog.current?.close();return;}
  if(!dialog.current?.open)dialog.current?.showModal();
  if(active.state==="busy")dialog.current?.focus();else button.current?.focus();
 },[active]);
 const open=!!active;
 useEffect(()=>{if(!open)return;const previous=document.body.style.overflow;document.body.style.overflow="hidden";return()=>{document.body.style.overflow=previous;};},[open]);
 useEffect(()=>()=>{for(const resolve of resolvers.current.values())resolve(false);resolvers.current.clear();},[]);
 return <Context.Provider value={{begin,finish,confirm,close}}>{children}<dialog ref={dialog} className="action-feedback-modal" aria-labelledby={heading} aria-describedby={description} tabIndex={-1} onCancel={e=>{e.preventDefault();dismiss();}}>
  <div className={`action-feedback-heading ${active?.state}`}><span aria-hidden="true">{active?.state==="busy"?<span className="action-feedback-spinner"/>:active?.state==="success"?"✓":active?.state==="error"?"!":"?"}</span><h2 id={heading}>{active?.title}</h2></div>
  <div id={description} className="action-feedback-content" role="status" aria-live="polite" aria-busy={active?.state==="busy"}>{active?.content}</div>
  <div className="action-feedback-actions">{active?.state==="confirm"?<><button ref={button} type="button" className="secondary" onClick={()=>dismiss()}>Cancel</button><button type="button" onClick={()=>dismiss(true)}>{active.label}</button></>:active?.state!=="busy"&&<button ref={button} type="button" onClick={()=>dismiss()}>Close</button>}</div>
 </dialog></Context.Provider>;
}

export function useActionFeedback(){const context=useContext(Context);if(!context)throw Error("ActionFeedbackProvider is required");return context;}

// For workspaces whose existing async handlers expose busy/message/error state.
export function ActionStatus({busy,message,error,title="Processing action"}:{busy:boolean;message:string;error:string;title?:string}){
 const {begin,finish}=useActionFeedback();const current=useRef<string|null>(null),lastError=useRef("");
 useEffect(()=>{
  if(busy&&!current.current)current.current=begin(title);
  if(!busy&&error&&error!==lastError.current&&!current.current)current.current=begin(title);
  if(!busy&&current.current){finish(current.current,error?"Action needs attention":"Action completed",error||message,!!error);current.current=null;}
  lastError.current=error;
 },[busy,message,error,title,begin,finish]);
 return null;
}

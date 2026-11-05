'use client';
import {useLayoutEffect} from 'react';
import {accountUserHeader} from '@/lib/session-cookies';
export function AccountSession({userId,name,switchId,organizerName}:{userId:string;name:string;switchId?:string;organizerName?:string}){
 useLayoutEffect(()=>{
  const identity=userId+':'+(switchId??'normal'),key='spy-active-account',original=window.fetch;
  const wrapped:typeof fetch=(input,init)=>{
   const url=new URL(input instanceof Request?input.url:String(input),location.origin),method=(init?.method??(input instanceof Request?input.method:'GET')).toUpperCase();
   if(url.origin===location.origin&&!['GET','HEAD','OPTIONS'].includes(method)){const headers=new Headers(init?.headers??(input instanceof Request?input.headers:undefined));headers.set(accountUserHeader,userId);return original(input,{...init,headers});}
   return original(input,init);
  };
  window.fetch=wrapped;
  try{localStorage.setItem(key,identity);}catch{}
  const changed=(e:StorageEvent)=>{if(e.key===key&&e.newValue&&e.newValue!==identity)location.reload();};
  const focus=()=>{try{const current=localStorage.getItem(key);if(current&&current!==identity)location.reload();}catch{}};
  window.addEventListener('storage',changed);window.addEventListener('focus',focus);
  return()=>{if(window.fetch===wrapped)window.fetch=original;window.removeEventListener('storage',changed);window.removeEventListener('focus',focus);};
 },[userId,switchId]);
 if(!switchId)return null;
 return <div className="account-switch-banner" role="status"><div><strong>Using {name}</strong><span>Real actions count · Switched by {organizerName}</span></div><form method="post" action="/api/auth/switch-account/return"><button type="submit">Return to organizer</button></form></div>;
}

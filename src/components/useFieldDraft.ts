'use client';
import {useScreenPreview} from './ScreenPreviewContext';
import {useEffect,useRef,useState} from 'react';
const prefix='spy-field-draft:';
export function clearFieldDrafts(){try{for(const key of Object.keys(sessionStorage))if(key.startsWith(prefix))sessionStorage.removeItem(key);}catch{}}

// Drafts stay in this browser tab, scoped to the actor, event, run and visit.
export function useFieldDraft<T extends Record<string,string|boolean>>(scope:string,initial:T){
 const preview=useScreenPreview();
 const initialRef=useRef(initial);const key=prefix+scope;const [value,setValue]=useState(initial);const [ready,setReady]=useState(false);
 useEffect(()=>{
  if(preview)return;
  try{
   const actor=scope.split(':')[0];for(const other of Object.keys(sessionStorage))if(other.startsWith(prefix)&&!other.startsWith(prefix+actor+':'))sessionStorage.removeItem(other);
   const raw=sessionStorage.getItem(key);if(raw&&raw.length<8000){const parsed=JSON.parse(raw);if(parsed&&Object.keys(initialRef.current).every(k=>typeof parsed[k]===typeof initialRef.current[k]))setValue(parsed);}
  }catch{}setReady(true);
 },[key,scope,preview]);
 useEffect(()=>{if(preview||!ready)return;try{if(JSON.stringify(value)===JSON.stringify(initialRef.current))sessionStorage.removeItem(key);else sessionStorage.setItem(key,JSON.stringify(value));}catch{}},[key,value,ready,preview]);
 function clear(){try{sessionStorage.removeItem(key);}catch{}setValue(initialRef.current);}
 return [value,setValue,clear] as const;
}

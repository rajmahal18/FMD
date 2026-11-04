'use client';
import {useEffect,useId,useRef,useState} from 'react';
import type {RecordTab} from './RecordTabs';
export function RecordPicker({label,items,empty='No items available.'}:{label:string;items:RecordTab[];empty?:string}){
 const [selected,setSelected]=useState(items[0]?.id),previous=useRef(items.map(i=>i.id)),id=useId(),ids=items.map(i=>i.id).join('|');
 useEffect(()=>{const next=ids.split('|'),added=next.find(i=>i&&!previous.current.includes(i));if(added)setSelected(added);previous.current=next;},[ids]);
 const active=items.some(i=>i.id===selected)?selected:items[0]?.id;
 return <div className="record-picker">{items.length>1&&<label htmlFor={id}>{label}<select id={id} value={active} onChange={e=>setSelected(e.target.value)}>{items.map(i=><option key={i.id} value={i.id}>{i.name}</option>)}</select></label>}{!items.length&&<p role="status">{empty}</p>}{items.map(i=><section key={i.id} aria-label={i.name} hidden={i.id!==active}>{i.content}</section>)}</div>;
}

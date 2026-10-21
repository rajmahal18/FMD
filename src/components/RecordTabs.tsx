'use client';
import {useEffect,useId,useRef,useState,type ReactNode} from 'react';
export type RecordTab={id:string;name:string;badge?:string;content:ReactNode};
export function RecordTabs({label,items,empty='No records yet.',search=true}:{label:string;items:RecordTab[];empty?:string;search?:boolean}){
 const [selected,setSelected]=useState<string|undefined>(items[0]?.id);const [query,setQuery]=useState('');const id=useId();const buttons=useRef(new Map<string,HTMLButtonElement>());
 const previousIds=useRef(items.map(item=>item.id));const ids=items.map(item=>item.id).join('|');
 useEffect(()=>{const next=ids.split('|');const added=next.find(key=>key&&!previousIds.current.includes(key));if(added){setSelected(added);setQuery('');}previousIds.current=next;},[ids]);
 const matches=items.filter(item=>item.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
 const active=items.some(item=>item.id===selected)?selected:matches[0]?.id;
 // Renaming a selected record must not hide its form halfway through typing.
 const visible=matches.some(item=>item.id===active)?matches:[...matches,...items.filter(item=>item.id===active)];
 function select(index:number){const item=visible[index];setSelected(item.id);buttons.current.get(item.id)?.focus();buttons.current.get(item.id)?.scrollIntoView({block:'nearest',inline:'nearest'});}
 return <div className="record-workspace">
  {search&&items.length>5&&<label className="record-search">Find {label.toLowerCase()}<input type="search" value={query} onChange={e=>{const value=e.target.value;setQuery(value);setSelected(items.find(item=>item.name.toLocaleLowerCase().includes(value.trim().toLocaleLowerCase()))?.id);}} placeholder="Search by name"/></label>}
  {!!visible.length&&<div className="record-tabs" role="tablist" aria-label={label}>{visible.map((item,index)=><button type="button" key={item.id} ref={el=>{if(el)buttons.current.set(item.id,el);else buttons.current.delete(item.id);}} role="tab" id={`${id}-tab-${item.id}`} aria-controls={`${id}-panel-${item.id}`} aria-selected={item.id===active} tabIndex={item.id===active?0:-1} onClick={()=>setSelected(item.id)} onKeyDown={e=>{let next:number|undefined;if(e.key==='ArrowRight')next=(index+1)%visible.length;if(e.key==='ArrowLeft')next=(index-1+visible.length)%visible.length;if(e.key==='Home')next=0;if(e.key==='End')next=visible.length-1;if(next!==undefined){e.preventDefault();select(next);}}}><span className="record-tab-label" title={item.name}>{item.name}</span>{item.badge&&<span className="record-tab-badge">{item.badge}</span>}</button>)}</div>}
  {!visible.length&&<p className="record-empty" role="status">{items.length?'No matching records. Change the search.':empty}</p>}
  {/* Keep every form mounted so tab/search changes preserve unsaved edits. */}
  {items.map(item=><section className="record-panel" key={item.id} role="tabpanel" id={`${id}-panel-${item.id}`} aria-labelledby={`${id}-tab-${item.id}`} hidden={item.id!==active} tabIndex={0}>{item.content}</section>)}
 </div>;
}

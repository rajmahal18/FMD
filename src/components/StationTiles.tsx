'use client';
import {useEffect,useId,useRef,useState,type ReactNode} from 'react';
import {createPortal} from 'react-dom';

export type StationTile={id:string;name:string;status:string;tone:'ready'|'busy'|'done'|'waiting'|'muted';meta:string;detail:ReactNode|((close:()=>void)=>ReactNode)};
export function StationTiles({items,label='Station status'}:{items:StationTile[];label?:string}){
 const [selected,setSelected]=useState<string|null>(null);const dialog=useRef<HTMLDialogElement>(null);const trigger=useRef<HTMLElement|null>(null);const title=useId();const item=items.find(i=>i.id===selected);
 useEffect(()=>{
  if(!item){dialog.current?.close();return;}
  const previous=document.body.style.overflow;document.body.style.overflow='hidden';dialog.current?.showModal();
  return()=>{document.body.style.overflow=previous;};
 },[item?.id]);
 function close(){dialog.current?.close();setSelected(null);trigger.current?.focus();}
 return <><ul className="station-tiles" aria-label={label}>{items.map(s=><li key={s.id}><button type="button" className={`station-tile station-tone-${s.tone}`} aria-label={`${s.name}: ${s.status}. View station details`} aria-haspopup="dialog" aria-expanded={selected===s.id} onClick={e=>{trigger.current=e.currentTarget;setSelected(s.id);}}><span className="station-tile-status"><span aria-hidden="true" className="station-status-dot"/>{s.status}</span><strong className="station-tile-name">{s.name}</strong><span className="station-tile-meta">{s.meta}</span><span className="station-tile-open">Details <span aria-hidden="true">↗</span></span></button></li>)}</ul>{!items.length&&<p>No stations to show.</p>}{selected&&typeof document!=='undefined'&&createPortal(<dialog ref={dialog} className="station-detail-modal" aria-labelledby={title} onCancel={e=>{e.preventDefault();close();}} onClose={()=>{setSelected(null);trigger.current?.focus();}} onClick={e=>{if(e.target!==e.currentTarget)return;const r=e.currentTarget.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)close();}}><header><div><p className={`station-modal-status station-tone-${item?.tone??'muted'}`}>{item?.status}</p><h2 id={title}>{item?.name??'Station details'}</h2></div><button type="button" className="station-modal-close" aria-label="Close station details" onClick={close}>×</button></header><div className="station-detail-body">{typeof item?.detail==='function'?item.detail(close):item?.detail}</div><footer><button type="button" className="secondary" onClick={close}>Close details</button></footer></dialog>,document.body)}</>;
}

'use client';
import {useRef} from 'react';

export function ControllerTabs({id,label,items,selected,onChange}:{id:string;label:string;items:{id:string;label:string;count?:number}[];selected:string;onChange:(id:string)=>void}){
 const buttons=useRef(new Map<string,HTMLButtonElement>());
 return <div className="controller-tabs" role="tablist" aria-label={label}>{items.map((item,index)=><button key={item.id} type="button" role="tab" id={`${id}-tab-${item.id}`} aria-controls={`${id}-panel-${item.id}`} aria-selected={selected===item.id} tabIndex={selected===item.id?0:-1} ref={node=>{if(node)buttons.current.set(item.id,node);else buttons.current.delete(item.id);}} onClick={()=>onChange(item.id)} onKeyDown={event=>{let next:number|undefined;if(event.key==='ArrowRight')next=(index+1)%items.length;if(event.key==='ArrowLeft')next=(index-1+items.length)%items.length;if(event.key==='Home')next=0;if(event.key==='End')next=items.length-1;if(next!==undefined){event.preventDefault();onChange(items[next].id);buttons.current.get(items[next].id)?.focus();}}}>{item.label}{item.count!==undefined&&<span className="controller-count">{item.count}</span>}</button>)}</div>;
}

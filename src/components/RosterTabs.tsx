'use client';
import {useId,useRef,useState,type ReactNode} from 'react';
type Group={id:string;name:string;color?:string;count:number;content:ReactNode};
export function RosterTabs({groups}:{groups:Group[]}){
 const [selected,setSelected]=useState(groups[0]?.id);const id=useId();const buttons=useRef<(HTMLButtonElement|null)[]>([]);
 const active=groups.some(g=>g.id===selected)?selected:groups[0]?.id;
 if(!groups.length)return <p>No teams or participants have been added.</p>;
 return <div className="team-roster"><div className="roster-tabs" role="tablist" aria-label="Teams and roster groups">{groups.map((g,i)=><button key={g.id} ref={el=>{buttons.current[i]=el;}} id={`${id}-tab-${i}`} type="button" role="tab" aria-selected={active===g.id} aria-controls={`${id}-panel-${i}`} tabIndex={active===g.id?0:-1} onClick={()=>setSelected(g.id)} onKeyDown={e=>{let n:number|undefined;if(e.key==='ArrowRight')n=(i+1)%groups.length;if(e.key==='ArrowLeft')n=(i-1+groups.length)%groups.length;if(e.key==='Home')n=0;if(e.key==='End')n=groups.length-1;if(n!==undefined){e.preventDefault();setSelected(groups[n].id);buttons.current[n]?.focus();buttons.current[n]?.scrollIntoView({block:'nearest',inline:'nearest'});}}}>{g.color&&<span className="roster-team-dot" style={{backgroundColor:g.color}} aria-hidden="true"/>}{g.name}<span className="roster-tab-count">{g.count}</span></button>)}</div>{groups.map((g,i)=><section key={g.id} id={`${id}-panel-${i}`} role="tabpanel" aria-labelledby={`${id}-tab-${i}`} hidden={active!==g.id} tabIndex={0}>{g.content}</section>)}</div>;
}

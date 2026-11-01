'use client';
import {useId,useRef,useState} from 'react';
import {programDate,programTime,type EventProgramData} from '@/lib/event-program';

export function EventProgram({program,initialDay,timezone}:{program:EventProgramData;initialDay:string;timezone:string}){
 const [selected,setSelected]=useState(initialDay);const id=useId();const tabs=useRef(new Map<string,HTMLButtonElement>());
 function select(index:number){const day=program.days[index];setSelected(day.date);tabs.current.get(day.date)?.focus();tabs.current.get(day.date)?.scrollIntoView({block:'nearest',inline:'nearest'});}
 return <div className="event-program">
  <div className="program-heading"><div className="eyebrow">MISSION SCHEDULE</div><h2>{program.title}</h2><p>{programDate(program.days[0].date,{month:'long',day:'numeric'})}–{programDate(program.days.at(-1)!.date,{month:'long',day:'numeric',year:'numeric'})}<span aria-hidden="true"> · </span>{program.theme}</p><span className="program-timezone">All times in {timezone.replaceAll('_',' ')}</span></div>
  <div className="program-tabs" role="tablist" aria-label="Program days">{program.days.map((day,index)=><button key={day.date} type="button" role="tab" id={`${id}-${day.date}-tab`} aria-controls={`${id}-${day.date}-panel`} aria-selected={selected===day.date} tabIndex={selected===day.date?0:-1} ref={el=>{if(el)tabs.current.set(day.date,el);else tabs.current.delete(day.date);}} onClick={()=>setSelected(day.date)} onKeyDown={event=>{let next:number|undefined;if(event.key==='ArrowRight')next=(index+1)%program.days.length;if(event.key==='ArrowLeft')next=(index-1+program.days.length)%program.days.length;if(event.key==='Home')next=0;if(event.key==='End')next=program.days.length-1;if(next!==undefined){event.preventDefault();select(next);}}}><span>{programDate(day.date,{month:'short',day:'numeric'})}</span><strong>{day.label}</strong></button>)}</div>
  {program.days.map(day=><section className="program-day" key={day.date} role="tabpanel" tabIndex={0} id={`${id}-${day.date}-panel`} aria-labelledby={`${id}-${day.date}-tab`} hidden={selected!==day.date}>
   <div className="program-day-heading"><h3>{programDate(day.date,{weekday:'long',month:'long',day:'numeric'})}</h3><span>{day.sections.reduce((n,s)=>n+s.items.length,0)} activities</span></div>
   {day.sections.map(section=><section key={section.id} className="program-section" aria-labelledby={`${id}-${section.id}`}><div className="program-section-heading"><h4 id={`${id}-${section.id}`}>{section.title}</h4>{section.description&&<p>{section.description}</p>}</div><ol className="program-agenda">{section.items.map(item=>{
    const time=<span className="program-item-time"><time dateTime={`${day.date}T${item.start}`}>{programTime(item.start)}</time><span aria-hidden="true">–</span><time dateTime={`${day.date}T${item.end}`}>{programTime(item.end)}</time></span>;
    const expandable=!!(item.description||item.details?.length);
    return <li key={item.id}>{expandable?<details className="program-item"><summary>{time}<span className="program-item-title">{item.title}</span><span className="program-expand" aria-hidden="true">+</span></summary><div className="program-item-details">{item.description&&<p>{item.description}</p>}{item.details&&<dl>{item.details.map(detail=><div key={detail.label}><dt>{detail.label}</dt><dd>{detail.value}</dd></div>)}</dl>}</div></details>:<div className="program-item program-item-simple">{time}<span className="program-item-title">{item.title}</span></div>}</li>;
   })}</ol></section>)}
   <p className="program-footnote">Follow organizer announcements for any schedule changes.</p>
  </section>)}
 </div>;
}

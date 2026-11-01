export type ProgramItem={id:string;start:string;end:string;title:string;description?:string;details?:{label:string;value:string}[]};
export type ProgramSection={id:string;title:string;description?:string;items:ProgramItem[]};
export type ProgramDay={date:string;label:string;sections:ProgramSection[]};
export type EventProgramData={title:string;theme:string;days:ProgramDay[]};

function record(value:unknown):value is Record<string,unknown>{return !!value&&typeof value==='object'&&!Array.isArray(value);}
function text(value:unknown,max=500):value is string{return typeof value==='string'&&value.trim().length>0&&value.length<=max;}
function optionalText(value:unknown){return value===undefined||text(value);}
export function parseEventProgram(value:unknown):EventProgramData{
 const fail=()=>{throw Error('Invalid event program.');};
 if(!record(value)||!text(value.title,160)||!text(value.theme,80)||!Array.isArray(value.days)||!value.days.length||value.days.length>14)return fail();
 let previousDate='';
 for(const day of value.days){
  if(!record(day)||!text(day.date,10)||!/^\d{4}-\d{2}-\d{2}$/.test(day.date)||!Number.isFinite(Date.parse(day.date+'T12:00:00Z'))||new Date(day.date+'T12:00:00Z').toISOString().slice(0,10)!==day.date||day.date<=previousDate||!text(day.label,80)||!Array.isArray(day.sections)||!day.sections.length||day.sections.length>10)return fail();
  previousDate=day.date;const ids=new Set<string>();let previousEnd='00:00';
  for(const section of day.sections){
   if(!record(section)||!text(section.id,80)||ids.has(section.id)||!text(section.title,120)||!optionalText(section.description)||!Array.isArray(section.items)||!section.items.length||section.items.length>40)return fail();
   ids.add(section.id);
   for(const item of section.items){
    if(!record(item)||!text(item.id,80)||ids.has(item.id)||!text(item.title,160)||!optionalText(item.description)||typeof item.start!=='string'||typeof item.end!=='string'||!/^([01]\d|2[0-3]):[0-5]\d$/.test(item.start)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(item.end)||item.end<=item.start||item.start<previousEnd)return fail();
    if(item.details!==undefined&&(!Array.isArray(item.details)||item.details.length>12||item.details.some(d=>!record(d)||!text(d.label,100)||!text(d.value))))return fail();
    ids.add(item.id);previousEnd=item.end;
   }
  }
 }
 return value as unknown as EventProgramData;
}

export function initialProgramDay(program:EventProgramData,timezone:string,now=new Date()){
 const parts=new Intl.DateTimeFormat('en-US',{timeZone:timezone,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);
 const part=(type:string)=>parts.find(p=>p.type===type)!.value;
 const today=`${part('year')}-${part('month')}-${part('day')}`;
 return program.days.find(d=>d.date===today)?.date??program.days[0].date;
}
export function programTime(time:string){const [h,m]=time.split(':').map(Number);return `${h%12||12}:${String(m).padStart(2,'0')} ${h<12?'AM':'PM'}`;}
export function programDate(date:string,options:Intl.DateTimeFormatOptions){return new Intl.DateTimeFormat('en-US',{...options,timeZone:'UTC'}).format(new Date(date+'T12:00:00Z'));}

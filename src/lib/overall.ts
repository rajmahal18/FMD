import {sharedRanks} from './results';
import {raceRules,type RaceRule} from './race-ranking';
export type ComponentEvent={id:string;name:string;weight:number;source:'MANUAL'|'SPY';credits:number[];ranks:Record<string,number>};
export type OverallConfig={events:ComponentEvent[];raceRule?:RaceRule};
export type OverallTeam={id:string;name:string;color:string;points:number;raceRank?:number|null};
export function defaultOverall(teamCount:number):OverallConfig{return {raceRule:'TIME',events:[{id:'amazing-race',name:'Amazing Race',weight:40,source:'SPY',credits:[100,90,80,70,60].slice(0,Math.max(1,teamCount)),ranks:{}}]};}
export function overallComplete(config:OverallConfig,rows:ReturnType<typeof overallStandings>){return rows.length>=2&&config.events.length>0&&weightStatus(config.events).valid&&rows.every(r=>r.contributions.every(c=>c.rank!==null));}
export const basis=(v:number)=>Math.round(v*100);
export function weightStatus(events:ComponentEvent[]){const total=events.reduce((n,e)=>n+basis(e.weight),0);return {total:total/100,valid:total===10000,message:total===10000?'Total is 100%. Event weights are complete.':total<10000?`Total is ${total/100}%. Assign another ${(10000-total)/100}%.`:`Total is ${total/100}%. Reduce weights by ${(total-10000)/100}%.`};}
export function validateOverall(value:unknown,teamIds:string[]):OverallConfig {
 const fail=(message:string):never=>{throw new Error(message);};
 if(!value||typeof value!=='object'||!Array.isArray((value as OverallConfig).events))return fail('Provide the component events.');
 const events=(value as OverallConfig).events;if(events.length>30)return fail('Use at most 30 component events.');
 const rule=(value as OverallConfig).raceRule??'POINTS';if(!Object.hasOwn(raceRules,rule))return fail('Choose a valid Amazing Race winning rule.');
 const ids=new Set<string>();let spies=0;
 const percent=(v:number)=>typeof v==='number'&&Number.isFinite(v)&&v>=0&&v<=100&&Math.abs(v*100-basis(v))<0.000001;
 for(const e of events){
 if(!e||typeof e.id!=='string'||!/^[a-zA-Z0-9-]{1,80}$/.test(e.id)||ids.has(e.id))return fail('Each component event needs a unique identifier.');ids.add(e.id);
 if(typeof e.name!=='string'||!e.name.trim()||e.name.length>120)return fail('Enter an event name of at most 120 characters.');
 if(!percent(e.weight))return fail('Weights must be between 0 and 100, with at most two decimal places.');
 if(!['MANUAL','SPY'].includes(e.source))return fail('Choose manual ranking or Spy Chase points.');if(e.source==='SPY'&&++spies>1)return fail('Use Spy Chase points in only one component event.');
 if(!Array.isArray(e.credits)||!e.credits.length||e.credits.length>100||e.credits.some(c=>!percent(c)))return fail('Enter placement credits between 0 and 100.');
 if(e.credits.some((c,i)=>i>0&&c>e.credits[i-1]))return fail('Placement credit cannot increase for a lower place.');
 if(!e.ranks||typeof e.ranks!=='object'||Array.isArray(e.ranks))return fail('Provide team placements.');
 for(const [id,rank] of Object.entries(e.ranks))if(!teamIds.includes(id)||!Number.isInteger(rank)||rank<1||rank>teamIds.length)return fail('Placements must reference current teams and valid ranks.');
 const ranks=Object.values(e.ranks).sort((a,b)=>a-b);if(e.source==='MANUAL'&&ranks.some((r,i)=>r!==(i&&r===ranks[i-1]?ranks[i-1]:i+1)))return fail('Use competition ranks: for example 1, 2, 2, 4 for a tie.');
 }
 return {raceRule:rule,events:events.map(e=>({id:e.id,name:e.name.trim(),weight:e.weight,source:e.source,credits:e.credits,ranks:e.ranks}))};
}
export function overallStandings(config:OverallConfig,teams:OverallTeam[]){
 const spy=sharedRanks([...teams].sort((a,b)=>b.points-a.points||a.name.localeCompare(b.name)).map(t=>({...t,value:t.points})));
 return sharedRanks(teams.map(t=>{const contributions=config.events.map(e=>{const rank=e.source==='SPY'?(t.raceRank===undefined?spy.find(s=>s.id===t.id)!.rank:t.raceRank):e.ranks[t.id];const credit=rank?e.credits[Math.min(rank-1,e.credits.length-1)]:null;return {eventId:e.id,rank:rank??null,credit,contribution:credit===null?null:basis(e.weight)*basis(credit)/1000000};});return {...t,contributions,value:Math.round(contributions.reduce((n,c)=>n+(c.contribution??0),0)*1000000)/1000000};}).sort((a,b)=>b.value-a.value||a.name.localeCompare(b.name)));
}

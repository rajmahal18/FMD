import {sharedRanks} from './results';
import {placementCredit} from './placement-credit';
import {raceRules,type RaceRule} from './race-ranking';
export type ComponentEvent={id:string;name:string;weight:number;source:'MANUAL'|'SPY'|'JUDGING';contestId?:string;credits:number[];ranks:Record<string,number>};
export type OverallJudgingSource={id:string;name:string;revision:number;published:boolean;rows:{id:string;rank:number|null;average:number|null;maximum:number}[];liveRows?:{id:string;rank:number|null;average:number|null;maximum:number;submitted?:number;judges?:number}[];facilitatorVisibility?:'HIDDEN'|'PUBLISHED'|'LIVE';participantVisibility?:'HIDDEN'|'PUBLISHED'|'LIVE'};
export type OverallConfig={events:ComponentEvent[];raceRule?:RaceRule};
// Explicit links can be staged while older deployed clients still use MANUAL sources.
// Reading with this version activates the link; the next save writes canonical JUDGING config.
export function resolveOverallJudging(config:OverallConfig):OverallConfig{return {...config,events:config.events.map(e=>e.source==='MANUAL'&&e.contestId?{...e,source:'JUDGING' as const,ranks:{}}:e)};}
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
 const ids=new Set<string>(),contests=new Set<string>();let spies=0;
 const percent=(v:number)=>typeof v==='number'&&Number.isFinite(v)&&v>=0&&v<=100&&Math.abs(v*100-basis(v))<0.000001;
 for(const e of events){
 if(!e||typeof e.id!=='string'||!/^[a-zA-Z0-9-]{1,80}$/.test(e.id)||ids.has(e.id))return fail('Each component event needs a unique identifier.');ids.add(e.id);
 if(typeof e.name!=='string'||!e.name.trim()||e.name.length>120)return fail('Enter an event name of at most 120 characters.');
 if(!percent(e.weight))return fail('Weights must be between 0 and 100, with at most two decimal places.');
 if(!['MANUAL','SPY','JUDGING'].includes(e.source))return fail('Choose manual placements, race results or published judging scores.');if(e.source==='JUDGING'){if(typeof e.contestId!=='string'||!e.contestId||e.contestId.length>120||contests.has(e.contestId))return fail('Choose a distinct judging contest for each judged activity.');contests.add(e.contestId);}if(e.source==='SPY'&&++spies>1)return fail('Use Spy Chase points in only one component event.');
 if(!Array.isArray(e.credits)||!e.credits.length||e.credits.length>100||e.credits.some(c=>!percent(c)))return fail('Enter placement credits between 0 and 100.');
 if(e.credits.some((c,i)=>i>0&&c>e.credits[i-1]))return fail('Placement credit cannot increase for a lower place.');
 if(!e.ranks||typeof e.ranks!=='object'||Array.isArray(e.ranks))return fail('Provide team placements.');
 for(const [id,rank] of Object.entries(e.ranks))if(!teamIds.includes(id)||!Number.isInteger(rank)||rank<1||rank>teamIds.length)return fail('Placements must reference current teams and valid ranks.');
 const ranks=Object.values(e.ranks).sort((a,b)=>a-b);if(e.source==='MANUAL'&&ranks.some((r,i)=>r!==(i&&r===ranks[i-1]?ranks[i-1]:i+1)))return fail('Use competition ranks: for example 1, 2, 2, 4 for a tie.');
 }
 return {raceRule:rule,events:events.map(e=>({id:e.id,name:e.name.trim(),weight:e.weight,source:e.source,...(e.source==='JUDGING'?{contestId:e.contestId}:{}),credits:e.credits,ranks:e.ranks}))};
}
export function overallStandings(config:OverallConfig,teams:OverallTeam[],judging:OverallJudgingSource[]=[],preview=false){
 const spy=sharedRanks([...teams].sort((a,b)=>b.points-a.points||a.name.localeCompare(b.name)).map(t=>({...t,value:t.points})));
 const judged=(e:ComponentEvent,t:OverallTeam)=>{const source=judging.find(s=>s.id===e.contestId&&(s.published||preview));const row=(source?.published?source.rows:preview?source?.liveRows:[])?.find(r=>r.id===t.id);return row&&(preview||row.rank!==null&&row.rank>0)&&row.average!==null&&Number.isFinite(row.average)&&Number.isFinite(row.maximum)&&row.maximum>0&&row.average>=0&&row.average<=row.maximum?row:null;};
 const rankFor=(e:ComponentEvent,t:OverallTeam)=>e.source==='JUDGING'?judged(e,t)?.rank??null:e.source==='SPY'?(t.raceRank===undefined?spy.find(s=>s.id===t.id)!.rank:t.raceRank):e.ranks[t.id];
 const tieSizes=new Map(config.events.map(e=>{const counts=new Map<number,number>();for(const team of teams){const rank=rankFor(e,team);if(rank)counts.set(rank,(counts.get(rank)??0)+1);}return [e.id,counts];}));
 return sharedRanks(teams.map(t=>{const contributions=config.events.map(e=>{const rank=rankFor(e,t);const score=e.source==='JUDGING'?judged(e,t):null;const credit=e.source==='JUDGING'?(score?score.average!/score.maximum*100:null):rank?placementCredit(e.credits,rank,tieSizes.get(e.id)!.get(rank)!):null;return {eventId:e.id,source:e.source,average:score?.average??null,maximum:score?.maximum??null,rank:rank??null,credit,contribution:credit===null?null:basis(e.weight)*credit/10000};});return {...t,contributions,value:Math.round(contributions.reduce((n,c)=>n+(c.contribution??0),0)*1000000)/1000000};}).sort((a,b)=>b.value-a.value||a.name.localeCompare(b.name)));
}

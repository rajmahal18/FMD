import {placementCredit} from './placement-credit';
export const stationScoring={credits:[100,90,80,70,60],regularWeight:80,finalWeight:20,successScore:100,failedScore:0} as const;
export type StationRacePolicy={credits:number[];regularWeight:number;finalWeight:number;successScore:number;failedScore:number;stationIds?:string[]};
export type StationRaceBreakdown={regularPoints:number;regularMaximum:number;regularContribution:number;finalSuccessful:boolean|null;finalContribution:number|null;completedStations:number;stationCount:number;stationScores:{stationId:string;rank:number|null;points:number|null;complete:boolean}[]};
export function rankStationRace(teams:{id:string;name:string;color?:string;stationIds:string[]}[],outcomes:{teamId:string;stationId:string;durationSeconds:number|null;timePenaltySeconds:number}[],finals:{teamId:string;successful:boolean}[],policy:StationRacePolicy={...stationScoring,credits:[...stationScoring.credits]}){
 const ids=policy.stationIds??[...new Set(teams.flatMap(t=>t.stationIds))];
 const stations=ids.map(stationId=>{
  const expected=teams.filter(t=>t.stationIds.includes(stationId));
  const rows=expected.flatMap(t=>{const o=outcomes.find(o=>o.teamId===t.id&&o.stationId===stationId);return o&&o.durationSeconds!==null?[{teamId:t.id,seconds:o.durationSeconds+o.timePenaltySeconds}]:[];}).sort((a,b)=>a.seconds-b.seconds||a.teamId.localeCompare(b.teamId));
  let rank=0;const ranked=rows.map((r,i)=>{if(i===0||r.seconds!==rows[i-1].seconds)rank=i+1;return {...r,rank};});
  return {stationId,complete:expected.length===teams.length&&rows.length===teams.length,rows:ranked.map(r=>({...r,points:placementCredit(policy.credits,r.rank,ranked.filter(t=>t.rank===r.rank).length)}))};
 });
 const maximum=ids.length*(policy.credits[0]??0),finalComplete=teams.every(t=>finals.some(f=>f.teamId===t.id));
 const scored=teams.map(t=>{
  const stationScores=stations.map(s=>{const r=s.rows.find(r=>r.teamId===t.id);return {stationId:s.stationId,rank:r?.rank??null,points:r?.points??null,complete:s.complete};});
  const regularPoints=stationScores.reduce((n,s)=>n+(s.points??0),0),final=finals.find(f=>f.teamId===t.id);
  const regularContribution=maximum?regularPoints/maximum*policy.regularWeight:0,finalContribution=final?(final.successful?policy.successScore:policy.failedScore)/100*policy.finalWeight:null;
  const pending=!ids.length||!maximum||!stations.every(s=>s.complete)||!finalComplete||!final||!ids.every(id=>t.stationIds.includes(id));
  const breakdown:StationRaceBreakdown={regularPoints,regularMaximum:maximum,regularContribution,finalSuccessful:final?.successful??null,finalContribution,completedStations:stationScores.filter(s=>s.rank!==null).length,stationCount:ids.length,stationScores};
  return {id:t.id,name:t.name,color:t.color,value:Math.round((regularContribution+(finalContribution??0))*1e9)/1e9,pending,rule:'STATION_PLACEMENTS',breakdown};
 }).sort((a,b)=>Number(a.pending)-Number(b.pending)||b.value-a.value||a.name.localeCompare(b.name));
 let rank=0;return scored.map((r,i)=>{if(!r.pending&&(i===0||r.value!==scored[i-1].value))rank=i+1;return {...r,rank:r.pending?0:rank};});
}

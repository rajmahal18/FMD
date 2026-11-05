'use client';
import type {StationTeamProgress as Team} from '@/lib/race';
import {formatSeconds} from '@/lib/time-penalties';
import {StationTiles} from './StationTiles';
import {SpyIcon,type SpyIconName} from './SpyIcon';
const status:Record<Team['status'],{label:string;icon:SpyIconName;tone:'done'|'busy'|'waiting'|'muted';meta:string}>={
 DONE:{label:'Done',icon:'mission',tone:'done',meta:'Result confirmed'},
 PLAYING:{label:'Playing',icon:'history',tone:'busy',meta:'Timer and controls ready'},
 WAITING:{label:'Waiting',icon:'people',tone:'waiting',meta:'Waiting to start'},
 REVIEW:{label:'Confirm result',icon:'vote',tone:'waiting',meta:'Finish checkout'},
 NOT_VISITED:{label:'Not yet visited',icon:'station',tone:'muted',meta:'Still to come'},
};
export function StationTeamProgress({teams,stationName,onOpenVisit}:{teams:Team[];stationName:string;onOpenVisit:(visitId:string)=>void}){
 const done=teams.filter(t=>t.status==='DONE').length;
 return <section className="team-progress station-board" aria-label={`Team progress at ${stationName}`}><div className="station-board-heading"><h2>Teams at this station</h2><strong className="team-progress-count">{done} / {teams.length} done</strong></div><progress aria-label="Teams completed at this station" max={teams.length||1} value={done}/><StationTiles label="Team progress" detailLabel="team" emptyMessage="No teams have this station on their route yet." items={teams.map(t=>{const state=status[t.status];return {id:t.id,name:t.name,status:state.label,statusIcon:<SpyIcon name={state.icon}/>,tone:state.tone,meta:t.stage==='ARRIVED'?'Lineup to confirm':t.stage==='QUEUED'?'In the waiting queue':state.meta,detail:close=><><p>{stationName}</p>{t.status==='DONE'?<><p><strong>Visit completed and result confirmed.</strong></p>{t.durationSeconds!==null&&<p>Elapsed {formatSeconds(t.durationSeconds)} + penalties {formatSeconds(t.timePenaltySeconds??0)} = <strong>{formatSeconds(t.durationSeconds+(t.timePenaltySeconds??0))}</strong></p>}{t.confirmedAt&&<p>Confirmed <time suppressHydrationWarning>{new Date(t.confirmedAt).toLocaleString()}</time></p>}</>:t.status==='NOT_VISITED'?<p>This team has not visited your station yet.</p>:<><p>{state.meta}{t.stage==='ARRIVED'?'. Confirm the playing lineup.':'.'}</p>{t.visitId&&t.stage!=='QUEUED'&&<button type="button" onClick={()=>{close();onOpenVisit(t.visitId!);}}>Open {t.status==='REVIEW'?'result review':'team controls'}</button>}{t.stage==='QUEUED'&&<p>The team must be admitted before play starts.</p>}</>}</>};})}/></section>;
}

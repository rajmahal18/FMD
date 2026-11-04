import {RoleLabel} from "./RoleLabel";
import {PersonName} from './Avatar';
import type {PlayerParticipation,ParticipationHistory} from '@/lib/participation';

export function ParticipationProgress({played,explored,history}:{played:number;explored:number;history:ParticipationHistory[]}){
 return <details className="participation-person"><summary><span className="participation-count">{played} played / {explored} explored</span></summary>{history.length?<ul className="participation-history">{history.map(station=><li key={station.stationId}><span>{station.name}</span><span className="participation-status">{station.status}</span></li>)}</ul>:<p className="fine">No station visits recorded for this team yet.</p>}</details>;
}

export function ParticipationList({players,selectedIds}:{players:PlayerParticipation[];selectedIds?:string[]}){
 return <div className="participation-list">{players.map(player=><details className="participation-person" key={player.id}>
  <summary><PersonName name={player.name} avatarUrl={player.avatarUrl}/><span className="participation-count">{player.played} played / {player.explored} explored</span>{selectedIds?.includes(player.id)&&<span className="lineup-selected">✓ Playing this station</span>}</summary>
  <div className="participation-roles">{player.isCaptain&&<RoleLabel role="Captain"/>}{player.squadRole&&<RoleLabel role={player.squadRole}/>}</div>
  {player.history.length?<ul className="participation-history">{player.history.map(station=><li key={station.stationId}><span>{station.name}</span><span className={station.status==='Played'?'status-good':'participation-status'}>{station.status}</span></li>)}</ul>:<p className="fine">Your team has not explored a station yet.</p>}
 </details>)}</div>;
}

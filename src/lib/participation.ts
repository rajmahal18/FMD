import {stationDisplayName} from "./station-name";
export type ParticipationHistory={stationId:string;name:string;status:'Played'|'Playing'|'Awaiting confirmation'|'Not selected'|'Not recorded'|'Choosing players'};
export type PlayerParticipation={id:string;name:string;avatarUrl?:string|null;squadRole:string|null;isCaptain:boolean;played:number;explored:number;history:ParticipationHistory[]};
export type ParticipationVisit={stationId:string;state:string;confirmedAt:Date|string|null;startedAt:Date|string|null;station:{name:string};outcome:unknown;players:{membershipId:string}[]};

export function participationFor(membershipId:string,visits:ParticipationVisit[]){
 const explored=visits.filter(v=>!['CANCELLED','QUEUED'].includes(v.state));
 const history:ParticipationHistory[]=explored.map(v=>{
  const selected=v.players.some(p=>p.membershipId===membershipId);
  const confirmed=v.state==='COMPLETED'&&!!v.confirmedAt&&!!v.outcome;
  const status:ParticipationHistory['status']=selected?(confirmed?'Played':v.state==='AWAITING_CONFIRMATION'?'Awaiting confirmation':v.startedAt?'Playing':'Choosing players'):v.state==='ARRIVED'?'Choosing players':v.players.length?'Not selected':'Not recorded';
  return {stationId:v.stationId,name:stationDisplayName(v.station.name),status};
 });
 return {played:history.filter(h=>h.status==='Played').length,explored:new Set(history.map(h=>h.stationId)).size,history};
}

export function validatePlayerSelection(ids:unknown,required:number|null,eligible:readonly string[]):string[]{
 if(!Array.isArray(ids)||!ids.length||ids.length>1000||ids.some(id=>typeof id!=='string'||!id||id.length>120)||new Set(ids).size!==ids.length)throw new Error('Choose distinct players from your team.');
 if(required!==null&&ids.length!==required)throw new Error(`Choose exactly ${required} players for this station.`);
 if(ids.some(id=>!eligible.includes(id)))throw new Error('A selected player is no longer an active participant on your team. Refresh the roster.');
 return [...ids];
}

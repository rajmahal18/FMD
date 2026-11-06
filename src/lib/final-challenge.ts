export type DefusalTeam={id:string;name:string;status:'WAITING'|'ALERT'|'DEFUSED'|'EXPIRED';attempts:number;defusedAt:string|null;pinConfigured?:boolean};
export type DefusalData={enabled:boolean;organizer:boolean;runRevision:number;revision:number;ready:boolean;readyTeams:number;teamCount:number;durationSeconds:number|null;startedAt:string|null;deadlineAt:string|null;endedAt:string|null;checkedAt:string;blocked:boolean;teams:DefusalTeam[]};
export function validDefusalPin(pin:unknown):pin is string{return typeof pin==='string'&&/^\d{6}$/.test(pin);}

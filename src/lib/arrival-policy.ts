export const arrivalPolicies={
 CAPTAIN_CONFIRM:{label:'Captain confirms lineup and starts timer',description:'Existing flow: scan QR, select players, confirm to start timing.'},
 PRESELECT_APPROVAL:{label:'Advance lineup · facilitator starts timer',description:'Captain may submit players before arrival. Scan at the station, then facilitator approves arrival and lineup to start timing.'},
 SCAN_APPROVAL_TIMED:{label:'QR starts timer · approve arrival before lineup',description:'Recording the QR arrival starts timing, including approval and selection. Facilitator approves arrival before the captain may submit players.'},
 ARRIVAL_LINEUP_APPROVAL:{label:'QR + lineup · facilitator starts timer',description:'Scan at the station and submit players. Timing begins only when the facilitator approves both arrival and lineup.'},
} as const;
export type ArrivalPolicy=keyof typeof arrivalPolicies;
export function arrivalPolicy(value:string|undefined):ArrivalPolicy{return value&&Object.hasOwn(arrivalPolicies,value)?value as ArrivalPolicy:'CAPTAIN_CONFIRM';}
export type FinalStationStatus={stationId:string;name:string;readyTeams:number;teamCount:number;ready:boolean;startedAt:string|null;deadlineAt:string|null;ownComplete?:boolean;ownPoints?:number};

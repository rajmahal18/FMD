export const arrivalPolicies={
 CAPTAIN_CONFIRM:{label:'Facilitator confirms lineup and starts timer',description:'Captain records arrival. The assigned facilitator selects who will not play and confirms the remaining players to start timing.'},
 PRESELECT_APPROVAL:{label:'Facilitator confirms lineup and starts timer',description:'Captain records arrival. The assigned facilitator selects who will not play and confirms the remaining players to start timing.'},
 SCAN_APPROVAL_TIMED:{label:'QR starts timer; facilitator confirms lineup',description:'Timing starts when arrival is admitted. The assigned facilitator selects who will not play and confirms the lineup without resetting the timer.'},
 ARRIVAL_LINEUP_APPROVAL:{label:'Facilitator confirms lineup and starts timer',description:'Captain records arrival. The assigned facilitator selects who will not play and confirms the remaining players to start timing.'},
} as const;
export type ArrivalPolicy=keyof typeof arrivalPolicies;
export function arrivalPolicy(value:string|undefined):ArrivalPolicy{return value&&Object.hasOwn(arrivalPolicies,value)?value as ArrivalPolicy:'CAPTAIN_CONFIRM';}
export type FinalStationStatus={stationId:string;name:string;readyTeams:number;teamCount:number;ready:boolean;startedAt:string|null;deadlineAt:string|null;ownComplete?:boolean;ownPoints?:number};

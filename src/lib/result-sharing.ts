export type SharingMode='HIDDEN'|'PUBLISHED'|'LIVE';
export type ResultItem={key:string;name:string;kind:'race'|'overall'|'judging'|'voting';status:string;approved:boolean;sourceRevision:number;sharingRevision:number;facilitators:SharingMode;participants:SharingMode;href:string;rows:{name:string;value:string}[];fingerprint:string;blocked?:string};
export type ResultCenterData={eventId:string;organizer:boolean;archived:boolean;runRevision:number;items:ResultItem[];checkedAt:string};
export type SharingPreview={token:string;key:string;name:string;facilitators:SharingMode;participants:SharingMode;previous:{facilitators:SharingMode;participants:SharingMode};rows:ResultItem['rows'];effects:string[]};
export const sharingLabels:Record<SharingMode,string>={HIDDEN:'Hidden',PUBLISHED:'Approved results',LIVE:'Live scores (includes partial)'};
export function audienceStatus(mode:SharingMode){return mode==='HIDDEN'?'Hidden':mode==='LIVE'?'Live scores':'Visible';}
export function judgingStateLabel(state:string){return ({DRAFT:'Not open',OPEN:'Scoring open',CLOSED:'Ready for review',PUBLISHED:'Approved'} as Record<string,string>)[state]??state;}

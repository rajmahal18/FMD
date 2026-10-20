export type RankedRow={rank:number;id:string;name:string;value:number;color?:string;active?:boolean;teamName?:string;pending?:boolean;challengeSeconds?:number|null;rawChallengeSeconds?:number|null;timePenaltySeconds?:number;completedAt?:number|null;rule?:string};
export type AwardSnapshot={enabled:boolean;mode:'INTERACTION'|'COMMENDATION'|null;label:string;tieRule:'SHARED'|null;rows:RankedRow[];winners:string[]};
export type ResultRevisionData={id:string;revision:number;reason:string;createdAt:string;actor:string;teams:RankedRow[];award:AwardSnapshot|null;summary:{teamCount:number;confirmedOutcomes:number;acceptedContacts:number;demo:boolean}};
export type ResultsData={eventId:string;actorId:string;eventName:string;state:string;isOrganizer:boolean;revealed:boolean;checkedAt:string;teams:RankedRow[];award:AwardSnapshot|null;latest:ResultRevisionData|null;history:{id:string;revision:number;reason:string;createdAt:string;actor:string}[]};
export type ResultsCommand={operation:'finalizeResults'|'reopenFinalResults';reason:string;requestKey?:string;previewToken?:string};
export type ResultsPreview={token:string;title:string;effects:string[]};
export function sharedRanks<T extends {value:number}>(rows:T[]){let last:number|undefined;let rank=0;return rows.map((row,index)=>{if(last===undefined||row.value!==last)rank=index+1;last=row.value;return {...row,rank};});}

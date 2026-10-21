export type LifecycleOperation='archiveEvent'|'restoreEvent'|'resetTestEvent'|'resetEventRun';
export type LifecycleCounts={votingBallots:number;timePenalties:number;visits:number;outcomes:number;scoreEntries:number;scoreCorrections:number;contactCredentials:number;contactRecords:number;announcements:number;routeChanges:number;resultRevisions:number};
export type LifecycleData={eventId:string;eventName:string;state:string;isDemo:boolean;archivedAt:string|null;archivedReason:string|null;counts:LifecycleCounts;checkedAt:string};
export type LifecycleCommand={operation:LifecycleOperation;reason:string;confirmation?:string;previewToken?:string;requestKey?:string};
export type LifecyclePreview={token:string;title:string;effects:string[]};

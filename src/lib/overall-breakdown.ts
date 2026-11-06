export type BreakdownActivity={id:string;name:string;weight:number;source:'MANUAL'|'SPY'|'JUDGING';maximum:number|null;judges:{id:string;name:string}[]};
export type BreakdownValue={id:string;judgeScores:(number|null)[];judgeSum:number|null;average:number|null;rank:number|null;credit:number|null;contribution:number|null;raceScore:number|null;submitted:number;expected:number};
export type BreakdownRow={id:string;name:string;color:string;values:BreakdownValue[];total:number;rank:number|null};
export type OverallBreakdown={visible:boolean;organizer:boolean;eventId:string;checkedAt:string;approved?:boolean;complete?:boolean;stale?:boolean;revision?:number;activities?:BreakdownActivity[];rows?:BreakdownRow[]};

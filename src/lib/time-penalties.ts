export type PenaltyPhase='DURING'|'AFTER_LIMIT';
export type TimePenaltyButton={id:string;label:string;seconds:number;phase?:PenaltyPhase};
export type TimePenaltyRecord={id:string;label:string;seconds:number;phase?:PenaltyPhase;actorName:string;createdAt:string;voidedAt:string|null;voidReason:string|null};
export function penaltyPhase(button:{phase?:string}):PenaltyPhase{return button.phase==='AFTER_LIMIT'?'AFTER_LIMIT':'DURING';}
export function penaltyPhaseLabel(button:{phase?:string}){return penaltyPhase(button)==='AFTER_LIMIT'?'After time limit':'During activity';}
export function validatePenaltyButtons(value:unknown):TimePenaltyButton[]{
 if(!Array.isArray(value)||value.length>20)throw new Error('Use at most 20 violation buttons per station.');
 const ids=new Set<string>();return value.map(b=>{
 if(!b||typeof b.id!=='string'||!/^[A-Za-z0-9-]{1,80}$/.test(b.id)||ids.has(b.id))throw new Error('Each violation button needs a unique identifier.');ids.add(b.id);
 if(typeof b.label!=='string'||!b.label.trim()||b.label.trim().length>80)throw new Error('Enter a violation label of 1 to 80 characters.');
 if(!Number.isInteger(b.seconds)||b.seconds<1||b.seconds>3600)throw new Error('Penalty time must be a whole number from 1 to 3600 seconds.');
 if(b.phase!==undefined&&!['DURING','AFTER_LIMIT'].includes(b.phase))throw new Error('Choose During activity or After time limit.');
 return {id:b.id,label:b.label.trim(),seconds:b.seconds,...(b.phase!==undefined?{phase:b.phase}:{})};
 });
}
export function adjustedSeconds(raw:number|null,penalty:number){return raw===null?null:raw+penalty;}
export function formatSeconds(value:number){return `${Math.floor(value/60)}:${String(value%60).padStart(2,'0')}`;}

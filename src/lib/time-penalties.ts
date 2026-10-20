export type TimePenaltyButton={id:string;label:string;seconds:number};
export type TimePenaltyRecord={id:string;label:string;seconds:number;actorName:string;createdAt:string;voidedAt:string|null;voidReason:string|null};
export function validatePenaltyButtons(value:unknown):TimePenaltyButton[]{
 if(!Array.isArray(value)||value.length>20)throw new Error('Use at most 20 violation buttons per station.');
 const ids=new Set<string>();return value.map(b=>{
 if(!b||typeof b.id!=='string'||!/^[A-Za-z0-9-]{1,80}$/.test(b.id)||ids.has(b.id))throw new Error('Each violation button needs a unique identifier.');ids.add(b.id);
 if(typeof b.label!=='string'||!b.label.trim()||b.label.trim().length>80)throw new Error('Enter a violation label of 1 to 80 characters.');
 if(!Number.isInteger(b.seconds)||b.seconds<1||b.seconds>3600)throw new Error('Penalty time must be a whole number from 1 to 3600 seconds.');
 return {id:b.id,label:b.label.trim(),seconds:b.seconds};
 });
}
export function adjustedSeconds(raw:number|null,penalty:number){return raw===null?null:raw+penalty;}
export function formatSeconds(value:number){return `${Math.floor(value/60)}:${String(value%60).padStart(2,'0')}`;}

import 'server-only';
import type {Prisma} from '@/generated/prisma/client';
import {InputError} from '@/lib/validation';
import {mayOperateStation} from '@/lib/policy';
import {validatePenaltyButtons,type TimePenaltyButton} from '@/lib/time-penalties';
import type {RaceCommand,RaceResult} from '@/lib/race';
type Tx=Prisma.TransactionClient;
export function publicTimePenalty(p:{id:string;label:string;seconds:number;actor:{name:string};createdAt:Date;voidedAt:Date|null;voidReason:string|null}){return {id:p.id,label:p.label,seconds:p.seconds,actorName:p.actor.name,createdAt:p.createdAt.toISOString(),voidedAt:p.voidedAt?.toISOString()??null,voidReason:p.voidReason};}
export async function penaltyTotal(tx:Tx,visitId:string){return (await tx.timePenaltyEntry.aggregate({where:{visitId,voidedAt:null},_sum:{seconds:true}}))._sum.seconds??0;}
export async function configurePenaltyButtons(tx:Tx,eventId:string,m:{role:'ORGANIZER'|'FACILITATOR'|'PARTICIPANT';assignments:{stationId:string}[];event:{state:string}},c:RaceCommand):Promise<RaceResult>{
 if(!mayOperateStation(m.role,m.assignments.some(a=>a.stationId===c.stationId)))throw new InputError('You are not assigned to this station.',403);
 if(!['PREPARING','READY','LIVE','PAUSED'].includes(m.event.state))throw new InputError('Penalty button configuration is closed for this event.',409);
 const station=await tx.station.findFirst({where:{id:c.stationId,eventId}});if(!station)throw new InputError('Station not found in this event.',404);
 if(station.timePenaltyRevision!==c.penaltyRevision)throw new InputError('Another handler changed the violation buttons. Refresh before editing again.',409);
 let buttons:TimePenaltyButton[];try{buttons=validatePenaltyButtons(c.penaltyButtons);}catch(e){throw new InputError((e as Error).message);}
 await tx.station.update({where:{id:station.id},data:{timePenaltyButtons:buttons as unknown as Prisma.InputJsonValue,timePenaltyRevision:{increment:1}}});
 return {message:'Violation buttons saved. Previously recorded penalties are unchanged.',stationName:station.name};
}
export async function recordTimePenalty(tx:Tx,actorId:string,visit:{id:string;eventId:string;teamId:string;stationId:string;state:string;station:{available:boolean;timePenaltyButtons:unknown};outcome:unknown},c:RaceCommand):Promise<RaceResult>{
 if(visit.outcome||!visit.station.available)throw new InputError('This station result is closed or unavailable.',409);
 if(c.operation==='addTimePenalty'){
 if(visit.state!=='ACTIVE')throw new InputError('Time penalties can only be added while the challenge is in progress.',409);
 const buttons=visit.station.timePenaltyButtons as TimePenaltyButton[];const button=buttons.find(b=>b.id===c.penaltyButtonId);
 if(!button||button.seconds!==c.expectedSeconds||button.label!==c.expectedLabel)throw new InputError('This violation button changed. Refresh and review it before adding a penalty.',409);
 if(await penaltyTotal(tx,visit.id)+button.seconds>86400)throw new InputError('Station time penalties cannot exceed 24 hours.',409);
 await tx.timePenaltyEntry.create({data:{eventId:visit.eventId,visitId:visit.id,teamId:visit.teamId,stationId:visit.stationId,actorId,buttonId:button.id,label:button.label,seconds:button.seconds}});
 return {message:`Added ${button.seconds} seconds: ${button.label}.`,timePenaltySeconds:await penaltyTotal(tx,visit.id)};
 }
 if(!['ACTIVE','AWAITING_CONFIRMATION'].includes(visit.state))throw new InputError('Only an unfinished challenge penalty can be voided.',409);
 const entry=await tx.timePenaltyEntry.findFirst({where:{id:c.penaltyEntryId,eventId:visit.eventId,visitId:visit.id,voidedAt:null}});
 if(!entry)throw new InputError('This penalty was already voided or belongs to another visit.',409);
 await tx.timePenaltyEntry.update({where:{id:entry.id},data:{voidedAt:new Date(),voidedById:actorId,voidReason:c.reason!.trim()}});
 return {message:`Voided ${entry.seconds} seconds: ${entry.label}. The original record remains in history.`,timePenaltySeconds:await penaltyTotal(tx,visit.id)};
}

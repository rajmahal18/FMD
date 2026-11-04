import 'server-only';
import type {Prisma} from '@/generated/prisma/client';
import {resolveOverallJudging,type OverallConfig} from '@/lib/overall';
export async function snapshotShared(tx:Pick<Prisma.TransactionClient,'resultSharing'>,eventId:string,key:string,sourceRevision:number,role:string){
 if(role==='ORGANIZER')return true;
 const row=await tx.resultSharing.findUnique({where:{eventId_key:{eventId,key}}});
 return !!row&&row.sourceRevision===sourceRevision&&(role==='FACILITATOR'?row.facilitators:row.participants)==='PUBLISHED';
}
export async function hideDependentSharing(tx:Prisma.TransactionClient,eventId:string,key:string,audiences:('facilitators'|'participants')[]){
 const overall=await tx.overallRanking.findUnique({where:{eventId},select:{config:true}});
 if(!overall)return;
 const linked=resolveOverallJudging(overall.config as OverallConfig).events.some(e=>key==='race'?e.source==='SPY':e.source==='JUDGING'&&'judging:'+e.contestId===key);
 if(!linked)return;
 for(const audience of audiences)await tx.resultSharing.updateMany({where:{eventId,key:'overall'},data:{[audience]:'HIDDEN',revision:{increment:1}}});
}

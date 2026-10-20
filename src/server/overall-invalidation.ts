import 'server-only';
import type {Prisma} from '@/generated/prisma/client';
// Called under the same event lock and transaction as the race result change.
export async function invalidateOverall(tx:Prisma.TransactionClient,eventId:string,actorId:string,reason:string){
 const record=await tx.overallRanking.findUnique({where:{eventId}});
 if(!record?.finalized)return;
 const config=record.config as {events?:{source:string}[]};
 if(!config.events?.some(e=>e.source==='SPY'))return;
 await tx.overallRanking.update({where:{eventId},data:{revision:{increment:1},finalized:{...(record.finalized as Prisma.JsonObject),stale:true,staleReason:reason}}});
 await tx.auditEntry.create({data:{eventId,actorId,action:'OVERALL_INVALIDATED',detailsJson:{reason,previousFinal:record.finalized,previousRevision:record.revision}}});
}

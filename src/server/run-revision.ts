import 'server-only';
import type {Prisma} from '@/generated/prisma/client';
import {InputError} from '@/lib/validation';

// Reset audits are retained forever and written atomically under the event lock.
// Their count is a monotonic run revision, including the legacy Demo reset.
export function runRevision(tx:Pick<Prisma.TransactionClient,'auditEntry'>,eventId:string){
 return tx.auditEntry.count({where:{eventId,action:{in:['LIFECYCLE_RESETEVENTRUN','LIFECYCLE_RESETTESTEVENT']}}});
}
export async function requireRunRevision(tx:Pick<Prisma.TransactionClient,'auditEntry'>,eventId:string,value:unknown){
 if(value!==undefined&&(!Number.isSafeInteger(value)||(value as number)<0))throw new InputError('Invalid event run revision.');
 // Existing clients/requests remain compatible until the first reset.
 if((value??0)!==await runRevision(tx,eventId))throw new InputError('This event was reset. Refresh the page before submitting a new action.',409);
}

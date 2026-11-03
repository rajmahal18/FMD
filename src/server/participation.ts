import 'server-only';
import type {Prisma} from '@/generated/prisma/client';
import {avatarUrl} from '@/lib/avatar';
import {participationFor,type PlayerParticipation} from '@/lib/participation';

// Call only after the caller has established event/team visibility.
export async function teamParticipation(tx:Prisma.TransactionClient,eventId:string,teamId:string):Promise<PlayerParticipation[]>{
 const [members,visits]=await Promise.all([
  tx.eventMembership.findMany({where:{eventId,teamId,active:true,role:'PARTICIPANT',user:{active:true}},select:{id:true,squadRole:true,isCaptain:true,user:{select:{name:true,avatarKey:true}}},orderBy:{user:{name:'asc'}}}),
  tx.stationVisit.findMany({where:{eventId,teamId},select:{stationId:true,state:true,startedAt:true,confirmedAt:true,station:{select:{name:true}},outcome:{select:{id:true}},players:{select:{membershipId:true}}},orderBy:{updatedAt:'asc'}}),
 ]);
 return members.map(m=>({id:m.id,name:m.user.name,avatarUrl:avatarUrl(m.user.avatarKey),squadRole:m.squadRole,isCaptain:m.isCaptain,...participationFor(m.id,visits)}));
}

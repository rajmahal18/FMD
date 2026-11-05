import 'server-only';
import {randomUUID} from 'node:crypto';
import {db} from '@/lib/db';
import {InputError} from '@/lib/validation';
import {avatarUploadLimit,normalizeAvatar} from '@/lib/avatar-image';
import {avatarUrl} from '@/lib/avatar';
import {passwordSetupRequired} from './password-setup';
import type {Prisma} from '@/generated/prisma/client';
async function scope(tx:Prisma.TransactionClient,actorId:string,eventId:string,membershipId:string){
 const actor=await tx.eventMembership.findUnique({where:{eventId_userId:{eventId,userId:actorId}},include:{user:{select:{active:true,mustChangePassword:true}},event:{select:{archivedAt:true}}}});
 if(!actor?.active||!actor.user.active||actor.role!=='ORGANIZER'||await passwordSetupRequired(tx,actorId,eventId,actor.user.mustChangePassword))throw new InputError('Organizer access is required.',403);
 if(actor.event.archivedAt)throw new InputError('Archived events cannot change photos.',409);
 const target=await tx.eventMembership.findFirst({where:{id:membershipId,eventId,active:true,user:{active:true}},select:{userId:true}});
 if(!target)throw new InputError('Active member not found.',404);
 return target.userId;
}
export async function changeAvatar(actorId:string,eventId:string,membershipId:string,request:Request,remove=false){
 await scope(db(),actorId,eventId,membershipId);
 let content:Uint8Array|undefined;
 if(!remove){
  const reader=request.body?.getReader(),chunks:Uint8Array[]=[];let size=0;
  if(reader)while(true){const part=await reader.read();if(part.done)break;size+=part.value.length;if(size>avatarUploadLimit){await reader.cancel();throw new InputError('Choose a photo no larger than 5 MB.',413);}chunks.push(part.value);}
  const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
  content=await normalizeAvatar(bytes);
 }
 return db().$transaction(async tx=>{
  const userId=await scope(tx,actorId,eventId,membershipId);
  await tx.$queryRaw`SELECT id FROM "User" WHERE id=${userId} FOR UPDATE`;
  const target=await tx.user.findUniqueOrThrow({where:{id:userId},select:{avatarKey:true}});
  if((request.headers.get('x-avatar-version')??'')!==(target.avatarKey??''))throw new InputError('This photo changed. Refresh before saving again.',409);
  const key=remove?null:`uploads/${randomUUID()}.webp`;
  await tx.userAvatar.deleteMany({where:{userId}});
  if(content&&key)await tx.userAvatar.create({data:{userId,key,content:new Uint8Array(content)}});
  await tx.user.update({where:{id:userId},data:{avatarKey:key}});
  await tx.auditEntry.create({data:{eventId,actorId,targetUserId:userId,action:remove?'AVATAR_REMOVED':'AVATAR_UPDATED',targetId:membershipId,detailsJson:{}}});
  return {avatarKey:key,avatarUrl:avatarUrl(key)};
 });
}

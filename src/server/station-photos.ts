import 'server-only';
import {randomUUID} from 'node:crypto';
import {db} from '@/lib/db';
import {InputError} from '@/lib/validation';
import {stationPhotoLimit,stationPhotoUrl} from '@/lib/station-photo';
import {normalizeStationPhoto} from '@/lib/station-photo-image';
import {passwordSetupRequired} from './password-setup';
import type {Prisma} from '@/generated/prisma/client';
async function scope(tx:Prisma.TransactionClient,actorId:string,eventId:string,stationId:string,write:boolean){
 const member=await tx.eventMembership.findUnique({where:{eventId_userId:{eventId,userId:actorId}},include:{user:{select:{active:true,mustChangePassword:true}},event:{select:{archivedAt:true,hideStationDetails:true}},assignments:{select:{stationId:true}},team:{select:{routeAssignment:{include:{route:{select:{eventId:true}}}}}}}});
 if(!member?.active||!member.user.active||await passwordSetupRequired(tx,actorId,eventId,member.user.mustChangePassword))throw new InputError('Active event access is required.',403);
 if(write){if(member.role!=='ORGANIZER')throw new InputError('Only organizers can change station photos.',403);if(member.event.archivedAt)throw new InputError('Archived events cannot change photos.',409);}
 else if(member.role==='FACILITATOR'&&!member.assignments.some(a=>a.stationId===stationId))throw new InputError('Station access is required.',403);
 else if(member.role==='PARTICIPANT'){
  const route=member.team?.routeAssignment;
  if(member.event.hideStationDetails||route?.route.eventId!==eventId||!Array.isArray(route.stationIds)||!route.stationIds.includes(stationId))throw new InputError('Station photo not available.',404);
 }
 const station=await tx.station.findFirst({where:{id:stationId,eventId},select:{id:true,photoKey:true}});
 if(!station)throw new InputError('Station not found.',404);
 return station;
}
export async function readStationPhoto(actorId:string,eventId:string,stationId:string,version:string|null){
 const station=await scope(db(),actorId,eventId,stationId,false);
 if(!station.photoKey||(version&&version!==station.photoKey))throw new InputError('Station photo not found.',404);
 const photo=await db().stationPhoto.findFirst({where:{stationId,key:station.photoKey},select:{content:true}});
 if(!photo)throw new InputError('Station photo not found.',404);return photo.content;
}
export async function changeStationPhoto(actorId:string,eventId:string,stationId:string,request:Request){
 await scope(db(),actorId,eventId,stationId,true);const remove=request.method==='DELETE';let content:Uint8Array|undefined;
 if(!remove){
  const reader=request.body?.getReader(),chunks:Uint8Array[]=[];let size=0;
  if(reader)while(true){const part=await reader.read();if(part.done)break;size+=part.value.length;if(size>stationPhotoLimit){await reader.cancel();throw new InputError('Choose a photo no larger than 5 MB.',413);}chunks.push(part.value);}
  const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}content=await normalizeStationPhoto(bytes);
 }
 return db().$transaction(async tx=>{
  await tx.$queryRaw`SELECT id FROM "Event" WHERE id=${eventId} FOR UPDATE`;
  const station=await scope(tx,actorId,eventId,stationId,true);
  if((request.headers.get('x-photo-version')??'')!==(station.photoKey??''))throw new InputError('This photo changed. Refresh before saving again.',409);
  const key=remove?null:randomUUID();await tx.stationPhoto.deleteMany({where:{stationId}});
  if(content&&key)await tx.stationPhoto.create({data:{stationId,key,content:new Uint8Array(content)}});
  await tx.station.update({where:{id:stationId},data:{photoKey:key}});
  await tx.auditEntry.create({data:{eventId,actorId,action:remove?'STATION_PHOTO_REMOVED':'STATION_PHOTO_UPDATED',targetId:stationId,detailsJson:{}}});
  return {photoKey:key,photoUrl:stationPhotoUrl(eventId,stationId,key)};
 });
}

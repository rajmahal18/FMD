import 'server-only';
import {randomBytes} from 'node:crypto';
import {db} from '@/lib/db';
import {tokenHash} from '@/lib/password';
import {InputError} from '@/lib/validation';
import {readSession} from './session-access';
import {switchedTokenPrefix} from '@/lib/session-cookies';
export async function switchAccounts(token:string|undefined,eventId:string){
 const session=await readSession(token);
 if(!session||session.parentSessionId||session.user.mustChangePassword)throw new InputError('Sign in as the organizer first.',403);
 const membership=await db().eventMembership.findUnique({where:{eventId_userId:{eventId,userId:session.userId}},select:{active:true,role:true}});
 if(!membership?.active||membership.role!=='ORGANIZER')throw new InputError('Organizer access to this event is required.',403);
 const people=await db().eventMembership.findMany({where:{eventId},select:{id:true,role:true,active:true,userId:true,user:{select:{name:true,email:true,active:true,mustChangePassword:true}},team:{select:{name:true}}},orderBy:{user:{name:'asc'}}});
 return {eventId,people:people.filter(p=>p.userId!==session.userId).map(p=>({id:p.id,name:p.user.name,email:p.user.email,role:p.role,team:p.team?.name??null,available:p.active&&p.user.active,unavailable:!p.active||!p.user.active?'Inactive account':null,passwordSetupPending:p.user.mustChangePassword}))};
}
export async function startAccountSwitch(token:string|undefined,eventId:string,membershipId:string){
 const original=await readSession(token);
 if(!original||original.parentSessionId||original.user.mustChangePassword)throw new InputError('Return to your organizer account before switching again.',403);
 return db().$transaction(async tx=>{
  await tx.$queryRaw`SELECT id FROM "Session" WHERE id=${original.id} FOR UPDATE`;
  const parent=await tx.session.findUnique({where:{id:original.id},include:{user:true}});
  if(!parent||parent.expiresAt<=new Date()||!parent.user.active||parent.user.mustChangePassword)throw new InputError('Your organizer session ended. Sign in again.',401);
  const organizer=await tx.eventMembership.findUnique({where:{eventId_userId:{eventId,userId:parent.userId}}});
  if(!organizer?.active||organizer.role!=='ORGANIZER')throw new InputError('Organizer access to this event is required.',403);
  const target=await tx.eventMembership.findFirst({where:{id:membershipId,eventId},include:{user:true,judgingAssignments:{where:{active:true,contest:{state:"OPEN"}},select:{contestId:true}}}});
  if(!target?.active||!target.user.active||target.userId===parent.userId)throw new InputError('Choose another active account from this event.',403);
  const switchedToken=switchedTokenPrefix+randomBytes(32).toString('base64url'),expiresAt=new Date(Math.min(parent.expiresAt.getTime(),Date.now()+60*60*1000));
  await tx.session.deleteMany({where:{parentSessionId:parent.id}});
  const child=await tx.session.create({data:{userId:target.userId,tokenHash:tokenHash(switchedToken),expiresAt,parentSessionId:parent.id,actingEventId:eventId}});
  await tx.auditEntry.create({data:{eventId,actorId:parent.userId,targetUserId:target.userId,action:'ACCOUNT_SWITCH_STARTED',targetId:child.id,detailsJson:{role:target.role,parentSessionId:parent.id,expiresAt:expiresAt.toISOString(),realActions:true,passwordSetupPending:target.user.mustChangePassword}}});
  return {token:switchedToken,expiresAt,originalExpiresAt:parent.expiresAt,redirect:target.role==='FACILITATOR'&&target.judgingAssignments.length?`/events/${eventId}/judging`:`/events/${eventId}`};
 },{timeout:20000,maxWait:10000});
}

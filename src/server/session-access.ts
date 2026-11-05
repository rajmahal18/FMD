import 'server-only';
import {db} from '@/lib/db';
import {tokenHash} from '@/lib/password';
import {isSwitchedToken} from '@/lib/session-cookies';
import type {Prisma} from '@/generated/prisma/client';
export async function readSession(token:string|undefined,client:Pick<Prisma.TransactionClient,'session'|'eventMembership'>=db()){
 if(!token)return null;
 const s=await client.session.findUnique({where:{tokenHash:tokenHash(token)},include:{user:true,parentSession:{include:{user:true}}}});
 if(!s||s.expiresAt<=new Date()||!s.user.active)return null;
 if(!s.parentSessionId)return isSwitchedToken(token)||s.actingEventId?null:s;
 const parent=s.parentSession;
 if(!isSwitchedToken(token)||!s.actingEventId||!parent||parent.parentSessionId||parent.expiresAt<=new Date()||!parent.user.active||parent.user.mustChangePassword)return null;
 const memberships=await client.eventMembership.findMany({where:{eventId:s.actingEventId,userId:{in:[parent.userId,s.userId]},active:true},select:{userId:true,role:true}});
 if(!memberships.some(m=>m.userId===parent.userId&&m.role==='ORGANIZER')||!memberships.some(m=>m.userId===s.userId))return null;
 return s;
}

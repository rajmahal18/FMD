import "server-only";
import { cookies } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { db } from "./db";
import type {Prisma} from '@/generated/prisma/client';
import {readSession} from '@/server/session-access';
import {sessionCookie} from './session-cookies';
export {sessionCookie} from './session-cookies';
export const sessionLifetimeMs=30*24*60*60*1000;
export async function defaultEntryPath(userId:string,client:Pick<Prisma.TransactionClient,'eventMembership'>=db()){
 const memberships=await client.eventMembership.findMany({where:{userId,active:true,user:{active:true},event:{archivedAt:null}},orderBy:{event:{isDemo:'asc'}},take:2,select:{eventId:true,role:true,event:{select:{isDemo:true}},judgingAssignments:{where:{active:true,contest:{state:"OPEN"}},select:{contestId:true}}}});
 const real=memberships.filter(m=>!m.event.isDemo),available=real.length?real:memberships;
 const only=available.length===1?available[0]:null;
 if(!only)return '/workspace';
 return only.role==='FACILITATOR'&&only.judgingAssignments.length?`/events/${only.eventId}/judging`:`/events/${only.eventId}`;
}
export async function currentUser(){const session=await readSession((await cookies()).get(sessionCookie)?.value);return session?{...session.user,...(session.parentSessionId?{canCreateEvents:false}:{}),accountSwitch:session.parentSessionId?{sessionId:session.id,eventId:session.actingEventId!,organizerId:session.parentSession!.userId,organizerName:session.parentSession!.user.name}:null}:null;}
export async function requireUser(){const user=await currentUser();if(!user)redirect("/login");if(user.mustChangePassword)redirect("/account/password");return user;}
export async function requireMembership(eventId:string){const user=await requireUser();if(user.accountSwitch&&user.accountSwitch.eventId!==eventId)notFound();const m=await db().eventMembership.findUnique({where:{eventId_userId:{eventId,userId:user.id}},include:{event:true,team:true,assignments:{include:{station:true}}}});if(!m?.active)notFound();if(m.role==="PARTICIPANT"&&m.event.hideEventDetails)m.event={...m.event,briefing:"",codename:null,startsOn:null,endsOn:null};return {user,m};}

import 'server-only';
import {cookies} from 'next/headers';
import type {Prisma} from '@/generated/prisma/client';
import {isSwitchedToken,sessionCookie} from '@/lib/session-cookies';
import {readSession} from './session-access';

// Keep this check inside the caller's transaction, including single-connection pools.
// A pending target is usable only through a currently valid organizer delegation.
export async function passwordSetupRequired(tx:Pick<Prisma.TransactionClient,'session'|'eventMembership'>,actorId:string,eventId:string,required:boolean){
 if(!required)return false;
 const token=(await cookies()).get(sessionCookie)?.value;
 if(!token||!isSwitchedToken(token))return true;
 const session=await readSession(token,tx);
 return !session?.parentSessionId||session.userId!==actorId||session.actingEventId!==eventId;
}

import {NextRequest,NextResponse} from 'next/server';
import {isSameOrigin} from '@/lib/policy';
import {readSession} from '@/server/session-access';
import {db} from '@/lib/db';
import {tokenHash} from '@/lib/password';
import {sessionCookie,organizerCookie,cookieOptions} from '@/lib/session-cookies';
import {defaultEntryPath} from '@/lib/auth';
export const runtime='nodejs';
export async function POST(request:NextRequest){
 const origin=process.env.APP_ORIGIN;
 if(!origin||!isSameOrigin(request.headers.get('origin'),origin))return new NextResponse('Forbidden',{status:403});
 const token=request.cookies.get(organizerCookie)?.value,original=await readSession(token),current=request.cookies.get(sessionCookie)?.value;
 if(!token){
  const already=await readSession(current);
  if(already&&!already.parentSessionId){const response=NextResponse.redirect(new URL(already.user.mustChangePassword?'/account/password':await defaultEntryPath(already.userId),origin),303);response.headers.set('Cache-Control','no-store');return response;}
 }
 let destination='/login';
 if(original&&!original.parentSessionId){
  const child=current?await db().session.findUnique({where:{tokenHash:tokenHash(current)}}):null;
  if(child?.parentSessionId&&child.parentSessionId!==original.id)return new NextResponse('Organizer session does not match this switch.',{status:403});
  const membership=child?.actingEventId?await db().eventMembership.findUnique({where:{eventId_userId:{eventId:child.actingEventId,userId:original.userId}},select:{active:true,role:true}}):null;
  await db().$transaction(async tx=>{
   await tx.session.deleteMany({where:{parentSessionId:original.id}});
   await tx.auditEntry.create({data:{actorId:original.userId,...(membership&&child?.actingEventId?{eventId:child.actingEventId}:{}),...(child?.parentSessionId?{targetUserId:child.userId,targetId:child.id}:{}),action:'ACCOUNT_SWITCH_ENDED'}});
  });
  destination=original.user.mustChangePassword?'/account/password':child?.actingEventId&&membership?.active&&membership.role==='ORGANIZER'?`/events/${child.actingEventId}/switch-account`:'/workspace';
 }
 const response=NextResponse.redirect(new URL(destination,origin),303);
 response.headers.set('Cache-Control','no-store');
 response.cookies.set(organizerCookie,'',{...cookieOptions,maxAge:0});
 if(original&&!original.parentSessionId)response.cookies.set(sessionCookie,token!,{...cookieOptions,expires:original.expiresAt});
 else response.cookies.set(sessionCookie,'',{...cookieOptions,maxAge:0});
 return response;
}

import {NextRequest,NextResponse} from 'next/server';
import {readSession} from '@/server/session-access';
import {db} from '@/lib/db';
import {isSameOrigin} from '@/lib/policy';
import {sessionCookie,isSwitchedToken,accountUserHeader} from '@/lib/session-cookies';
const headers={'Cache-Control':'private, no-store','Vary':'Cookie'};
function blocked(request:NextRequest,message:string,status=403){
 if(request.nextUrl.pathname.startsWith('/api/'))return NextResponse.json({error:message},{status,headers});
 return new NextResponse(`<!doctype html><html lang="en"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Return to organizer</title><body style="margin:0;padding:24px;background:#071426;color:#f2f7fa;font:16px Arial;line-height:1.5"><main style="max-width:560px;margin:40px auto"><h1>Return to organizer</h1><p>Account switching is limited to the selected event. Your switch may also have expired or been revoked.</p><form method="post" action="/api/auth/switch-account/return"><button style="min-height:48px;padding:12px 20px;background:#72d5e3;border:0;border-radius:4px;color:#071426;font:inherit;font-weight:bold">Return to organizer</button></form></main></body></html>`,{status,headers:{...headers,'Content-Type':'text/html; charset=utf-8'}});
}
export async function proxy(request:NextRequest){
 const token=request.cookies.get(sessionCookie)?.value,path=request.nextUrl.pathname;
 if(path==='/api/auth/switch-account/return'||path==='/api/auth/logout')return NextResponse.next();
 if(!token||!isSwitchedToken(token)){
  const claimed=request.headers.get(accountUserHeader);
  if(token&&claimed&&!['GET','HEAD','OPTIONS'].includes(request.method)){
   try{const session=await readSession(token);if(!session||session.userId!==claimed)return blocked(request,'The active account changed. Refresh before submitting anything.',409);}catch{return blocked(request,'Unable to verify the current account. Refresh before submitting.',503);}
  }
  return NextResponse.next();
 }
 try{
  const session=await readSession(token);
  if(!session?.parentSessionId||!session.actingEventId)return blocked(request,'This account switch expired or was revoked. Return to organizer.',401);
  if(request.method==='GET'&&/^\/api\/avatars\/[0-9a-f-]{36}$/.test(path))return NextResponse.next();
  if(path==='/workspace'||path==='/')return NextResponse.redirect(new URL(`/events/${session.actingEventId}`,request.url));
  const match=path.match(/^\/(?:api\/)?events\/([^/]+)(?:\/|$)/);
  let eventId='';try{eventId=match?decodeURIComponent(match[1]):'';}catch{return blocked(request,'Invalid event path.');}
  if(eventId!==session.actingEventId||path.endsWith('/switch-account')||path==='/events/new')return blocked(request,'Return to organizer to access other events or account security settings.');
  if(!['GET','HEAD','OPTIONS'].includes(request.method)){
   if(!process.env.APP_ORIGIN||!isSameOrigin(request.headers.get('origin'),process.env.APP_ORIGIN))return blocked(request,'Refresh from the event website.');
   if(request.headers.get(accountUserHeader)!==session.userId)return blocked(request,'The active account changed. Refresh before submitting anything.',409);
   await db().auditEntry.create({data:{eventId,actorId:session.parentSession!.userId,targetUserId:session.userId,action:'ACCOUNT_SWITCH_ACTION',targetId:session.id,detailsJson:{method:request.method,path:path.slice(0,1000),status:'ATTEMPTED',note:'Normal action permissions and audit still apply.'}}});
  }
  return NextResponse.next();
 }catch{return blocked(request,'Unable to verify this account switch. Return to organizer.',503);}
}
export const config={matcher:['/((?!_next/static|_next/image|favicon.ico|fonts/|theme/).*)']};

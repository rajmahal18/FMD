import {NextRequest,NextResponse} from 'next/server';
import {isSameOrigin} from '@/lib/policy';
import {InputError} from '@/lib/validation';
import {startAccountSwitch} from '@/server/account-switch';
import {sessionCookie,organizerCookie,cookieOptions} from '@/lib/session-cookies';
import {jsonRequest,privateHeaders as headers} from '@/server/json-request';
export const runtime='nodejs';
export async function POST(request:NextRequest){
 if(!process.env.APP_ORIGIN||!isSameOrigin(request.headers.get('origin'),process.env.APP_ORIGIN))return NextResponse.json({error:'Refresh from the event website.'},{status:403,headers});
 try{
  const body=await jsonRequest(request) as Record<string,unknown>;
  if(typeof body?.eventId!=='string'||body.eventId.length>120||typeof body.membershipId!=='string'||body.membershipId.length>120)throw new InputError('Choose an account from this event.');
  const original=request.cookies.get(sessionCookie)?.value,result=await startAccountSwitch(original,body.eventId,body.membershipId);
  const response=NextResponse.json({redirect:result.redirect},{headers});
  response.cookies.set(organizerCookie,original!,{...cookieOptions,expires:result.originalExpiresAt});
  response.cookies.set(sessionCookie,result.token,{...cookieOptions,expires:result.expiresAt});
  return response;
 }catch(e){return NextResponse.json({error:e instanceof InputError?e.message:'Unable to switch accounts. Refresh to check your current account before retrying.'},{status:e instanceof InputError?e.status:503,headers});}
}

import {currentUser} from '@/lib/auth';
import {isSameOrigin} from '@/lib/policy';
import {InputError} from '@/lib/validation';
import {jsonRequest,privateHeaders as headers} from '@/server/json-request';
import {inboxAction,readInbox} from '@/server/inbox';
export const runtime='nodejs';
export async function GET(_request:Request,{params}:{params:Promise<{eventId:string}>}){
 const user=await currentUser();if(!user)return Response.json({error:'Sign in again.'},{status:401,headers});
 try{return Response.json(await readInbox(user.id,(await params).eventId),{headers});}catch(e){return Response.json({error:e instanceof InputError?e.message:'Unable to load inbox.'},{status:e instanceof InputError?e.status:503,headers});}
}
export async function POST(request:Request,{params}:{params:Promise<{eventId:string}>}){
 if(!process.env.APP_ORIGIN||!isSameOrigin(request.headers.get('origin'),process.env.APP_ORIGIN))return Response.json({error:'Use the event website to answer or send offers.'},{status:403,headers});
 const user=await currentUser();if(!user)return Response.json({error:'Sign in again.'},{status:401,headers});
 try{return Response.json(await inboxAction(user.id,(await params).eventId,await jsonRequest(request)),{headers});}catch(e){return Response.json({error:e instanceof InputError?e.message:'Unable to confirm. Refresh your inbox before retrying.'},{status:e instanceof InputError?e.status:503,headers});}
}

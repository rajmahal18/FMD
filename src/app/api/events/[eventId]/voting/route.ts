import {currentUser} from '@/lib/auth';
import {isSameOrigin} from '@/lib/policy';
import {InputError} from '@/lib/validation';
import {jsonRequest,privateHeaders as headers} from '@/server/json-request';
import {readVoting,votingAction} from '@/server/voting';
export async function GET(_request:Request,{params}:{params:Promise<{eventId:string}>}){
 const user=await currentUser();if(!user)return Response.json({error:'Sign in again.'},{status:401,headers});
 try{return Response.json(await readVoting(user.id,(await params).eventId),{headers});}catch(e){return Response.json({error:e instanceof InputError?e.message:'Unable to load voting events.'},{status:e instanceof InputError?e.status:503,headers});}
}
export async function POST(request:Request,{params}:{params:Promise<{eventId:string}>}){
 if(!process.env.APP_ORIGIN||!isSameOrigin(request.headers.get('origin'),process.env.APP_ORIGIN))return Response.json({error:'Use the event website to submit votes.'},{status:403,headers});
 const user=await currentUser();if(!user)return Response.json({error:'Sign in again.'},{status:401,headers});
 try{return Response.json(await votingAction(user.id,(await params).eventId,await jsonRequest(request)),{headers});}catch(e){if(!(e instanceof InputError))console.error('Voting action failed',e instanceof Error?e.name:'UnknownError');return Response.json({error:e instanceof InputError?e.message:'Unable to confirm. Refresh to check whether your action was recorded.'},{status:e instanceof InputError?e.status:503,headers});}
}

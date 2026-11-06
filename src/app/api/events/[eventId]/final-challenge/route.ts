import {currentUser} from '@/lib/auth';
import {isSameOrigin} from '@/lib/policy';
import {InputError} from '@/lib/validation';
import {jsonRequest,privateHeaders as headers} from '@/server/json-request';
import {readFinalChallenge,finalChallengeAction} from '@/server/final-challenge';
export const runtime='nodejs';
type Context={params:Promise<{eventId:string}>};
export async function GET(_request:Request,{params}:Context){
 const user=await currentUser();if(!user)return Response.json({error:'Sign in again.'},{status:401,headers});
 try{return Response.json(await readFinalChallenge(user.id,(await params).eventId),{headers});}catch(e){return Response.json({error:e instanceof InputError?e.message:'Unable to refresh Final Challenge.'},{status:e instanceof InputError?e.status:503,headers});}
}
export async function POST(request:Request,{params}:Context){
 if(!process.env.APP_ORIGIN||!isSameOrigin(request.headers.get('origin'),process.env.APP_ORIGIN))return Response.json({error:'Use the event website.'},{status:403,headers});
 const user=await currentUser();if(!user)return Response.json({error:'Sign in again.'},{status:401,headers});
 try{return Response.json(await finalChallengeAction(user.id,(await params).eventId,await jsonRequest(request)),{headers});}catch(e){return Response.json({error:e instanceof InputError?e.message:'Unable to confirm. Refresh and retry the original request.'},{status:e instanceof InputError?e.status:503,headers});}
}

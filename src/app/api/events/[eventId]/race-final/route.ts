import {currentUser} from '@/lib/auth';
import {InputError} from '@/lib/validation';
import {isSameOrigin} from '@/lib/policy';
import {jsonRequest,privateHeaders as headers} from '@/server/json-request';
import {readRaceFinal,saveRaceFinal} from '@/server/race-final';
export async function GET(_:Request,{params}:{params:Promise<{eventId:string}>}){
 const user=await currentUser();if(!user)return Response.json({error:'Sign in to continue.'},{status:401,headers});
 const {eventId}=await params;if(user.accountSwitch&&user.accountSwitch.eventId!==eventId)return Response.json({error:'Event access unavailable.'},{status:403,headers});
 try{return Response.json(await readRaceFinal(user.id,eventId),{headers});}catch(e){return failure(e);}
}
export async function POST(request:Request,{params}:{params:Promise<{eventId:string}>}){
 if(!process.env.APP_ORIGIN||!isSameOrigin(request.headers.get('origin'),process.env.APP_ORIGIN))return Response.json({error:'Refresh from the event website.'},{status:403,headers});
 const user=await currentUser();if(!user)return Response.json({error:'Sign in to continue.'},{status:401,headers});
 const {eventId}=await params;if(user.accountSwitch&&user.accountSwitch.eventId!==eventId)return Response.json({error:'Event access unavailable.'},{status:403,headers});
 try{return Response.json(await saveRaceFinal(user.id,eventId,await jsonRequest(request)),{headers});}catch(e){return failure(e);}
}
function failure(e:unknown){return Response.json({error:e instanceof InputError?e.message:'Unable to confirm the Final Station result. Retry the saved request.'},{status:e instanceof InputError?e.status:503,headers});}

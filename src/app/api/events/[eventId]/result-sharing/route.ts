import {currentUser} from '@/lib/auth';
import {isSameOrigin} from '@/lib/policy';
import {InputError} from '@/lib/validation';
import {readResultCenter,changeResultSharing} from '@/server/result-sharing';
import {jsonRequest,privateHeaders as headers} from '@/server/json-request';
export const runtime='nodejs';
export async function GET(_:Request,{params}:{params:Promise<{eventId:string}>}){const user=await currentUser();if(!user)return Response.json({error:'Sign in to view results.'},{status:401,headers});try{return Response.json(await readResultCenter(user.id,(await params).eventId),{headers});}catch(e){return failure(e);}}
export async function POST(request:Request,{params}:{params:Promise<{eventId:string}>}){if(!process.env.APP_ORIGIN||!isSameOrigin(request.headers.get('origin'),process.env.APP_ORIGIN))return Response.json({error:'Refresh from the event website.'},{status:403,headers});const user=await currentUser();if(!user)return Response.json({error:'Sign in to manage sharing.'},{status:401,headers});try{return Response.json(await changeResultSharing(user.id,(await params).eventId,await jsonRequest(request,16384)),{headers});}catch(e){return failure(e);}}
function failure(e:unknown){return Response.json({error:e instanceof InputError?e.message:'Unable to confirm sharing. Refresh and retry safely.'},{status:e instanceof InputError?e.status:503,headers});}

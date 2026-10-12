import {currentUser} from '@/lib/auth';
import {isSameOrigin} from '@/lib/policy';
import {InputError} from '@/lib/validation';
import {previewControl} from '@/server/control';
import {jsonRequest,privateHeaders as headers} from '@/server/json-request';
export async function POST(request:Request,{params}:{params:Promise<{eventId:string}>}){if(!process.env.APP_ORIGIN||!isSameOrigin(request.headers.get('origin'),process.env.APP_ORIGIN))return Response.json({error:'Refresh and retry from the event website.'},{status:403,headers});const user=await currentUser();if(!user)return Response.json({error:'Sign in again.'},{status:401,headers});try{return Response.json(await previewControl(user.id,(await params).eventId,await jsonRequest(request)),{headers});}catch(e){return Response.json({error:e instanceof InputError?e.message:'Unable to review this change. Retry when connected.'},{status:e instanceof InputError?e.status:503,headers});}}

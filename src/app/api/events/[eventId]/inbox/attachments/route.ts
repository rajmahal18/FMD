import {currentUser} from '@/lib/auth';
import {isSameOrigin} from '@/lib/policy';
import {InputError} from '@/lib/validation';
import {privateHeaders as headers} from '@/server/json-request';
import {uploadInboxFile} from '@/server/inbox-files';
export const runtime='nodejs';
export async function POST(request:Request,{params}:{params:Promise<{eventId:string}>}){
 if(!process.env.APP_ORIGIN||!isSameOrigin(request.headers.get('origin'),process.env.APP_ORIGIN))return Response.json({error:'Use the event website to upload files.'},{status:403,headers});
 const user=await currentUser();if(!user)return Response.json({error:'Sign in again.'},{status:401,headers});
 try{return Response.json(await uploadInboxFile(user.id,(await params).eventId,request),{headers});}catch(e){return Response.json({error:e instanceof InputError?e.message:'Unable to upload. Please retry.'},{status:e instanceof InputError?e.status:503,headers});}
}

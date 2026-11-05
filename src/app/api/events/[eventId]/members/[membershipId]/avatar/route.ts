import {currentUser} from '@/lib/auth';
import {isSameOrigin} from '@/lib/policy';
import {InputError} from '@/lib/validation';
import {privateHeaders as headers} from '@/server/json-request';
import {changeAvatar} from '@/server/avatars';
export const runtime='nodejs';
async function handle(request:Request,{params}:{params:Promise<{eventId:string;membershipId:string}>}){
 if(!process.env.APP_ORIGIN||!isSameOrigin(request.headers.get('origin'),process.env.APP_ORIGIN))return Response.json({error:'Use the event website to change photos.'},{status:403,headers});
 const user=await currentUser();if(!user)return Response.json({error:'Sign in again.'},{status:401,headers});
 try{const {eventId,membershipId}=await params;return Response.json(await changeAvatar(user.id,eventId,membershipId,request,request.method==='DELETE'),{headers});}
 catch(e){return Response.json({error:e instanceof InputError?e.message:'Unable to save the photo. Please retry.'},{status:e instanceof InputError?e.status:503,headers});}
}
export const POST=handle;
export const DELETE=handle;

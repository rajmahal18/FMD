import {currentUser} from '@/lib/auth';
import {isSameOrigin} from '@/lib/policy';
import {InputError} from '@/lib/validation';
import {privateHeaders as headers} from '@/server/json-request';
import {readStationPhoto,changeStationPhoto} from '@/server/station-photos';
export const runtime='nodejs';
type Context={params:Promise<{eventId:string;stationId:string}>};
export async function GET(request:Request,{params}:Context){
 const user=await currentUser();if(!user)return new Response(null,{status:401,headers});
 try{const {eventId,stationId}=await params;const bytes=await readStationPhoto(user.id,eventId,stationId,new URL(request.url).searchParams.get('v'));return new Response(new Uint8Array(bytes),{headers:{...headers,'Content-Type':'image/webp','X-Content-Type-Options':'nosniff'}});}
 catch(e){return new Response(null,{status:e instanceof InputError?e.status:503,headers});}
}
async function change(request:Request,{params}:Context){
 if(!process.env.APP_ORIGIN||!isSameOrigin(request.headers.get('origin'),process.env.APP_ORIGIN))return Response.json({error:'Use the event website to change photos.'},{status:403,headers});
 const user=await currentUser();if(!user)return Response.json({error:'Sign in again.'},{status:401,headers});
 try{const {eventId,stationId}=await params;return Response.json(await changeStationPhoto(user.id,eventId,stationId,request),{headers});}
 catch(e){return Response.json({error:e instanceof InputError?e.message:'Unable to save the photo. Please retry.'},{status:e instanceof InputError?e.status:503,headers});}
}
export const POST=change;
export const DELETE=change;

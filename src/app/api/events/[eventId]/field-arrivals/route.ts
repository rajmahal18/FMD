import {currentUser} from '@/lib/auth';
import {InputError} from '@/lib/validation';
import {privateHeaders as headers} from '@/server/json-request';
import {fieldArrivals} from '@/server/field-arrivals';
export async function GET(_:Request,{params}:{params:Promise<{eventId:string}>}){
 const user=await currentUser();if(!user)return Response.json({error:'Sign in to continue.'},{status:401,headers});
 const {eventId}=await params;
 if(user.accountSwitch&&user.accountSwitch.eventId!==eventId)return Response.json({error:'Event access is unavailable.'},{status:403,headers});
 try{return Response.json(await fieldArrivals(user.id,eventId),{headers});}catch(e){return Response.json({error:e instanceof InputError?e.message:'Unable to refresh arrivals.'},{status:e instanceof InputError?e.status:503,headers});}
}

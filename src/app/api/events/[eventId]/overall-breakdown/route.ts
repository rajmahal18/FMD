import {currentUser} from '@/lib/auth';
import {InputError} from '@/lib/validation';
import {privateHeaders as headers} from '@/server/json-request';
import {readOverallBreakdown} from '@/server/overall-breakdown';
export async function GET(_request:Request,{params}:{params:Promise<{eventId:string}>}){
 const user=await currentUser();if(!user)return Response.json({error:'Sign in again.'},{status:401,headers});
 try{return Response.json(await readOverallBreakdown(user.id,(await params).eventId),{headers});}catch(e){return Response.json({error:e instanceof InputError?e.message:'Unable to refresh the detailed ranking.'},{status:e instanceof InputError?e.status:503,headers});}
}

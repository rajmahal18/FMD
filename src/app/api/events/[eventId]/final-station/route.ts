import {currentUser} from '@/lib/auth';
import {db} from '@/lib/db';
import {finalStationStatus} from '@/server/final-station';
import {privateHeaders as headers} from '@/server/json-request';
export async function GET(_request:Request,{params}:{params:Promise<{eventId:string}>}){
 const user=await currentUser();if(!user||user.mustChangePassword)return Response.json({error:'Sign in again.'},{status:401,headers});
 const {eventId}=await params;
 return db().$transaction(async tx=>{const m=await tx.eventMembership.findUnique({where:{eventId_userId:{eventId,userId:user.id}},include:{event:true}});if(!m?.active||m.role!=='ORGANIZER')return Response.json({error:'Organizer access is required.'},{status:403,headers});return Response.json({status:await finalStationStatus(tx,eventId),state:m.event.archivedAt?"ARCHIVED":m.event.state,checkedAt:new Date().toISOString()},{headers});},{isolationLevel:'RepeatableRead'});
}

import 'server-only';
import {db} from '@/lib/db';
import {InputError} from '@/lib/validation';

export async function judgingNavigation(actorId:string,eventId:string){
 const membership=await db().eventMembership.findUnique({where:{eventId_userId:{eventId,userId:actorId}},select:{active:true,role:true,user:{select:{active:true,mustChangePassword:true}},event:{select:{archivedAt:true}},judgingAssignments:{where:{active:true},select:{contest:{select:{state:true}}}}}});
 if(!membership?.active||!membership.user.active||membership.user.mustChangePassword||membership.role!=='FACILITATOR')throw new InputError('Active facilitator access is required.',403);
 return {judgingEnabled:membership.judgingAssignments.length>0,focused:!membership.event.archivedAt&&membership.judgingAssignments.some(a=>a.contest.state==='OPEN')};
}

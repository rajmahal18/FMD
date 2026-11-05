import {passwordSetupRequired} from './password-setup';
import 'server-only';
import {db} from '@/lib/db';
import {InputError} from '@/lib/validation';
import {runRevision} from './run-revision';
export async function fieldArrivals(actorId:string,eventId:string){
 const m=await db().eventMembership.findUnique({where:{eventId_userId:{eventId,userId:actorId}},select:{active:true,role:true,user:{select:{active:true,mustChangePassword:true}},event:{select:{state:true,archivedAt:true,finalStationId:true}},assignments:{select:{stationId:true}},judgingAssignments:{where:{active:true,contest:{state:'OPEN'}},select:{contestId:true}}}});
 if(!m?.active||!m.user.active||(await passwordSetupRequired(db(),actorId,eventId,m.user.mustChangePassword))||m.role!=='FACILITATOR')throw new InputError('Active assigned facilitator access is required.',403);
 const arrivals=m.event.state==='LIVE'&&!m.event.archivedAt&&!m.judgingAssignments.length?await db().stationVisit.findMany({where:{eventId,stationId:{in:m.assignments.map(a=>a.stationId),not:m.event.finalStationId??undefined},state:{in:['ARRIVED','ACTIVE']},station:{available:true}},orderBy:[{arrivalAt:'desc'},{id:'desc'}],select:{id:true,stationId:true,arrivalAt:true,startedAt:true}}):[];
 return {runRevision:await runRevision(db(),eventId),arrivals:arrivals.map(v=>({id:v.id,stationId:v.stationId,arrivalAt:v.arrivalAt?.toISOString()??null,startedAt:v.startedAt?.toISOString()??null}))};
}

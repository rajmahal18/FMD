import {requireMembership} from '@/lib/auth';
import {Shell} from '@/components/Shell';
import {OverallBreakdownSheet} from '@/components/OverallBreakdownSheet';
import {readOverallBreakdown} from '@/server/overall-breakdown';
export default async function Page({params}:{params:Promise<{eventId:string}>}){
 const {eventId}=await params;const {user,m}=await requireMembership(eventId);
 return <Shell name={user.name} title="Detailed overall rankings" role={m.role} eventId={eventId}><OverallBreakdownSheet initial={await readOverallBreakdown(user.id,eventId)}/></Shell>;
}

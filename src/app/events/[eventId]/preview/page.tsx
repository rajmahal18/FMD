import {notFound} from 'next/navigation';
import {requireMembership} from '@/lib/auth';
import {readScreenPreview} from '@/server/screen-preview';
import {LiveScreenPreview} from '@/components/LiveScreenPreview';
export default async function PreviewPage({params,searchParams}:{params:Promise<{eventId:string}>;searchParams:Promise<{view?:string}>}){
 const {eventId}=await params;const {user,m}=await requireMembership(eventId);const {view}=await searchParams;
 if(!['ORGANIZER','FACILITATOR'].includes(m.role)||m.role==='FACILITATOR'&&view==='participant')notFound();
 return <LiveScreenPreview initial={await readScreenPreview(user.id,eventId,view)}/>;
}

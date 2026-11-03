import {notFound} from 'next/navigation';
import {requireMembership} from '@/lib/auth';
import {readScreenPreview} from '@/server/screen-preview';
import {LiveScreenPreview} from '@/components/LiveScreenPreview';
import {Shell} from '@/components/Shell';
import Link from 'next/link';
export default async function PreviewPage({params,searchParams}:{params:Promise<{eventId:string}>;searchParams:Promise<{view?:string}>}){
 const {eventId}=await params;const {user,m}=await requireMembership(eventId);const {view}=await searchParams;
 if(!['ORGANIZER','FACILITATOR'].includes(m.role)||m.role==='FACILITATOR'&&view==='participant')notFound();
 if(!m.event.screenPreviewEnabled)return <Shell name={user.name} title="Screen previews disabled" role={m.role} eventId={eventId}><section className="panel"><h2>Live screen previews are disabled</h2><p>Use the actual event screens for station work.</p>{m.role==='ORGANIZER'?<Link className="button" href={`/events/${eventId}/setup#screen-preview-visibility`}>Manage preview visibility</Link>:<Link className="button" href={`/events/${eventId}`}>Return to station work</Link>}</section></Shell>;
 return <LiveScreenPreview initial={await readScreenPreview(user.id,eventId,view)}/>;
}

import {redirect,notFound} from 'next/navigation';
import {currentUser,requireMembership} from '@/lib/auth';
import {Shell} from '@/components/Shell';
import {Inbox} from '@/components/Inbox';
import {readInbox} from '@/server/inbox';
export default async function InboxPage({params,searchParams}:{params:Promise<{eventId:string}>;searchParams:Promise<{message?:string;choice?:string}>}){
 const {eventId}=await params,q=await searchParams;
 const query=new URLSearchParams();if(typeof q.message==='string'&&q.message.length<=120)query.set('message',q.message);if(q.choice==='YES'||q.choice==='NO')query.set('choice',q.choice);
 const returnTo=`/events/${eventId}/inbox${query.size?'?'+query:''}`,user=await currentUser();
 if(!user)redirect(`/login?returnTo=${encodeURIComponent(returnTo)}`);
 if(user.mustChangePassword)redirect(`/account/password?returnTo=${encodeURIComponent(returnTo)}`);
 const {m}=await requireMembership(eventId);if(m.role==='FACILITATOR')notFound();
 return <Shell name={user.name} title={m.role==='ORGANIZER'?'Participant inbox':'Inbox'} role={m.role} eventId={eventId}><Inbox initial={await readInbox(user.id,eventId)} selectedId={q.message} initialChoice={q.choice}/></Shell>;
}

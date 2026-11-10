import {eventRecapFocused} from '@/server/event-recap';
import {redirect} from 'next/navigation';
import {requireMembership} from '@/lib/auth';
import {readVoting} from '@/server/voting';
import {Shell} from '@/components/Shell';
import {VotingEvents} from '@/components/VotingEvents';
export default async function VotingPage({params}:{params:Promise<{eventId:string}>}){const {eventId}=await params;const {user,m}=await requireMembership(eventId);if(await eventRecapFocused(eventId,m.role,m.event.state))redirect(`/events/${eventId}/results`);return <Shell name={user.name} title="Voting events" role={m.role} eventId={eventId}><VotingEvents initial={await readVoting(user.id,eventId)} mode="operations"/></Shell>;}

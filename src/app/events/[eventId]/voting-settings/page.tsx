import {requireOrganizer} from '@/lib/organizer';
import {readVoting} from '@/server/voting';
import {Shell} from '@/components/Shell';
import {VotingEvents} from '@/components/VotingEvents';
export default async function VotingSettings({params}:{params:Promise<{eventId:string}>}){const {eventId}=await params;const {user}=await requireOrganizer(eventId);return <Shell name={user.name} title="Voting setup" role="ORGANIZER" eventId={eventId}><VotingEvents initial={await readVoting(user.id,eventId)} mode="setup"/></Shell>;}

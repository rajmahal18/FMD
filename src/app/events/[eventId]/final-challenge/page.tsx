import {requireOrganizer} from '@/lib/organizer';
import {Shell} from '@/components/Shell';
import {FinalChallengeAdmin} from '@/components/FinalChallenge';
export default async function Page({params}:{params:Promise<{eventId:string}>}){const {eventId}=await params;const {user}=await requireOrganizer(eventId);return <Shell name={user.name} title="Final Challenge" role="ORGANIZER" eventId={eventId}><FinalChallengeAdmin eventId={eventId}/></Shell>;}

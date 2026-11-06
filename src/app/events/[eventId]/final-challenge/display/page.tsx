import {requireOrganizer} from '@/lib/organizer';
import {FinalChallengeDisplay} from '@/components/FinalChallenge';
export default async function Page({params}:{params:Promise<{eventId:string}>}){const {eventId}=await params;await requireOrganizer(eventId);return <FinalChallengeDisplay eventId={eventId}/>;}

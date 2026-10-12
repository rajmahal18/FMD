import {Shell} from "@/components/Shell";
import {EventIdentity} from "@/components/EventIdentity";
import {RehearsalConsole} from "@/components/RehearsalConsole";
import {requireOrganizer} from "@/lib/organizer";
export default async function RehearsalPage({params}:{params:Promise<{eventId:string}>}){const {eventId}=await params;const {user,m}=await requireOrganizer(eventId);return <Shell name={user.name} title="Field rehearsal" role="ORGANIZER" eventId={eventId}><EventIdentity event={m.event}/><RehearsalConsole eventId={eventId} eventState={m.event.state}/></Shell>;}

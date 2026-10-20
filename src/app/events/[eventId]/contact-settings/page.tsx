import {requireOrganizer} from '@/lib/organizer';
import {readContactPolicy} from '@/server/contact-policy';
import {Shell} from '@/components/Shell';
import {EventIdentity} from '@/components/EventIdentity';
import {ContactPolicyEditor} from '@/components/ContactPolicyEditor';
export default async function ContactSettings({params}:{params:Promise<{eventId:string}>}){
 const {eventId}=await params;const {user,m}=await requireOrganizer(eventId);
 return <Shell name={user.name} title="Contact policy" role="ORGANIZER" eventId={eventId}><EventIdentity event={m.event} showState={false}/><ContactPolicyEditor initial={await readContactPolicy(user.id,eventId)} mode="setup"/></Shell>;
}

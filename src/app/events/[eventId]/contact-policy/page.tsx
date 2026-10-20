import {notFound} from 'next/navigation';
import {requireMembership} from '@/lib/auth';
import {readContactPolicy} from '@/server/contact-policy';
import {Shell} from '@/components/Shell';
import {EventIdentity} from '@/components/EventIdentity';
import {ContactPolicyEditor} from '@/components/ContactPolicyEditor';
export default async function PolicyPage({params}:{params:Promise<{eventId:string}>}){const {eventId}=await params;const {user,m}=await requireMembership(eventId);if(m.role!=='ORGANIZER')notFound();return <Shell name={user.name} title="Agent Contact controls" role={m.role} eventId={eventId}><EventIdentity event={m.event} showState={false}/><ContactPolicyEditor initial={await readContactPolicy(user.id,eventId)}/></Shell>;}

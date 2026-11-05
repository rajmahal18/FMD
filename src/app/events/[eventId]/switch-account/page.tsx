import {cookies} from 'next/headers';
import {requireOrganizer} from '@/lib/organizer';
import {sessionCookie} from '@/lib/session-cookies';
import {switchAccounts} from '@/server/account-switch';
import {Shell} from '@/components/Shell';
import {AccountSwitcher} from '@/components/AccountSwitcher';
export default async function SwitchAccountPage({params}:{params:Promise<{eventId:string}>}){
 const {eventId}=await params,{user}=await requireOrganizer(eventId);
 const data=await switchAccounts((await cookies()).get(sessionCookie)?.value,eventId);
 return <Shell name={user.name} title="Switch to account" role="ORGANIZER" eventId={eventId}><AccountSwitcher {...data}/></Shell>;
}

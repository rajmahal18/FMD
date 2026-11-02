import {requireOrganizer} from '@/lib/organizer';
import {readJudging} from '@/server/judging';
import {Shell} from '@/components/Shell';
import {JudgingWorkspace} from '@/components/JudgingWorkspace';
export default async function JudgingSetup({params}:{params:Promise<{eventId:string}>}){const {eventId}=await params;const {user,m}=await requireOrganizer(eventId);return <Shell name={user.name} title="Judging setup" role={m.role} eventId={eventId}><JudgingWorkspace initial={await readJudging(user.id,eventId)} setup/></Shell>;}

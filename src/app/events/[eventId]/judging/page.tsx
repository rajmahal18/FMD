import {requireMembership} from '@/lib/auth';
import {readJudging} from '@/server/judging';
import {Shell} from '@/components/Shell';
import {JudgingWorkspace} from '@/components/JudgingWorkspace';
export default async function JudgingPage({params}:{params:Promise<{eventId:string}>}){const {eventId}=await params;const {user,m}=await requireMembership(eventId);return <Shell name={user.name} title={m.role==='PARTICIPANT'?'Judging results':'Judging desk'} role={m.role} eventId={eventId}><JudgingWorkspace initial={await readJudging(user.id,eventId)}/></Shell>;}

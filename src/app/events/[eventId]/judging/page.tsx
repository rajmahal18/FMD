import {requireMembership} from '@/lib/auth';
import {readJudging} from '@/server/judging';
import {Shell} from '@/components/Shell';
import {JudgingWorkspace} from '@/components/JudgingWorkspace';
export default async function JudgingPage({params,searchParams}:{params:Promise<{eventId:string}>;searchParams:Promise<{view?:string}>}){const {eventId}=await params,resultsOnly=(await searchParams).view==='results';const {user,m}=await requireMembership(eventId);return <Shell name={user.name} title={resultsOnly||m.role==='PARTICIPANT'?'Judging standings':'Judging desk'} role={m.role} eventId={eventId}><JudgingWorkspace resultsOnly={resultsOnly||m.role==='PARTICIPANT'} initial={await readJudging(user.id,eventId)}/></Shell>;}

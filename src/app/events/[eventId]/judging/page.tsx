import {requireMembership} from '@/lib/auth';
import {readJudging} from '@/server/judging';
import {Shell} from '@/components/Shell';
import {JudgingWorkspace} from '@/components/JudgingWorkspace';
import {ResultContext} from '@/components/ResultContext';
export default async function JudgingPage({params,searchParams}:{params:Promise<{eventId:string}>;searchParams:Promise<{view?:string;contest?:string}>}){
 const {eventId}=await params,query=await searchParams;const {user,m}=await requireMembership(eventId),resultsOnly=query.view==='results'||m.role==='PARTICIPANT';
 const data=await readJudging(user.id,eventId);if(query.contest)data.contests=data.contests.filter(c=>c.id===query.contest);
 return <Shell name={user.name} title={resultsOnly?'Judged activity results':'Scoring'} role={m.role} eventId={eventId}>{resultsOnly&&<ResultContext actorId={user.id} eventId={eventId} resultKey={'judging:'+(query.contest??data.contests[0]?.id??'')}/>}<JudgingWorkspace contestId={query.contest} resultsOnly={resultsOnly} initial={data}/></Shell>;
}

import {requireMembership} from '@/lib/auth';
import {readResults} from '@/server/results';
import {readResultCenter} from '@/server/result-sharing';
import {Shell} from '@/components/Shell';
import {ResultsReview} from '@/components/ResultsReview';
import {FinalResults} from '@/components/FinalResults';
import {ResultCenter} from '@/components/ResultCenter';
import {ResultContext} from '@/components/ResultContext';
import {readVoting} from '@/server/voting';
import {VotingResults} from '@/components/CategoryVoting';
import Link from 'next/link';
export default async function ResultsPage({params,searchParams}:{params:Promise<{eventId:string}>;searchParams:Promise<{section?:string;share?:string;poll?:string}>}){
 const {eventId}=await params,{section,share,poll}=await searchParams;const {user,m}=await requireMembership(eventId);
 const vote=section==='voting'?(await readVoting(user.id,eventId)).polls.find(p=>p.id===poll):null;
 return <Shell name={user.name} title={section==='race'?'Amazing Race results':section==='voting'?'Voting results':'Results'} role={m.role} eventId={eventId}>{section==='race'?<><ResultContext actorId={user.id} eventId={eventId} resultKey="race"/>{m.role==='ORGANIZER'?<ResultsReview initial={await readResults(user.id,eventId)}/>:<FinalResults data={await readResults(user.id,eventId)}/>}</>:section==='voting'?<><ResultContext actorId={user.id} eventId={eventId} resultKey={'voting:'+poll}/>{vote?.results?<section className="voting-workspace"><h2>{vote.name}</h2>{m.role==='ORGANIZER'&&<p>{vote.publishedAt?'Approved voting results':'Voting results preview'} · <Link className="text-action" href={`/events/${eventId}/voting`}>Open voting controls</Link></p>}<VotingResults poll={vote}/></section>:<section><h2>Voting results have not been shared yet</h2><p>Results will appear here when your organizer shares them.</p></section>}</>:<ResultCenter initial={await readResultCenter(user.id,eventId)} share={share}/>}</Shell>;
}

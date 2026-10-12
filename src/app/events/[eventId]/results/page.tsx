import {requireMembership} from '@/lib/auth';
import {readResults} from '@/server/results';
import {Shell} from '@/components/Shell';
import {EventIdentity} from '@/components/EventIdentity';
import {ResultsReview} from '@/components/ResultsReview';
import {FinalResults} from '@/components/FinalResults';
export default async function ResultsPage({params}:{params:Promise<{eventId:string}>}){const {eventId}=await params;const {user,m}=await requireMembership(eventId);const data=await readResults(user.id,eventId);return <Shell name={user.name} title={m.role==='ORGANIZER'?'Results & reveal':'Final results'} role={m.role} eventId={eventId}><EventIdentity event={m.event} showState={false}/>{m.role==='ORGANIZER'?<ResultsReview initial={data}/>:<FinalResults data={data}/>}</Shell>}

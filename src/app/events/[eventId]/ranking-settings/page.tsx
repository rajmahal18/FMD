import {requireOrganizer} from '@/lib/organizer';
import {readOverall} from '@/server/overall';
import {Shell} from '@/components/Shell';
import {OverallRanking} from '@/components/OverallRanking';
export default async function RankingSettings({params}:{params:Promise<{eventId:string}>}){
 const {eventId}=await params;const {user,m}=await requireOrganizer(eventId);
 return <Shell name={user.name} title="Ranking rules" role="ORGANIZER" eventId={eventId}><p>Configure activities, overall weights and placement credits. Enter placements and publish results in Live operations.</p><OverallRanking key={eventId} eventId={eventId} initial={await readOverall(user.id,eventId)} archived={!!m.event.archivedAt} mode="setup"/></Shell>;
}

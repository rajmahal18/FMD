import {requireMembership} from '@/lib/auth';
import {readOverall,readPublishedOverall} from '@/server/overall';
import {Shell} from '@/components/Shell';
import {OverallRanking} from '@/components/OverallRanking';
export default async function OverallPage({params}:{params:Promise<{eventId:string}>}){
 const {eventId}=await params;const {user,m}=await requireMembership(eventId);
 return <Shell name={user.name} title="Team Building Overall Ranking" role={m.role} eventId={eventId}>{m.role==='ORGANIZER'?<><p>Combine Amazing Race results with placements from other team building activities. Teams come from Teams &amp; agents.</p><OverallRanking eventId={eventId} initial={await readOverall(user.id,eventId)} archived={!!m.event.archivedAt}/></>:<PublishedOverall data={await readPublishedOverall(user.id,eventId)}/>}</Shell>;
}
function PublishedOverall({data}:{data:Awaited<ReturnType<typeof readPublishedOverall>>}){
 if(!data.published)return <section><h2>Overall results are not published yet</h2><p>The organizer must review and finalize all activity results before overall standings appear here.</p></section>;
 return <section className="overall-ranking"><h2>Final overall standings</h2><p>Amazing Race and other activity contributions are included in these totals.</p>{data.rows.map(r=><article className="overall-standing" key={r.id}><h3>{r.rank}. {r.name}<span>{r.value}%</span></h3>{r.contributions.map(c=><p key={c.eventId}><strong>{data.activities.find(e=>e.id===c.eventId)?.name}</strong> | Place {c.rank} | {c.contribution}%</p>)}</article>)}</section>;
}

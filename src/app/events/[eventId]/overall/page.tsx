import {formatScore} from '@/lib/score-format';
import {ResultContext} from '@/components/ResultContext';
import {requireMembership} from '@/lib/auth';
import {readOverall,readPublishedOverall} from '@/server/overall';
import {Shell} from '@/components/Shell';
import {OverallRanking} from '@/components/OverallRanking';
export default async function OverallPage({params}:{params:Promise<{eventId:string}>}){
 const {eventId}=await params;const {user,m}=await requireMembership(eventId);
 return <Shell name={user.name} title="Combined results" role={m.role} eventId={eventId}><ResultContext actorId={user.id} eventId={eventId} resultKey="overall"/>{m.role==='ORGANIZER'?<><OverallRanking eventId={eventId} initial={await readOverall(user.id,eventId)} archived={!!m.event.archivedAt}/></>:<PublishedOverall data={await readPublishedOverall(user.id,eventId)}/>}</Shell>;
}
function PublishedOverall({data}:{data:Awaited<ReturnType<typeof readPublishedOverall>>}){
 if(!data.published)return <section><h2>Combined results have not been shared yet</h2><p>Results will appear here when your organizer shares them.</p></section>;
 return <section className="overall-ranking"><h2>Combined standings</h2><p>Amazing Race and other activity contributions are included in these totals.</p>{data.rows.map(r=><article className="overall-standing" key={r.id}><h3>{r.rank}. {r.name}<span>{formatScore(r.value)}%</span></h3>{r.contributions.map(c=><p key={c.eventId}><strong>{data.activities.find(e=>e.id===c.eventId)?.name}</strong> | Place {c.rank} | {c.source==='JUDGING'&&<>Average {formatScore(c.average??0)}/{c.maximum} | </>}{formatScore(c.contribution??0)}%</p>)}</article>)}</section>;
}

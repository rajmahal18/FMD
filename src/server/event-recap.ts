import 'server-only';
import {db} from '@/lib/db';
import {snapshotShared} from './result-sharing-policy';
import {readPublishedOverall} from './overall';
import {readOverallBreakdown} from './overall-breakdown';
import {readVoting} from './voting';
import {readJudging} from './judging';
import {readResults} from './results';

/** Navigation hint only; each result reader independently enforces identity and sharing. */
export async function eventRecapFocused(eventId:string,role:string,state:string){
 if(role==='ORGANIZER'||state!=='FINALIZED')return false;
 const record=await db().overallRanking.findUnique({where:{eventId},select:{revision:true,finalized:true}});
 return !!(record?.finalized as {eventRecapEnabled?:boolean}|null)?.eventRecapEnabled&&await snapshotShared(db(),eventId,'overall',record!.revision,role);
}
export async function readEventRecap(actorId:string,eventId:string){
 const [overall,breakdown,voting,judging,race]=await Promise.all([readPublishedOverall(actorId,eventId),readOverallBreakdown(actorId,eventId),readVoting(actorId,eventId),readJudging(actorId,eventId),readResults(actorId,eventId)]);
 const stations=race.revealed?await db().station.findMany({where:{eventId},select:{id:true,name:true}}):[];
 const visibleContests=judging.contests.filter(c=>c.published&&c.resultsVisible);
 const sheets=breakdown.visible&&breakdown.approved?await db().judgingScore.findMany({where:{eventId,contestId:{in:visibleContests.map(c=>c.id)},submittedAt:{not:null},assignment:{active:true},contest:{state:'PUBLISHED'}},select:{contestId:true,candidateId:true,scores:true,totalHundredths:true,assignment:{select:{membership:{select:{user:{select:{name:true}}}}}}},orderBy:{assignment:{membership:{user:{name:'asc'}}}}}):[];
 // Only approved, audience-shared snapshots enter the member-facing recap.
 return {eventId,overall,stationNames:Object.fromEntries(stations.map(s=>[s.id,s.name])),breakdown:breakdown.visible&&breakdown.approved?breakdown:null,
  polls:voting.polls.filter(p=>p.publishedAt&&p.results).map(p=>({id:p.id,name:p.name,ballots:p.ballotCount,results:p.results!})),
  contests:visibleContests.map(c=>({id:c.id,...c.published!,sheets:sheets.filter(s=>s.contestId===c.id).map(s=>({candidateId:s.candidateId,judge:s.assignment.membership.user.name,total:s.totalHundredths/100,scores:s.scores as Record<string,number>}))})),
  race:race.revealed?{teams:race.teams,revision:race.latest?.revision}:null};
}
export type EventRecapData=Awaited<ReturnType<typeof readEventRecap>>;

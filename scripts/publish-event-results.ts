import 'dotenv/config';
import {randomUUID} from 'node:crypto';
import {db} from '../src/lib/db';
import {readVoting,votingAction} from '../src/server/voting';
import {readOverall,saveOverall} from '../src/server/overall';
import {readResultCenter,changeResultSharing} from '../src/server/result-sharing';
import {readEventRecap} from '../src/server/event-recap';
import {overallComplete,overallStandings} from '../src/lib/overall';
import {handlerAwardResults,isAwardWinner} from '../src/lib/award-results';

// Run with: node --conditions=react-server --import tsx scripts/publish-event-results.ts EVENT_ID ORGANIZER_USER_ID [--confirm]
// Default is a read-only review. Uses the same scoped, audited commands as the organizer UI.
async function main(){
 const [eventId,actorId,confirm]=process.argv.slice(2);
 if(!eventId||!actorId||confirm&&confirm!=='--confirm')throw Error('Provide event ID, organizer user ID and optional --confirm.');
 const voting=await readVoting(actorId,eventId);
 if(!voting.organizer)throw Error('Active organizer access is required.');
 const overall=await readOverall(actorId,eventId),rows=overallStandings(overall.config,overall.teams,overall.judgingSources);
 if(overall.raceState!=='FINALIZED'||overall.stale||!overallComplete(overall.config,rows))throw Error('Approve complete activity and race results before publishing the event recap.');
 console.log('Overall weights:',JSON.stringify(overall.config.events.map(e=>({name:e.name,weight:e.weight,source:e.source}))));
 console.log('Overall standings:',JSON.stringify(rows.map(r=>({name:r.name,rank:r.rank,total:r.value}))));
 // Read assigned handler ballots only for this reviewed award decision; never output other ballots.
 const handlerChoices=await db().squadHandler.findMany({where:{eventId,membership:{active:true,role:'FACILITATOR',user:{active:true}}},select:{teamId:true,membershipId:true}});
 const polls=await db().votingEvent.findMany({where:{eventId},select:{id:true,ballots:{select:{voterMembershipId:true,choices:{select:{candidateMembershipId:true}}}}}});
 for(const poll of voting.polls){
  const results=poll.config?.squadAward&&!poll.publishedAt?handlerAwardResults(poll.config,poll.results??[],handlerChoices.map(h=>({teamId:h.teamId,choices:polls.find(p=>p.id===poll.id)?.ballots.find(b=>b.voterMembershipId===h.membershipId)?.choices.map(c=>c.candidateMembershipId)??[]}))):poll.results??[];
  console.log(poll.name,JSON.stringify(results.filter(isAwardWinner).map(r=>({name:r.name,group:r.squadName??r.category??'',votes:r.votes,basis:r.winnerBasis??'VOTE_COUNT'}))));
 }
 if(!confirm){console.log('Read-only review complete. --confirm approves voting and overall results and shares all approved breakdowns with participants and facilitators.');return;}
 for(let poll of voting.polls){
  if(poll.publishedAt)continue;
  if(poll.enabled){await votingAction(actorId,eventId,{operation:'setEnabled',id:poll.id,revision:poll.revision,enabled:false,requestKey:randomUUID()});poll=(await readVoting(actorId,eventId)).polls.find(p=>p.id===poll.id)!;}
  await votingAction(actorId,eventId,{operation:'publish',id:poll.id,revision:poll.revision,...(poll.config?.squadAward?{winnerBasis:'HANDLER_CHOICE'}:{}),requestKey:randomUUID()});
 }
 if(!overall.finalized)await saveOverall(actorId,eventId,{operation:'finalize',revision:overall.revision,config:overall.config,eventRecapEnabled:true,expectedJudgingRevisions:Object.fromEntries(overall.judgingSources.map(s=>[s.id,s.revision]))});
 else if(!(overall.finalized as {eventRecapEnabled?:boolean}).eventRecapEnabled)throw Error('Existing overall approval does not enable the recap. Reopen and review it before enabling event results.');
 const center=await readResultCenter(actorId,eventId);
 const keys=center.items.filter(i=>i.approved&&i.key!=='overall'&&i.key!=='overall-breakdown').map(i=>i.key).concat(['overall','overall-breakdown']);
 for(const key of keys){
  const current=await readResultCenter(actorId,eventId),item=current.items.find(i=>i.key===key)!;
  if(item.facilitators==='PUBLISHED'&&item.participants==='PUBLISHED')continue;
  const command={key,sourceRevision:item.sourceRevision,sharingRevision:item.sharingRevision,runRevision:current.runRevision,facilitators:'PUBLISHED',participants:'PUBLISHED'};
  const preview=await changeResultSharing(actorId,eventId,{...command,operation:'preview'});
  if(!('token' in preview))throw Error('Sharing review unavailable.');
  await changeResultSharing(actorId,eventId,{...command,operation:'confirm',token:preview.token,requestKey:randomUUID()});
 }
 const recap=await readEventRecap(actorId,eventId);
 console.log('Published:',JSON.stringify({votingAwards:recap.polls.length,judgedActivities:recap.contests.length,overall:recap.overall.published,detailedScores:!!recap.breakdown}));
}
main().catch(e=>{console.error(e.message);process.exitCode=1;}).finally(()=>db().$disconnect());

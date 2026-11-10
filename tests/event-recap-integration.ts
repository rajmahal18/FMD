import {PGlite} from '@electric-sql/pglite';
import {PGLiteSocketServer} from '@electric-sql/pglite-socket';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';

// Isolated database only. Run with --conditions=react-server --import tsx.
const pg=await PGlite.create();
for(const dir of fs.readdirSync('prisma/migrations').sort()){const file=path.join('prisma/migrations',dir,'migration.sql');if(fs.existsSync(file))await pg.exec(fs.readFileSync(file,'utf8'));}
const socket=new PGLiteSocketServer({db:pg,host:'127.0.0.1',port:5558});await socket.start();
process.env.DB_POOL_SIZE='1';
process.env.DATABASE_URL='postgresql://postgres:postgres@127.0.0.1:5558/postgres';
const {db}=await import('../src/lib/db');
const d=db();
try{
 const {votingAction,readVoting}=await import('../src/server/voting');
 const {saveOverall,readOverall}=await import('../src/server/overall');
 const {changeResultSharing,readResultCenter}=await import('../src/server/result-sharing');
 const {readEventRecap,eventRecapFocused}=await import('../src/server/event-recap');
 const {isAwardWinner}=await import('../src/lib/award-results');
 const eventId='recap-event';
 await d.event.create({data:{id:eventId,slug:eventId,name:'Recap test',state:'FINALIZED'}});
 for(const id of ['organizer','handler','leader','choice','supporter','outsider'])await d.user.create({data:{id,name:id,email:id+'@example.test',passwordHash:'unused-test-value'}});
 await d.team.createMany({data:[{id:'squad',eventId,name:'Squad'},{id:'other',eventId,name:'Other'}]});
 for(const [id,role,teamId] of [['organizer','ORGANIZER',null],['handler','FACILITATOR',null],['leader','PARTICIPANT','squad'],['choice','PARTICIPANT','squad'],['supporter','PARTICIPANT','squad']] as const)await d.eventMembership.create({data:{id,userId:id,eventId,role,teamId}});
 await d.squadHandler.create({data:{eventId,teamId:'squad',membershipId:'handler'}});
 const criteria=[{id:'quality',name:'Performance quality',description:'',maximum:100}];
 const judgeRows=[{id:'squad',name:'Squad',rank:1,average:90,maximum:100,submitted:1,judges:1},{id:'other',name:'Other',rank:2,average:80,maximum:100,submitted:1,judges:1}];
 await d.judgingContest.create({data:{id:'look',eventId,name:'Best Squad Look',state:'PUBLISHED',participantVisibility:'PUBLISHED',facilitatorVisibility:'PUBLISHED',config:{target:'TEAM',candidateIds:['squad','other'],criteria},publishedAt:new Date(),publishedResults:{name:'Best Squad Look',rows:judgeRows,criteria,publishedAt:new Date().toISOString()}}});
 await d.judgingAssignment.create({data:{eventId,contestId:'look',membershipId:'handler'}});
 for(const [id,total] of [['squad',90],['other',80]] as const)await d.judgingScore.create({data:{eventId,contestId:'look',judgeMembershipId:'handler',candidateId:id,scores:{quality:total},totalHundredths:total*100,submittedAt:new Date()}});
 await d.resultRevision.create({data:{eventId,revision:1,actorId:'organizer',reason:'Isolated approved fixture',teamStandingsJson:[{id:'squad',name:'Squad',rank:1,value:100},{id:'other',name:'Other',rank:2,value:90}],summaryJson:{teamCount:2,confirmedOutcomes:0,acceptedContacts:0,demo:true}}});
 const config={squadAward:true,squadGroups:[{id:'squad',name:'Squad',candidateIds:['leader','choice']}],voterMode:'PARTICIPANTS',voterRoles:[],voterTeamIds:[],voterMembershipIds:[],candidateIds:['leader','choice'],maxChoices:1,allowSelf:false,allowSameTeam:true};
 await d.votingEvent.create({data:{id:'award',eventId,name:'Cornerstone Award',config,opensAt:new Date(Date.now()-3600000),closesAt:new Date(Date.now()+3600000)}});
 // Vote leader wins the popular vote; the handler selects the other candidate.
 for(const [voter,candidate] of [['choice','leader'],['supporter','leader'],['handler','choice']])await d.votingBallot.create({data:{eventId,votingEventId:'award',voterMembershipId:voter,choices:{create:{candidateMembershipId:candidate}}}});
 const args={operation:'publish',id:'award',revision:1,winnerBasis:'HANDLER_CHOICE',requestKey:randomUUID()};
 await assert.rejects(votingAction('leader',eventId,args));
 await assert.rejects(readEventRecap('outsider',eventId));
 assert.equal((await readEventRecap('leader',eventId)).polls.length,0);
 await votingAction('organizer',eventId,args);
 const retry=await votingAction('organizer',eventId,args);assert("replayed" in retry&&retry.replayed);
 const published=(await readVoting('organizer',eventId)).polls[0];
 assert.deepEqual(published.results!.filter(isAwardWinner).map(r=>r.id),['choice']);
 assert.equal((await readEventRecap('leader',eventId)).polls.length,0,'approval alone must not reveal awards');
 const overallConfig={raceRule:'POINTS',events:[{id:'manual',name:'Team activity',source:'MANUAL',weight:100,credits:[100,90],ranks:{squad:1,other:2}}]};
 await d.overallRanking.create({data:{eventId,config:overallConfig}});
 await saveOverall('organizer',eventId,{operation:'finalize',revision:1,config:overallConfig,eventRecapEnabled:true});
 assert.equal(await eventRecapFocused(eventId,'PARTICIPANT','FINALIZED'),false);
 async function share(key:string){const center=await readResultCenter('organizer',eventId),item=center.items.find(i=>i.key===key)!;const command={key,sourceRevision:item.sourceRevision,sharingRevision:item.sharingRevision,runRevision:center.runRevision,participants:'PUBLISHED',facilitators:'PUBLISHED'};const preview=await changeResultSharing('organizer',eventId,{...command,operation:'preview'});assert('token' in preview);await changeResultSharing('organizer',eventId,{...command,operation:'confirm',token:preview.token,requestKey:randomUUID()});}
 for(const key of ['race','voting:award','overall','overall-breakdown'])await share(key);
 for(const actor of ['leader','handler']){const recap=await readEventRecap(actor,eventId);assert.equal(recap.polls.length,1);assert.equal(recap.polls[0].ballots,3);assert(recap.overall.published);assert(recap.breakdown?.approved);assert(!JSON.stringify(recap).includes('passwordHash'));assert(!JSON.stringify(recap).includes('ownChoices'));}
 assert(await eventRecapFocused(eventId,'PARTICIPANT','FINALIZED'));
 assert.equal(await eventRecapFocused(eventId,'ORGANIZER','FINALIZED'),false);
 assert.equal(await eventRecapFocused(eventId,'PARTICIPANT','LIVE'),false);
 await d.resultSharing.update({where:{eventId_key:{eventId,key:'voting:award'}},data:{participants:'HIDDEN'}});
 assert.equal((await readEventRecap('leader',eventId)).polls.length,0,'withdrawing sharing must remove the award');
 await d.eventMembership.update({where:{id:'leader'},data:{active:false}});
 await assert.rejects(readEventRecap('leader',eventId));
 assert((await readOverall('organizer',eventId)).finalized);
 if(process.argv.includes('--browser')){await d.eventMembership.update({where:{id:'leader'},data:{active:true}});await d.resultSharing.update({where:{eventId_key:{eventId,key:'voting:award'}},data:{participants:'PUBLISHED'}});const {eventRecapBrowser}=await import('./event-recap-browser.mjs');await eventRecapBrowser(d,eventId);}
 console.log('PASS: isolated recap publication, handler decision, replay, approval/sharing separation, participant/facilitator access, vote privacy, navigation focus, withdrawn sharing and revoked membership.');
}finally{await d.$disconnect();await socket.stop();await pg.close();}

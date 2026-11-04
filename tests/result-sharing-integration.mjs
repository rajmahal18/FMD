import {PGlite} from '@electric-sql/pglite';
import {PGLiteSocketServer} from '@electric-sql/pglite-socket';
import {spawn} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {randomUUID,randomBytes,createHash} from 'node:crypto';
const pg=await PGlite.create();for(const dir of fs.readdirSync('prisma/migrations').sort()){const f=path.join('prisma/migrations',dir,'migration.sql');if(fs.existsSync(f))await pg.exec(fs.readFileSync(f,'utf8'));}
const socket=new PGLiteSocketServer({db:pg,host:'127.0.0.1',port:5557});await socket.start();
const origin='http://127.0.0.1:3199',env={...process.env,DATABASE_URL:'postgresql://postgres:postgres@127.0.0.1:5557/postgres',DIRECT_URL:'postgresql://postgres:postgres@127.0.0.1:5557/postgres',APP_ORIGIN:origin,DB_POOL_SIZE:'1',SEED_PASSWORD:'isolated-result-sharing-password',GMAIL_USER:'',GMAIL_APP_PASSWORD:''};
let app;
try{
 await new Promise((resolve,reject)=>{const c=spawn(process.execPath,['--import','tsx','prisma/seed.ts'],{env,stdio:'ignore'});c.on('error',reject);c.on('exit',code=>code?reject(Error('Seed failed')):resolve());});
 const event=(await pg.query('SELECT id FROM "Event" WHERE slug=$1',['classified-demo'])).rows[0].id,team=(await pg.query('SELECT id FROM "Team" WHERE "eventId"=$1 LIMIT 1',[event])).rows[0].id;
 const judge=(await pg.query('SELECT m.id,m."userId" FROM "EventMembership" m JOIN "User" u ON u.id=m."userId" WHERE m."eventId"=$1 AND u.email=$2',[event,'facilitator@example.test'])).rows[0];
 app=spawn(process.execPath,['node_modules/next/dist/bin/next','start','-H','127.0.0.1','-p','3199'],{env,stdio:'ignore'});
 for(let i=0;i<60;i++){try{if((await fetch(origin)).ok)break;}catch{}if(i===59)throw Error('App did not start');await new Promise(r=>setTimeout(r,250));}
 const login=(role,returnTo)=>fetch(origin+'/api/auth/login',{method:'POST',headers:{origin,'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({email:role+'@example.test',password:env.SEED_PASSWORD,...(returnTo?{returnTo}:{})}),redirect:'manual'});
 const cookies={};for(const role of ['organizer','agent','facilitator']){const r=await login(role);assert.equal(r.status,303);cookies[role]=r.headers.get('set-cookie').split(';')[0];}
 const base='/api/events/'+event;
 const get=(url,role='facilitator')=>fetch(origin+url,{headers:{cookie:cookies[role]},redirect:'manual'});
 const data=async(role='organizer')=>(await get(base+'/judging',role)).json();
 const post=(role,body)=>fetch(origin+base+'/judging',{method:'POST',headers:{cookie:cookies[role],origin,'content-type':'application/json'},body:JSON.stringify({runRevision:0,requestKey:randomUUID(),...body})});

 const request=async(path,body,role='organizer',requestOrigin=origin)=>{const r=await fetch(origin+base+path,{method:'POST',headers:{cookie:cookies[role],origin:requestOrigin,'content-type':'application/json'},body:JSON.stringify(body)});return {status:r.status,...await r.json()};};
 const center=async(role='organizer')=>(await get(base+'/result-sharing',role)).json();
 const plan=async(key,facilitators='PUBLISHED',participants='PUBLISHED')=>{const state=await center(),item=state.items.find(r=>r.key===key);return {key,facilitators,participants,sourceRevision:item.sourceRevision,sharingRevision:item.sharingRevision,runRevision:state.runRevision};};
 const review=body=>request('/result-sharing',{...body,operation:'preview'});
 const commit=(body,preview,key=randomUUID())=>request('/result-sharing',{...body,operation:'confirm',token:preview.token,requestKey:key});
 const share=async(key,facilitators='PUBLISHED',participants='PUBLISHED')=>{const body=await plan(key,facilitators,participants),preview=await review(body);assert.equal(preview.status,200,JSON.stringify(preview));const r=await commit(body,preview);assert.equal(r.status,200,JSON.stringify(r));return r;};
 assert((await center()).items.every(i=>i.participants==='HIDDEN'&&i.facilitators==='HIDDEN'));
 assert.deepEqual((await center('agent')).items,[]);
 assert.equal((await request('/result-sharing',{...await plan('race'),operation:'preview'},'agent')).status,403);
 assert.equal((await request('/result-sharing',{...await plan('race'),operation:'preview'},'organizer','https://evil.test')).status,403);
 assert.equal((await review(await plan('race'))).status,400,'Unapproved race results cannot be pre-scheduled for release');
 assert.equal((await request('/result-sharing',{...await plan('race'),key:'judging:foreign',operation:'preview'})).status,404);
 await pg.query('INSERT INTO "Team" (id,"eventId",name) VALUES ($1,$2,$3)',['sharing-bravo',event,'Bravo']);
 const teams=[team,'sharing-bravo'];
 const config={target:'TEAM',candidateIds:teams,criteria:[{id:'impact',name:'Impact',description:'',maximum:100}]};
 const created=await post('organizer',{operation:'createContest',name:'Gala result sharing',instructions:'Private judge instructions',config,judgeIds:[judge.id]});assert.equal(created.status,200);const id=(await created.json()).targetId,key='judging:'+id;
 assert.equal((await data()).contests.find(c=>c.id===id).participantVisibility,'HIDDEN');
 const combinedConfig={raceRule:'POINTS',events:[{id:'gala',name:'Gala',source:'JUDGING',contestId:id,weight:100,credits:[100,90],ranks:{}}]};
 assert.equal((await request('/overall',{operation:'save',revision:0,config:combinedConfig})).status,200);
 assert.equal((await post('organizer',{operation:'open',contestId:id,revision:1})).status,200);
 const score=(candidateId,version,value)=>post('facilitator',{operation:'submitScore',contestId:id,revision:2,candidateId,version,scores:{impact:value}});
 assert.equal((await score(team,0,80)).status,200);
 let body=await plan(key,'LIVE','HIDDEN'),preview=await review(body);assert.equal(preview.status,200);assert(preview.effects[0].includes('will not see'));assert.equal((await data('agent')).contests.length,0,'Preview alone has no effect');
 assert.equal((await commit(body,preview)).status,200);assert.equal((await data()).contests.find(c=>c.id===id).revision,2,'Sharing does not invalidate judge forms');
 body=await plan(key,'LIVE','LIVE');preview=await review(body);assert.equal((await score(team,1,85)).status,200);assert.equal((await commit(body,preview)).status,409,'New judge scores invalidate audience review');
 preview=await review(body);const replayKey=randomUUID(),responses=await Promise.all([commit(body,preview,replayKey),commit(body,preview,replayKey)]);assert(responses.every(r=>r.status===200));assert(responses.some(r=>r.replayed));
 assert.equal((await data('agent')).contests[0].resultsStatus,'PARTIAL');assert.deepEqual((await data('agent')).contests[0].ownSheets,[]);assert(!JSON.stringify(await center('agent')).includes('Private judge instructions'));
 assert.equal((await score('sharing-bravo',0,75)).status,200);
 assert.equal((await post('organizer',{operation:'close',contestId:id,revision:2})).status,200);assert.equal((await post('organizer',{operation:'publish',contestId:id,revision:3})).status,200);
 assert.equal((await data('agent')).contests[0].resultsStatus,'PUBLISHED','Explicit live sharing remains enabled');
 await share(key,'PUBLISHED','HIDDEN');assert.equal((await data('agent')).contests.length,0);
 const finalize=async()=>{const d=await (await get(base+'/overall?view=draft','organizer')).json();return request('/overall',{operation:'finalize',revision:d.revision,config:d.config,expectedJudgingRevisions:{[id]:(await data()).contests.find(c=>c.id===id).revision}});};
 assert.equal((await finalize()).status,200);assert.equal((await (await get(base+'/overall','agent')).json()).published,false,'Approval does not release combined results');
 assert.equal((await review(await plan('overall'))).status,409,'Hidden component scores cannot leak through combined results');
 await share(key);await share('overall');assert.equal((await (await get(base+'/overall','agent')).json()).published,true);
 // Historical MANUAL + contestId snapshots follow the same source privacy rules.
 const legacy=(await pg.query('SELECT finalized FROM "OverallRanking" WHERE "eventId"=$1',[event])).rows[0].finalized;legacy.config.events[0].source='MANUAL';await pg.query('UPDATE "OverallRanking" SET finalized=$1 WHERE "eventId"=$2',[JSON.stringify(legacy),event]);
 await pg.query('UPDATE "JudgingContest" SET "participantVisibility"=$1 WHERE id=$2',['HIDDEN',id]);assert.equal((await (await get(base+'/overall','agent')).json()).published,false,'Legacy linked contests must not bypass audience privacy');await pg.query('UPDATE "JudgingContest" SET "participantVisibility"=$1 WHERE id=$2',['PUBLISHED',id]);
 await share(key,'PUBLISHED','HIDDEN');assert.equal((await (await get(base+'/overall','agent')).json()).published,false);
 await share(key);assert.equal((await (await get(base+'/overall','agent')).json()).published,false,'Sharing a component again does not silently re-release combined results');await share('overall');
 assert.equal((await post('organizer',{operation:'unpublish',contestId:id,revision:4,reason:'Review a correction'})).status,200);assert.equal((await data('agent')).contests.length,0);assert.equal((await (await get(base+'/overall','agent')).json()).published,false);
 assert.equal((await post('organizer',{operation:'publish',contestId:id,revision:5})).status,200);assert.equal((await data('agent')).contests.length,0,'A new approved snapshot is hidden until shared');
 // Race approval and re-approval are also separate from audience release.
 await pg.query('UPDATE "Event" SET state=$1 WHERE id=$2',['ENDED',event]);
 const raceAction=async operation=>{const p=await request('/results-preview',{operation,reason:'Review race sharing test'});assert.equal(p.status,200,JSON.stringify(p));return request('/results',{operation,reason:'Review race sharing test',previewToken:p.token,requestKey:randomUUID()});};
 assert.equal((await raceAction('finalizeResults')).status,200);assert.equal((await (await get(base+'/results','agent')).json()).revealed,false);
 await share('race','PUBLISHED','HIDDEN');assert.equal((await (await get(base+'/results','facilitator')).json()).revealed,true);assert.equal((await (await get(base+'/results','agent')).json()).revealed,false);
 await share('race');assert.equal((await (await get(base+'/results','agent')).json()).revealed,true);assert.equal((await raceAction('reopenFinalResults')).status,200);assert.equal((await raceAction('finalizeResults')).status,200);assert.equal((await (await get(base+'/results','agent')).json()).revealed,false);
 // Voting approval hides counts until the intended audience is confirmed.
 const member=(await pg.query('SELECT id FROM "EventMembership" WHERE "eventId"=$1 AND role=$2 LIMIT 1',[event,'PARTICIPANT'])).rows[0].id;
 const voting=await request('/voting',{operation:'create',requestKey:randomUUID(),input:{name:'Agent of the night',instructions:'',opensAt:new Date(Date.now()-60000).toISOString(),closesAt:new Date(Date.now()+600000).toISOString(),config:{voterMode:'PARTICIPANTS',voterRoles:[],voterTeamIds:[],voterMembershipIds:[],candidateIds:[member,judge.id],maxChoices:1,allowSelf:true,allowSameTeam:true}}});assert.equal(voting.status,200,JSON.stringify(voting));
 assert.equal((await request('/voting',{operation:'publish',id:voting.id,revision:1,requestKey:randomUUID()})).status,200);assert.equal((await (await get(base+'/voting','agent')).json()).polls[0].results,null);assert((await (await get('/events/'+event+'/results?section=voting&poll='+voting.id,'agent')).text()).includes('Voting results have not been shared yet'));await share('voting:'+voting.id);assert(Array.isArray((await (await get(base+'/voting','agent')).json()).polls[0].results));
 const publicItems=(await center('agent')).items;assert(publicItems.some(i=>i.kind==='voting'));assert(!publicItems.some(i=>i.kind==='race'||i.kind==='overall'));
 body=await plan('race');preview=await review(body);assert.equal((await commit({...body,token:'wrong'}, {...preview,token:'0'.repeat(64)})).status,409);
 await pg.query('UPDATE "Event" SET "archivedAt"=NOW() WHERE id=$1',[event]);assert.equal((await review(body)).status,409);await pg.query('UPDATE "Event" SET "archivedAt"=NULL WHERE id=$1',[event]);
 assert.equal((await get('/api/events/foreign/result-sharing','agent')).status,403);
 await pg.query('UPDATE "EventMembership" SET active=false WHERE "eventId"=$1 AND "userId"=(SELECT id FROM "User" WHERE email=$2)',[event,'agent@example.test']);assert.equal((await get(base+'/result-sharing','agent')).status,403);
 const eventName=(await pg.query('SELECT name FROM "Event" WHERE id=$1',[event])).rows[0].name;
 const reset={operation:'resetEventRun',reason:'Clear the completed sharing rehearsal',confirmation:eventName};const resetPlan=await request('/lifecycle-preview',reset);assert.equal(resetPlan.status,200);assert.equal((await request('/lifecycle',{...reset,previewToken:resetPlan.token,requestKey:randomUUID()})).status,200);
 assert.equal((await pg.query('SELECT count(*)::int AS n FROM "ResultSharing" WHERE "eventId"=$1',[event])).rows[0].n,0);assert((await center()).items.every(i=>i.participants==='HIDDEN'&&i.facilitators==='HIDDEN'));assert.equal((await review(body)).status,409,'An old-run review cannot re-share results');
 const audit=(await pg.query('SELECT count(*)::int AS n FROM "AuditEntry" WHERE "eventId"=$1 AND action=$2',[event,'RESULTS_SHARING_CHANGED'])).rows[0].n;assert(audit>=10);
 console.log('PASS: hidden defaults, internal approval vs explicit audience release, exact score preview, no-op preview, stale-score rejection, replay/concurrency, live partials/private sheets, source privacy, no silent re-release, race/voting/combined guards, archive, CSRF, active identity and event isolation.');
}finally{if(app){app.kill();await new Promise(r=>app.once('exit',r));}await socket.stop();await pg.close();}

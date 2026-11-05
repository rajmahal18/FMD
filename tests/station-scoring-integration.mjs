import {PGlite} from '@electric-sql/pglite';
import {PGLiteSocketServer} from '@electric-sql/pglite-socket';
import {spawn} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
const pg=await PGlite.create();for(const dir of fs.readdirSync('prisma/migrations').sort()){const f=path.join('prisma/migrations',dir,'migration.sql');if(fs.existsSync(f))await pg.exec(fs.readFileSync(f,'utf8'));}
const socket=new PGLiteSocketServer({db:pg,host:'127.0.0.1',port:5561});await socket.start();
const origin='http://127.0.0.1:3206',env={...process.env,DATABASE_URL:'postgresql://postgres:postgres@127.0.0.1:5561/postgres',DIRECT_URL:'postgresql://postgres:postgres@127.0.0.1:5561/postgres',APP_ORIGIN:origin,DB_POOL_SIZE:'1',SEED_PASSWORD:'isolated-station-ranking-test',GMAIL_USER:'',GMAIL_APP_PASSWORD:''};let app;
try{
 await new Promise((resolve,reject)=>{const c=spawn(process.execPath,['--import','tsx','prisma/seed.ts'],{env,stdio:'ignore'});c.on('error',reject);c.on('exit',code=>code?reject(Error('Seed failed')):resolve());});
 const event=(await pg.query('SELECT id,name FROM "Event" WHERE slug=$1',['classified-demo'])).rows[0],eventId=event.id;
 const a=(await pg.query('SELECT "teamId" FROM "EventMembership" WHERE "eventId"=$1 AND role=$2',[eventId,'PARTICIPANT'])).rows[0].teamId;
 await pg.query('UPDATE "EventMembership" SET "isCaptain"=true WHERE "eventId"=$1 AND role=$2',[eventId,'PARTICIPANT']);
 const judge=(await pg.query('SELECT id,"userId" FROM "EventMembership" WHERE "eventId"=$1 AND role=$2',[eventId,'FACILITATOR'])).rows[0];
 const teams=[a,'station-team-b','station-team-c','station-team-d','station-team-e'],stations=Array.from({length:7},(_,i)=>'ranking-station-'+i);
 await pg.query('UPDATE "Event" SET state=$1,"isDemo"=false,"arrivalPolicy"=$2 WHERE id=$3',['LIVE','SCAN_APPROVAL_TIMED',eventId]);
 for(let i=0;i<stations.length;i++)await pg.query('INSERT INTO "Station" (id,"eventId",name,location,briefing,configured,available,"arrivalCode","timeLimitMinutes") VALUES ($1,$2,$3,$5,$6,true,true,$4,10)',[stations[i],eventId,'Ranking Station '+(i+1),i===6?'ABCDEFGH':null,'Test field','Physical challenge']);
 await pg.query('INSERT INTO "FacilitatorAssignment" (id,"membershipId","stationId") VALUES ($1,$2,$3)',['ranking-handler',judge.id,stations[6]]);
 await pg.query('INSERT INTO "RoutePlan" (id,"eventId",name,mode,"stationIds") VALUES ($1,$2,$3,$4,$5)',['ranking-route',eventId,'Seven stations','FIXED',JSON.stringify(stations)]);
 for(let i=0;i<teams.length;i++){
  if(i)await pg.query('INSERT INTO "Team" (id,"eventId",name) VALUES ($1,$2,$3)',[teams[i],eventId,'Team '+String.fromCharCode(65+i)]);
  await pg.query('INSERT INTO "TeamRouteAssignment" (id,"teamId","routeId","routeRevision",mode,"stationIds") VALUES ($1,$2,$3,1,$4,$5)',['ranking-assignment-'+i,teams[i],'ranking-route','FIXED',JSON.stringify(stations)]);
  for(let j=0;j<stations.length;j++){
   if(i===0&&j===6)continue;
   const visit=`ranking-visit-${i}-${j}`,outcome=`ranking-outcome-${i}-${j}`;
   await pg.query('INSERT INTO "StationVisit" (id,"eventId","teamId","stationId",state,"startedAt","finishedAt","confirmedAt","updatedAt") VALUES ($1,$2,$3,$4,$5,$6,$7,NOW(),NOW())',[visit,eventId,teams[i],stations[j],'COMPLETED','2026-11-05T00:00:00Z',new Date(Date.UTC(2026,10,5,0,0,(i+1)*10)).toISOString()]);
   await pg.query('INSERT INTO "StationOutcome" (id,"eventId","teamId","stationId","visitId","actorId",successful,"basePoints","durationSeconds","resultHash","confirmationJson") VALUES ($1,$2,$3,$4,$5,$6,true,100,$7,$8,$9)',[outcome,eventId,teams[i],stations[j],visit,judge.userId,(i+1)*10,'fixture','{}']);
   await pg.query('INSERT INTO "ScoreLedgerEntry" (id,"eventId","teamId","stationId","outcomeId",kind,amount) VALUES ($1,$2,$3,$4,$5,$6,100)',['ledger-'+outcome,eventId,teams[i],stations[j],outcome,'STATION']);
  }
 }
 const config={raceRule:'STATION_PLACEMENTS',raceScoring:{credits:[100,90,80,70,60],regularWeight:80,finalWeight:20,successScore:100,failedScore:0,stationIds:stations},events:[{id:'race',name:'Amazing Race',source:'SPY',weight:45,credits:[100,90,80,70,60],ranks:{}},{id:'other',name:'Other',source:'MANUAL',weight:55,credits:[100,90,80,70,60],ranks:Object.fromEntries(teams.map((id,i)=>[id,i+1]))}]};
 await pg.query('INSERT INTO "OverallRanking" ("eventId",config) VALUES ($1,$2)',[eventId,JSON.stringify(config)]);
 app=spawn(process.execPath,['node_modules/next/dist/bin/next','start','-H','127.0.0.1','-p','3206'],{env,stdio:'ignore'});
 for(let i=0;i<80;i++){try{if((await fetch(origin)).ok)break;}catch{}await new Promise(r=>setTimeout(r,250));}
 const cookies={};for(const role of ['organizer','agent','facilitator']){const r=await fetch(origin+'/api/auth/login',{method:'POST',headers:{origin,'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({email:role+'@example.test',password:env.SEED_PASSWORD}),redirect:'manual'});assert.equal(r.status,303);cookies[role]=r.headers.get('set-cookie').split(';')[0];}
 const base='/api/events/'+eventId;
 const get=(suffix,role='organizer')=>fetch(origin+base+suffix,{headers:{cookie:cookies[role]??''},redirect:'manual'});
 const post=(suffix,body,role='organizer',requestOrigin=origin)=>fetch(origin+base+suffix,{method:'POST',headers:{cookie:cookies[role]??'',origin:requestOrigin,'content-type':'application/json'},body:JSON.stringify({runRevision:0,requestKey:crypto.randomUUID(),...body})});
 assert.equal((await get('/race-final','none')).status,401);for(const role of ['agent','facilitator'])assert.equal((await get('/race-final',role)).status,403);
 assert.equal((await post('/race-final',{operation:'setRaceFinal',teamId:a,successful:true,version:0},'organizer','https://evil.invalid')).status,403);
 const arrival=await post('/race',{operation:'checkIn',credential:'ABCDEFGH'},'agent');assert.equal(arrival.status,200);
 const v=(await pg.query('SELECT * FROM "StationVisit" WHERE "teamId"=$1 AND "stationId"=$2',[a,stations[6]])).rows[0],member=(await pg.query('SELECT id FROM "EventMembership" WHERE "teamId"=$1 AND role=$2',[a,'PARTICIPANT'])).rows[0].id;
 assert.equal((await post('/race',{operation:'confirmLineup',visitId:v.id,excludedPlayerIds:[],expectedRosterIds:[member],expectedPlayersRequired:null},'facilitator')).status,200);
 assert.equal((await post('/race',{operation:'finishChallenge',visitId:v.id},'facilitator')).status,200);
 await pg.query('UPDATE "StationVisit" SET "startedAt"=$1,"finishedAt"=$2 WHERE id=$3',['2026-11-05T00:00:00Z','2026-11-05T00:00:10Z',v.id]);
 const confirmed=await post('/race',{operation:'confirmResult',visitId:v.id,successful:true,expectedPenaltySeconds:0},'facilitator');assert.equal(confirmed.status,200);assert.equal((await confirmed.json()).raceRule,'STATION_PLACEMENTS');
 let data=await (await get('/race-final')).json();assert(data.standings.every(r=>r.pending));
 const body={operation:'setRaceFinal',teamId:a,successful:true,version:0,requestKey:crypto.randomUUID()};
 for(const role of ['agent','facilitator'])assert.equal((await post('/race-final',body,role)).status,403);
 const parallel=await Promise.all([post('/race-final',body),post('/race-final',body)]);assert(parallel.every(r=>r.status===200));assert((await Promise.all(parallel.map(r=>r.json()))).some(r=>r.replayed));
 assert.equal((await post('/race-final',{...body,requestKey:crypto.randomUUID()})).status,409);
 assert.equal((await post('/race-final',{operation:'setRaceFinal',teamId:'foreign-team',successful:true,version:0})).status,404);
 await pg.query('UPDATE "Event" SET state=$1 WHERE id=$2',['PAUSED',eventId]);assert.equal((await post('/race-final',{operation:'setRaceFinal',teamId:teams[1],successful:true,version:0})).status,409);await pg.query('UPDATE "Event" SET state=$1 WHERE id=$2',['LIVE',eventId]);
 for(let i=1;i<teams.length;i++)assert.equal((await post('/race-final',{operation:'setRaceFinal',teamId:teams[i],successful:i!==2&&i!==4,version:0})).status,200);
 data=await (await get('/race-final')).json();const b=data.standings.find(r=>r.id===teams[1]);assert.equal(b.breakdown.regularPoints,630);assert.equal(b.breakdown.regularMaximum,700);assert.equal(b.value,92);assert.equal(data.standings[0].value,100);
 assert.deepEqual(data.standings.map(r=>r.id),[a,teams[1],teams[3],teams[2],teams[4]]);
 await pg.query('UPDATE "Event" SET state=$1 WHERE id=$2',['ENDED',eventId]);
 const previewBody={operation:'finalizeResults',reason:'Verified seven station placements and manual finale'};
 const review=await fetch(origin+base+'/results-preview',{method:'POST',headers:{origin,cookie:cookies.organizer,'content-type':'application/json'},body:JSON.stringify(previewBody)});assert.equal(review.status,200);const preview=await review.json();
 const approval=await fetch(origin+base+'/results',{method:'POST',headers:{origin,cookie:cookies.organizer,'content-type':'application/json'},body:JSON.stringify({...previewBody,previewToken:preview.token,requestKey:crypto.randomUUID()})});assert.equal(approval.status,200);
 assert.equal((await post('/race-final',{operation:'setRaceFinal',teamId:a,successful:false,version:1})).status,409);
 const overall=await (await get('/overall?view=draft')).json();const combined=await post('/overall',{operation:'finalize',revision:overall.revision,config:overall.config});assert.equal(combined.status,200);const combinedData=await combined.json();assert.equal(combinedData.finalized.rows.find(r=>r.id===teams[1]).contributions.find(c=>c.eventId==='race').contribution,41.4);
 assert.equal((await (await get('/results','agent')).json()).revealed,false,'Approval does not release results');
 const reset={operation:'resetEventRun',reason:'Isolated reset verifies Final Station recovery',confirmation:event.name};
 const resetReview=await fetch(origin+base+'/lifecycle-preview',{method:'POST',headers:{origin,cookie:cookies.organizer,'content-type':'application/json'},body:JSON.stringify(reset)});assert.equal(resetReview.status,200);const resetToken=await resetReview.json();
 const resetCommit=await fetch(origin+base+'/lifecycle',{method:'POST',headers:{origin,cookie:cookies.organizer,'content-type':'application/json'},body:JSON.stringify({...reset,previewToken:resetToken.token,requestKey:crypto.randomUUID()})});assert.equal(resetCommit.status,200,await resetCommit.text());
 assert.equal((await pg.query('SELECT count(*)::int AS n FROM "RaceFinalResult" WHERE "eventId"=$1',[eventId])).rows[0].n,0);
 const checkpoint=(await pg.query('SELECT "detailsJson" FROM "AuditEntry" WHERE "eventId"=$1 AND action=$2',[eventId,'EVENT_RUN_RESET_CHECKPOINT'])).rows[0];assert.equal(checkpoint.detailsJson.snapshot.raceFinalResults.length,5);
 console.log('PASS: actual seven-station timing flow; 700-point maximum; station ranks; 80/20 final entries; direct 45% contribution; role/CSRF/stale/pause guards; concurrent replay; final lock; hidden approval; reset recovery and event-safe records.');
}finally{if(app){app.kill();await new Promise(r=>app.once('exit',r));}await socket.stop();await pg.close();}

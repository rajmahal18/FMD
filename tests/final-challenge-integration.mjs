import {PGlite} from '@electric-sql/pglite';
import {PGLiteSocketServer} from '@electric-sql/pglite-socket';
import {spawn} from 'node:child_process';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const pg=await PGlite.create();for(const dir of fs.readdirSync('prisma/migrations').sort()){const file=`prisma/migrations/${dir}/migration.sql`;if(fs.existsSync(file))await pg.exec(fs.readFileSync(file,'utf8'));}
const socket=new PGLiteSocketServer({db:pg,host:'127.0.0.1',port:5563});await socket.start();
const origin='http://127.0.0.1:3208',env={...process.env,DATABASE_URL:'postgresql://postgres:postgres@127.0.0.1:5563/postgres',DIRECT_URL:'postgresql://postgres:postgres@127.0.0.1:5563/postgres',APP_ORIGIN:origin,DB_POOL_SIZE:'1',SEED_PASSWORD:'isolated-final-challenge-test',GMAIL_USER:'',GMAIL_APP_PASSWORD:''};let app;
try{
 await new Promise((resolve,reject)=>{const c=spawn(process.execPath,['--import','tsx','prisma/seed.ts'],{env,stdio:'ignore'});c.on('error',reject);c.on('exit',code=>code?reject(Error('Seed failed')):resolve());});
 const event=(await pg.query('SELECT id FROM "Event" WHERE slug=$1',['classified-demo'])).rows[0].id,owner=(await pg.query('SELECT "userId" FROM "EventMembership" WHERE "eventId"=$1 AND role=$2',[event,'ORGANIZER'])).rows[0].userId;
 const first=(await pg.query('SELECT id,"teamId","userId" FROM "EventMembership" WHERE "eventId"=$1 AND role=$2',[event,'PARTICIPANT'])).rows[0];
 const teams=[first.teamId,...[2,3,4,5].map(i=>'defusal-team-'+i)],stations=Array.from({length:7},(_,i)=>i?'defusal-station-'+i:'demo-cipher-room');
 await pg.query('UPDATE "Event" SET state=$1,"arrivalPolicy"=$2 WHERE id=$3',['LIVE','SCAN_APPROVAL_TIMED',event]);
 await pg.query('UPDATE "EventMembership" SET "isCaptain"=true WHERE id=$1',[first.id]);
 for(let i=1;i<5;i++){
  await pg.query('INSERT INTO "Team" (id,"eventId",name) VALUES ($1,$2,$3)',[teams[i],event,'Squad '+(i+1)]);
  await pg.query('INSERT INTO "User" (id,email,name,"passwordHash") SELECT $1,$2,$3,"passwordHash" FROM "User" WHERE id=$4',['defusal-user-'+i,'captain'+(i+1)+'@example.test','Captain '+(i+1),first.userId]);
  await pg.query('INSERT INTO "EventMembership" (id,"eventId","userId",role,"teamId","isCaptain") VALUES ($1,$2,$3,$4,$5,true)',['defusal-member-'+i,event,'defusal-user-'+i,'PARTICIPANT',teams[i]]);
 }
 await pg.query('INSERT INTO "User" (id,email,name,"passwordHash") SELECT $1,$2,$3,"passwordHash" FROM "User" WHERE id=$4',['defusal-noncaptain','member@example.test','Member',first.userId]);
 await pg.query('INSERT INTO "EventMembership" (id,"eventId","userId",role,"teamId") VALUES ($1,$2,$3,$4,$5)',['defusal-noncaptain',event,'defusal-noncaptain','PARTICIPANT',first.teamId]);
 for(let j=1;j<7;j++)await pg.query('INSERT INTO "Station" (id,"eventId",name,location,briefing,configured) VALUES ($1,$2,$3,$4,$5,true)',[stations[j],event,'Station '+j,'Test','Physical game']);
 await pg.query('INSERT INTO "RoutePlan" (id,"eventId",name,mode,"stationIds") VALUES ($1,$2,$3,$4,$5)',['defusal-route',event,'Regular race','FREE',JSON.stringify(stations)]);
 for(const team of teams)await pg.query('INSERT INTO "TeamRouteAssignment" (id,"teamId","routeId","routeRevision",mode,"stationIds") VALUES ($1,$2,$3,1,$4,$5)',['route-'+team,team,'defusal-route','FREE',JSON.stringify(stations)]);
 await pg.query('INSERT INTO "OverallRanking" ("eventId",config) VALUES ($1,$2)',[event,JSON.stringify({raceRule:'STATION_PLACEMENTS',raceScoring:{credits:[100,90,80,70,60],regularWeight:80,finalWeight:20,successScore:100,failedScore:50,stationIds:stations},events:[]})]);
 async function outcome(i,j){const id=`defusal-visit-${i}-${j}`;await pg.query('INSERT INTO "StationVisit" (id,"eventId","teamId","stationId",state,"confirmedAt","updatedAt") VALUES ($1,$2,$3,$4,$5,$6,$6)',[id,event,teams[i],stations[j],'COMPLETED','2026-11-01T00:00:00Z']);await pg.query('INSERT INTO "StationOutcome" (id,"eventId","teamId","stationId","visitId","actorId",successful,"basePoints","durationSeconds","resultHash","confirmationJson") VALUES ($1,$2,$3,$4,$5,$6,true,100,60,$7,$8)',['outcome-'+id,event,teams[i],stations[j],id,owner,'fixture','{}']);await pg.query('INSERT INTO "ScoreLedgerEntry" (id,"eventId","teamId","stationId","outcomeId",kind,amount) VALUES ($1,$2,$3,$4,$5,$6,100)',['ledger-'+id,event,teams[i],stations[j],'outcome-'+id,'STATION']);}
 for(let i=0;i<5;i++)for(let j=0;j<7;j++)if(i!==4||j!==6)await outcome(i,j);
 app=spawn(process.execPath,['node_modules/next/dist/bin/next','start','-H','127.0.0.1','-p','3208'],{env,stdio:'ignore'});
 for(let i=0;i<70;i++){try{if((await fetch(origin)).ok)break;}catch{}await new Promise(r=>setTimeout(r,250));}
 const cookies={};for(const email of ['organizer','agent','facilitator','member','captain2','captain3','captain4','captain5']){const r=await fetch(origin+'/api/auth/login',{method:'POST',headers:{origin,'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({email:email+'@example.test',password:env.SEED_PASSWORD}),redirect:'manual'});assert.equal(r.status,303);cookies[email]=r.headers.get('set-cookie').split(';')[0];}
 const api='/api/events/'+event+'/final-challenge',get=(role='organizer',path=api)=>fetch(origin+path,{headers:{cookie:cookies[role]??''}}),post=(v,role='organizer',reqOrigin=origin)=>fetch(origin+api,{method:'POST',headers:{origin:reqOrigin,cookie:cookies[role]??'','content-type':'application/json'},body:JSON.stringify({requestKey:crypto.randomUUID(),runRevision:0,...v})});
 assert.equal((await get('none')).status,401);assert.equal((await get('facilitator')).status,403);assert.equal((await get('member')).status,403);assert.equal((await get('agent')).status,200);assert.equal((await (await get('agent')).json()).enabled,false);
 const pins=Object.fromEntries(teams.map((id,i)=>[id,String(i+1).padStart(6,'0')])),configure={operation:'configure',revision:0,enabled:true,durationSeconds:60,pins};
 assert.equal((await post(configure,'organizer','https://other.invalid')).status,403);assert.equal((await post(configure,'agent')).status,403);
 assert.equal((await post({...configure,pins:{[teams[0]]:'000001'}})).status,400);
 assert.equal((await post(configure)).status,200);let admin=await (await get()).json();assert.equal(admin.ready,false);assert.equal(admin.teams.length,5);
 assert.equal((await post({operation:'start',revision:admin.revision})).status,409);
 await outcome(4,6);await pg.query('UPDATE "StationVisit" SET "releaseAt"=$1 WHERE id=$2',[new Date(Date.now()+60000).toISOString(),'defusal-visit-4-6']);assert.equal((await (await get()).json()).ready,false);
 await pg.query('UPDATE "StationVisit" SET "releaseAt"=$1 WHERE id=$2',['2026-11-01T00:00:00Z','defusal-visit-4-6']);
 admin=await (await get()).json();assert(admin.ready);assert(admin.teams.every(t=>t.pinConfigured));assert(!JSON.stringify(admin).includes('scrypt:'));assert(!JSON.stringify(admin).includes('000001'));
 const regularBefore=(await pg.query('SELECT id,state,"startedAt","finishedAt","confirmedAt","releaseAt" FROM "StationVisit" ORDER BY id')).rows;
 const start={operation:'start',revision:admin.revision,requestKey:crypto.randomUUID()};const starts=await Promise.all([post(start),post(start)]);assert(starts.every(r=>r.status===200));
 admin=await (await get()).json();assert.equal(Date.parse(admin.deadlineAt)-Date.parse(admin.startedAt),60000);
 assert.equal((await post({operation:'start',revision:admin.revision})).status,409);assert.equal((await post({...configure,revision:admin.revision})).status,409);
 const firstView=await (await get('agent')).json();assert.equal(firstView.teams.length,1);assert.equal(firstView.deadlineAt,admin.deadlineAt);assert(!('pinConfigured' in firstView.teams[0]));
 assert.equal((await get('agent','/events/'+event+'/final-challenge/display')).status,404);
 const wrong={operation:'submit',pin:'999999',requestKey:crypto.randomUUID()};assert.equal((await post(wrong,'agent')).status,200);assert.equal((await post(wrong,'agent')).status,200);assert.equal((await (await get('agent')).json()).teams[0].attempts,1);
 assert.equal((await post({operation:'submit',pin:'000001'},'member')).status,403);assert.equal((await post({operation:'submit',pin:'abc123'},'agent')).status,400);
 assert.equal((await post({operation:'submit',pin:'000001'},'agent')).status,429);await new Promise(r=>setTimeout(r,1100));
 const correct={operation:'submit',pin:'000001',requestKey:crypto.randomUUID()};const submitted=await post(correct,'agent');assert.equal(submitted.status,200);assert.equal((await submitted.json()).correct,true);assert.equal((await post(correct,'agent')).status,200);
 assert.equal((await (await get('agent')).json()).teams[0].status,'DEFUSED');
 assert.equal((await (await post({operation:'submit',pin:'000001'},'captain2')).json()).correct,false);
 assert.equal((await (await post({operation:'submit',pin:'000003'},'captain3')).json()).correct,true);
 const manual=await fetch(origin+'/api/events/'+event+'/race-final',{method:'POST',headers:{origin,cookie:cookies.organizer,'content-type':'application/json'},body:JSON.stringify({operation:'setRaceFinal',teamId:teams[4],successful:true,version:0,runRevision:0,requestKey:crypto.randomUUID()})});assert.equal(manual.status,409);
 await pg.query('UPDATE "FinalChallenge" SET "deadlineAt"=$1 WHERE "eventId"=$2',[new Date(Date.now()-1000).toISOString(),event]);
 const canonical=await (await get('organizer','/api/events/'+event+'/race-final')).json();assert.equal(canonical.teams.filter(t=>t.successful===false).length,3);
 admin=await (await get()).json();assert(admin.endedAt);assert.equal(admin.teams.filter(t=>t.status==='DEFUSED').length,2);assert.equal(admin.teams.filter(t=>t.status==='EXPIRED').length,3);
 assert.equal((await (await post({operation:'submit',pin:'000004'},'captain4')).json()).expired,true);
 const results=(await pg.query('SELECT successful FROM "RaceFinalResult" WHERE "eventId"=$1',[event])).rows;assert.equal(results.length,5);assert.equal(results.filter(r=>r.successful).length,2);
 assert.deepEqual((await pg.query('SELECT id,state,"startedAt","finishedAt","confirmedAt","releaseAt" FROM "StationVisit" ORDER BY id')).rows,regularBefore);assert.equal((await pg.query('SELECT count(*)::int n FROM "ScoreLedgerEntry"')).rows[0].n,35);
 assert.equal((await pg.query('SELECT "pinHash" FROM "FinalChallengeTeam" LIMIT 1')).rows[0].pinHash.startsWith('scrypt:'),true);
 // A separate single-squad fixture exercises early all-defused completion.
 const earlyEvent='defusal-early',earlyTeam='defusal-early-team',earlyStation='defusal-early-station';
 await pg.query('INSERT INTO "Event" (id,slug,name,state) VALUES ($1,$1,$2,$3)',[earlyEvent,'Early finale','LIVE']);
 await pg.query('INSERT INTO "Team" (id,"eventId",name) VALUES ($1,$2,$3)',[earlyTeam,earlyEvent,'Early squad']);
 for(const [id,userId,role,teamId] of [['early-org',owner,'ORGANIZER',null],['early-captain',first.userId,'PARTICIPANT',earlyTeam]])await pg.query('INSERT INTO "EventMembership" (id,"eventId","userId",role,"teamId","isCaptain") VALUES ($1,$2,$3,$4,$5,true)',[id,earlyEvent,userId,role,teamId]);
 await pg.query('INSERT INTO "Station" (id,"eventId",name,location,briefing,configured) VALUES ($1,$2,$3,$4,$5,true)',[earlyStation,earlyEvent,'Regular','Test','Physical game']);
 await pg.query('INSERT INTO "RoutePlan" (id,"eventId",name,mode,"stationIds") VALUES ($1,$2,$3,$4,$5)',['early-route',earlyEvent,'Route','FIXED',JSON.stringify([earlyStation])]);
 await pg.query('INSERT INTO "TeamRouteAssignment" (id,"teamId","routeId","routeRevision",mode,"stationIds") VALUES ($1,$2,$3,1,$4,$5)',['early-assignment',earlyTeam,'early-route','FIXED',JSON.stringify([earlyStation])]);
 await pg.query('INSERT INTO "StationVisit" (id,"eventId","teamId","stationId",state,"confirmedAt","updatedAt") VALUES ($1,$2,$3,$4,$5,$6,$6)',['early-visit',earlyEvent,earlyTeam,earlyStation,'COMPLETED','2026-11-01T00:00:00Z']);
 await pg.query('INSERT INTO "StationOutcome" (id,"eventId","teamId","stationId","visitId","actorId",successful,"basePoints","durationSeconds","resultHash","confirmationJson") VALUES ($1,$2,$3,$4,$5,$6,true,100,60,$7,$8)',['early-outcome',earlyEvent,earlyTeam,earlyStation,'early-visit',owner,'fixture','{}']);
 await pg.query('INSERT INTO "OverallRanking" ("eventId",config) VALUES ($1,$2)',[earlyEvent,JSON.stringify({raceRule:'STATION_PLACEMENTS',raceScoring:{stationIds:[earlyStation]}})]);
 const earlyApi='/api/events/'+earlyEvent+'/final-challenge';
 const earlyPost=(v,role='organizer')=>fetch(origin+earlyApi,{method:'POST',headers:{origin,cookie:cookies[role],'content-type':'application/json'},body:JSON.stringify({requestKey:crypto.randomUUID(),runRevision:0,...v})});
 assert.equal((await earlyPost({operation:'configure',revision:0,enabled:true,durationSeconds:60,pins:{[earlyTeam]:'000000'}})).status,200);
 const earlySettings=await (await get('organizer',earlyApi)).json();assert.equal((await earlyPost({operation:'start',revision:earlySettings.revision})).status,200);
 assert.equal((await (await earlyPost({operation:'submit',pin:'000000'},'agent')).json()).correct,true);
 const earlyState=await (await get('organizer',earlyApi)).json();assert(earlyState.endedAt);assert(Date.parse(earlyState.endedAt)<Date.parse(earlyState.deadlineAt));assert.equal(earlyState.teams[0].status,'DEFUSED');
 // Old runs are retained but cannot activate the next run or authorize stale submits.
 await pg.query('INSERT INTO "AuditEntry" (id,"eventId",action) VALUES ($1,$2,$3)',['defusal-run-change',event,'LIFECYCLE_RESETEVENTRUN']);
 assert.equal((await (await get('agent')).json()).enabled,false);assert.equal((await post({operation:'submit',pin:'000001'},'agent')).status,409);
 console.log('PASS: disabled fallback; 5 squads/7 stations and release gate; organizer-only setup/start; hashed six-digit PINs; captain privacy; cooldown/retries; atomic success/failure; shared deadline; manual-write guard; preserved regular race and run isolation.');
}finally{if(app){app.kill();await new Promise(resolve=>app.once('exit',resolve));}await socket.stop();await pg.close();}

import {PGlite} from '@electric-sql/pglite';
import {PGLiteSocketServer} from '@electric-sql/pglite-socket';
import {spawn} from 'node:child_process';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const pg=await PGlite.create();for(const dir of fs.readdirSync('prisma/migrations').sort()){const file=`prisma/migrations/${dir}/migration.sql`;if(fs.existsSync(file))await pg.exec(fs.readFileSync(file,'utf8'));}
const socket=new PGLiteSocketServer({db:pg,host:'127.0.0.1',port:5562});await socket.start();
const origin='http://127.0.0.1:3207',env={...process.env,DATABASE_URL:'postgresql://postgres:postgres@127.0.0.1:5562/postgres',DIRECT_URL:'postgresql://postgres:postgres@127.0.0.1:5562/postgres',APP_ORIGIN:origin,DB_POOL_SIZE:'1',SEED_PASSWORD:'isolated-station-clock-test',GMAIL_USER:'',GMAIL_APP_PASSWORD:''};let app;
try{
 await new Promise((resolve,reject)=>{const child=spawn(process.execPath,['--import','tsx','prisma/seed.ts'],{env,stdio:'ignore'});child.on('error',reject);child.on('exit',code=>code?reject(Error('Seed failed')):resolve());});
 const event=(await pg.query('SELECT id FROM "Event" WHERE slug=$1',['classified-demo'])).rows[0].id;
 const player=(await pg.query('SELECT id,"teamId" FROM "EventMembership" WHERE "eventId"=$1 AND role=$2',[event,'PARTICIPANT'])).rows[0],faci=(await pg.query('SELECT id FROM "EventMembership" WHERE "eventId"=$1 AND role=$2',[event,'FACILITATOR'])).rows[0];
 const station='demo-cipher-room',next='clock-next';
 const buttons=[{id:'during',label:'During violation',seconds:10,phase:'DURING'},{id:'after',label:'After violation',seconds:30,phase:'AFTER_LIMIT'}];
 await pg.query('UPDATE "Event" SET state=$1,"arrivalPolicy"=$2 WHERE id=$3',['LIVE','SCAN_APPROVAL_TIMED',event]);
 await pg.query('UPDATE "EventMembership" SET "isCaptain"=true WHERE id=$1',[player.id]);
 await pg.query('UPDATE "Station" SET configured=true,"arrivalCode"=$1,"timeLimitMinutes"=10,"playersRequired"=1,"timePenaltyButtons"=$2 WHERE id=$3',['23456789',JSON.stringify(buttons),station]);
 await pg.query('INSERT INTO "Station" (id,"eventId",name,location,briefing,configured,"arrivalCode","timeLimitMinutes","playersRequired") VALUES ($1,$2,$3,$4,$5,true,$6,11,1)',[next,event,'Next station','Test','Physical challenge','ABCDEFGH']);
 await pg.query('INSERT INTO "FacilitatorAssignment" (id,"membershipId","stationId") VALUES ($1,$2,$3)',['clock-faci',faci.id,next]);
 await pg.query('INSERT INTO "RoutePlan" (id,"eventId",name,mode,"stationIds") VALUES ($1,$2,$3,$4,$5)',['clock-route',event,'Clock test','FREE',JSON.stringify([station,next])]);
 await pg.query('INSERT INTO "TeamRouteAssignment" (id,"teamId","routeId","routeRevision",mode,"stationIds") VALUES ($1,$2,$3,1,$4,$5)',['clock-assignment',player.teamId,'clock-route','FREE',JSON.stringify([station,next])]);
 await pg.query('INSERT INTO "OverallRanking" ("eventId",config) VALUES ($1,$2)',[event,JSON.stringify({raceRule:'TIME',events:[]})]);
 app=spawn(process.execPath,['node_modules/next/dist/bin/next','start','-H','127.0.0.1','-p','3207'],{env,stdio:'ignore'});
 for(let i=0;i<70;i++){try{if((await fetch(origin)).ok)break;}catch{}await new Promise(r=>setTimeout(r,250));}
 const cookies={};for(const role of ['organizer','agent','facilitator']){const response=await fetch(origin+'/api/auth/login',{method:'POST',headers:{origin,'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({email:role+'@example.test',password:env.SEED_PASSWORD}),redirect:'manual'});assert.equal(response.status,303);cookies[role]=response.headers.get('set-cookie').split(';')[0];}
 const base='/api/events/'+event,get=(path,role='facilitator')=>fetch(origin+base+path,{headers:{cookie:cookies[role]}}),post=(body,role='facilitator')=>fetch(origin+base+'/race',{method:'POST',headers:{origin,cookie:cookies[role],'content-type':'application/json'},body:JSON.stringify({runRevision:0,requestKey:crypto.randomUUID(),...body})});
 const row=async id=>(await pg.query('SELECT * FROM "StationVisit" WHERE id=$1',[id])).rows[0];
 assert.equal((await post({operation:'checkIn',credential:'23456789'},'agent')).status,200);
 let visit=(await pg.query('SELECT * FROM "StationVisit" WHERE "teamId"=$1',[player.teamId])).rows[0],visitId=visit.id;
 assert.equal(new Date(visit.timerDeadlineAt)-new Date(visit.startedAt),600000);
 await pg.query('UPDATE "Station" SET "timeLimitMinutes"=11 WHERE id=$1',[station]);
 const end=new Date(Date.now()-10000),start=new Date(end.getTime()-600000);
 await pg.query('UPDATE "StationVisit" SET "startedAt"=$1,"timerDeadlineAt"=$2 WHERE id=$3',[start.toISOString(),end.toISOString(),visitId]);
 const after={operation:'addTimePenalty',visitId,penaltyButtonId:'after',expectedSeconds:30,expectedLabel:'After violation',expectedPhase:'AFTER_LIMIT',requestKey:crypto.randomUUID()};
 assert.equal((await post(after)).status,200);assert.equal((await post(after)).status,200);
 visit=await row(visitId);assert.equal(visit.state,'ARRIVED');assert.equal(new Date(visit.finishedAt).getTime(),new Date(visit.timerDeadlineAt).getTime());
 assert.equal((await post({operation:'addTimePenalty',visitId,penaltyButtonId:'during',expectedSeconds:10,expectedLabel:'During violation',expectedPhase:'DURING'})).status,409);
 const lineup={operation:'confirmLineup',visitId,excludedPlayerIds:[],expectedRosterIds:[player.id],expectedPlayersRequired:1};
 assert.equal((await post(lineup)).status,200);assert.equal((await row(visitId)).state,'AWAITING_CONFIRMATION');
 assert.equal((await post({operation:'finishChallenge',visitId})).status,200,'Late Finish is harmless after automatic timeout');
 assert.equal((await pg.query('SELECT count(*)::int n FROM "StationOutcome"')).rows[0].n,0,'Timeout must never approve a result');
 assert.equal((await post({operation:'confirmResult',visitId,successful:true,expectedPenaltySeconds:0})).status,409);
 const confirm={operation:'confirmResult',visitId,successful:true,expectedPenaltySeconds:30,requestKey:crypto.randomUUID()};
 const replies=await Promise.all([post(confirm),post(confirm)]);assert(replies.every(r=>r.status===200));const result=await replies[0].json();
 assert.equal(result.durationSeconds,600);assert.equal(result.timePenaltySeconds,30);assert.equal(result.adjustedDurationSeconds,630);
 visit=await row(visitId);assert.equal(new Date(visit.releaseAt)-new Date(visit.confirmedAt),5000);
 assert.equal((await post({operation:'checkIn',credential:'ABCDEFGH'},'agent')).status,409,'A direct scan cannot bypass the release countdown');
 assert.equal((await post(after)).status,200,'Exact retries still return their original answer');
 assert.equal((await post({...after,requestKey:crypto.randomUUID()})).status,409,'New penalties are locked after approval');
 let mission=await (await get('/mission','agent')).json();assert.equal(mission.view.status,'RELEASING');assert(mission.view.active.releaseAt);assert.equal(mission.visits[0].startedAt,null);assert.equal(mission.visits[0].timerDeadlineAt,null);
 const field=await (await get('/field?stationId='+station)).json();assert.equal(field.visits[0].state,'COMPLETED');assert(field.visits[0].releaseAt);
 assert.equal((await pg.query('SELECT count(*)::int n FROM "StationOutcome"')).rows[0].n,1);assert.equal((await pg.query('SELECT count(*)::int n FROM "ScoreLedgerEntry"')).rows[0].n,1);
 // Advance only the isolated release deadline, simulating five seconds passing without any page open.
 await new Promise(resolve=>setTimeout(resolve,5500));
 mission=await (await get('/mission','agent')).json();assert.equal(mission.view.status,'HEAD_TO_STATION');
 assert.equal((await post({operation:'checkIn',credential:'ABCDEFGH'},'agent')).status,200);
 visit=(await pg.query('SELECT * FROM "StationVisit" WHERE "stationId"=$1',[next])).rows[0];assert.equal(new Date(visit.timerDeadlineAt)-new Date(visit.startedAt),660000);
 const secondId=visit.id;assert.equal((await post({...lineup,visitId:secondId})).status,200);
 const earlyStart=new Date(Date.now()-25000);await pg.query('UPDATE "StationVisit" SET "startedAt"=$1,"timerDeadlineAt"=$2 WHERE id=$3',[earlyStart.toISOString(),new Date(earlyStart.getTime()+660000).toISOString(),secondId]);
 assert.equal((await post({operation:'finishChallenge',visitId:secondId})).status,200);const early=await row(secondId);assert(new Date(early.finishedAt)<new Date(early.timerDeadlineAt));
 assert.equal((await post({operation:'confirmResult',visitId:secondId,successful:true,expectedPenaltySeconds:0})).status,200);
 assert.equal((await (await get('/mission','agent')).json()).view.status,'RELEASING');
 await pg.query('UPDATE "StationVisit" SET "releaseAt"=$1 WHERE id=$2',[new Date(Date.now()-60000).toISOString(),secondId]);
 assert.equal((await (await get('/mission','agent')).json()).view.status,'COMPLETE');
 assert.equal((await (await get('/field?stationId='+next)).json()).visits.length,0);
 assert.equal((await pg.query('SELECT count(*)::int n FROM "StationOutcome"')).rows[0].n,2);
 console.log('PASS: exact 10/11-minute snapshots, disconnected timeout, late lineup, after-limit review, early finish, atomic/idempotent approval, penalty lock, five-second server release, direct-scan protection and participant time privacy.');
}finally{if(app){app.kill();await new Promise(resolve=>app.once('exit',resolve));}await socket.stop();await pg.close();}

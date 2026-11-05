import {PGlite} from '@electric-sql/pglite';
import {PGLiteSocketServer} from '@electric-sql/pglite-socket';
import {spawn} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {randomUUID,randomBytes,createHash} from 'node:crypto';
const pg=await PGlite.create();for(const dir of fs.readdirSync('prisma/migrations').sort()){const f=path.join('prisma/migrations',dir,'migration.sql');if(fs.existsSync(f))await pg.exec(fs.readFileSync(f,'utf8'));}
const socket=new PGLiteSocketServer({db:pg,host:'127.0.0.1',port:5559});await socket.start();
const origin='http://127.0.0.1:3202',env={...process.env,DATABASE_URL:'postgresql://postgres:postgres@127.0.0.1:5559/postgres',DIRECT_URL:'postgresql://postgres:postgres@127.0.0.1:5559/postgres',APP_ORIGIN:origin,DB_POOL_SIZE:'1',SEED_PASSWORD:'isolated-faci-lineup-password',GMAIL_USER:'',GMAIL_APP_PASSWORD:''};
let app;
try{
 await new Promise((resolve,reject)=>{const c=spawn(process.execPath,['--import','tsx','prisma/seed.ts'],{env,stdio:'ignore'});c.on('error',reject);c.on('exit',code=>code?reject(Error('Seed failed')):resolve());});
 const event=(await pg.query('SELECT id FROM "Event" WHERE slug=$1',['classified-demo'])).rows[0].id,team=(await pg.query('SELECT id FROM "Team" WHERE "eventId"=$1 LIMIT 1',[event])).rows[0].id;
 await pg.query('UPDATE "Event" SET "isDemo"=false WHERE id=$1',[event]);
 const judge=(await pg.query('SELECT m.id,m."userId" FROM "EventMembership" m JOIN "User" u ON u.id=m."userId" WHERE m."eventId"=$1 AND u.email=$2',[event,'facilitator@example.test'])).rows[0];
 app=spawn(process.execPath,['node_modules/next/dist/bin/next','start','-H','127.0.0.1','-p','3202'],{env,stdio:'ignore'});
 for(let i=0;i<60;i++){try{if((await fetch(origin)).ok)break;}catch{}if(i===59)throw Error('App did not start');await new Promise(r=>setTimeout(r,250));}
 const login=(role,returnTo)=>fetch(origin+'/api/auth/login',{method:'POST',headers:{origin,'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({email:role+'@example.test',password:env.SEED_PASSWORD,...(returnTo?{returnTo}:{})}),redirect:'manual'});
 const cookies={};for(const role of ['organizer','agent','facilitator']){const r=await login(role);assert.equal(r.status,303);cookies[role]=r.headers.get('set-cookie').split(';')[0];}
 const base='/api/events/'+event;
 const get=(url,role='facilitator')=>fetch(origin+url,{headers:{cookie:cookies[role]},redirect:'manual'});
 const data=async(role='organizer')=>(await get(base+'/judging',role)).json();
 const post=(role,body)=>fetch(origin+base+'/judging',{method:'POST',headers:{cookie:cookies[role],origin,'content-type':'application/json'},body:JSON.stringify({runRevision:0,requestKey:randomUUID(),...body})});
 for(const role of ['organizer','agent','facilitator']){
  assert.equal((await login(role)).headers.get('location'),origin+'/events/'+event,'Single-event '+role+' skips event selection');
  assert.equal((await get('/workspace',role)).headers.get('location'),'/events/'+event);
  assert.equal((await get('/workspace?list=1',role)).status,200,'Explicit event list remains accessible');
  assert.equal((await get('/workspace?archived=1',role)).status,200,'Archived list is never auto-skipped');
 }
 assert.equal((await login('agent','/events/'+event+'/inbox')).headers.get('location'),origin+'/events/'+event+'/inbox','Explicit participant destinations stay intact');

 const actor=(await pg.query('SELECT m.id,m."userId",m."teamId" FROM "EventMembership" m JOIN "User" u ON u.id=m."userId" WHERE m."eventId"=$1 AND u.email=$2',[event,'agent@example.test'])).rows[0];
 for(let i=0;i<19;i++)await pg.query('INSERT INTO "User" (id,email,name,"passwordHash") SELECT $1,$2,$3,"passwordHash" FROM "User" WHERE id=$4',['lineup-user-'+i,'lineup-'+i+'@example.test','Teammate '+String(i).padStart(2,'0'),actor.userId]);
 const seed=async(policy='CAPTAIN_CONFIRM',count=19,required=15)=>{
  const id='faci-lineup-'+policy;
  await pg.query('INSERT INTO "Event" (id,slug,name,state,"arrivalPolicy") VALUES ($1,$1,$2,$3,$4)',[id,'Facilitator lineup '+policy,'LIVE',policy]);
  await pg.query('INSERT INTO "Team" (id,"eventId",name) VALUES ($1,$3,$4),($2,$3,$5)',[id+'-team',id+'-waiting',id,'Main team','Waiting team']);
  for(const [userId,role,suffix,teamId,captain] of [[actor.userId,'PARTICIPANT','captain',id+'-team',true],[judge.userId,'FACILITATOR','faci',null,false],['lineup-user-18','PARTICIPANT','waiting-member',id+'-waiting',true]])await pg.query('INSERT INTO "EventMembership" (id,"eventId","userId",role,"teamId","isCaptain") VALUES ($1,$2,$3,$4,$5,$6)',[id+'-'+suffix,id,userId,role,teamId,captain]);
  const roster=[id+'-captain'];for(let i=0;i<count-1;i++){const member=id+'-member-'+i;roster.push(member);await pg.query('INSERT INTO "EventMembership" (id,"eventId","userId",role,"teamId") VALUES ($1,$2,$3,$4,$5)',[member,id,'lineup-user-'+i,'PARTICIPANT',id+'-team']);}
  await pg.query('INSERT INTO "Station" (id,"eventId",name,location,briefing,"facilitatorInstructions",configured,"playersRequired","arrivalCode",capacity,"queueEnabled") VALUES ($1,$2,$3,$4,$5,$6,true,$7,$8,1,true)',[id+'-station',id,'Station','Venue','Private instructions until play','Facilitator instructions',required,'ABCDEFGH']);
  await pg.query('INSERT INTO "FacilitatorAssignment" (id,"membershipId","stationId") VALUES ($1,$2,$3)',[id+'-assignment',id+'-faci',id+'-station']);
  await pg.query('INSERT INTO "RoutePlan" (id,"eventId",name,mode,"stationIds") VALUES ($1,$2,$3,$4,$5)',[id+'-route',id,'Route','FIXED',JSON.stringify([id+'-station'])]);
  for(const suffix of ['team','waiting'])await pg.query('INSERT INTO "TeamRouteAssignment" (id,"teamId","routeId","routeRevision",mode,"stationIds") VALUES ($1,$2,$3,1,$4,$5)',[id+'-route-'+suffix,id+'-'+suffix,id+'-route','FIXED',JSON.stringify([id+'-station'])]);
  return {id,roster,foreign:id+'-waiting-member',team:id+'-team',waiting:id+'-waiting',station:id+'-station',faci:id+'-faci',required};
 };
 const race=async(g,role,operation,body={},key=randomUUID())=>{const r=await fetch(origin+'/api/events/'+g.id+'/race',{method:'POST',headers:{cookie:cookies[role],origin,'content-type':'application/json'},body:JSON.stringify({operation,requestKey:key,runRevision:0,...body})});return {status:r.status,...await r.json()};};
 const row=async(g,waiting=false)=>(await pg.query('SELECT * FROM "StationVisit" WHERE "teamId"=$1 AND "stationId"=$2',[waiting?g.waiting:g.team,g.station])).rows[0];
 const mission=async g=>(await fetch(origin+'/api/events/'+g.id+'/mission',{headers:{cookie:cookies.agent}})).json();
 const confirm=(g,visit,excluded=g.roster.slice(0,4))=>({visitId:visit.id,excludedPlayerIds:excluded,expectedRosterIds:g.roster,expectedPlayersRequired:g.required});
 const g=await seed();
 assert.equal((await race(g,'agent','checkIn',{credential:'ABCDEFGH',playerIds:g.roster.slice(4)})).status,409,'Captain selection cannot start a new visit');assert.equal(await row(g),undefined);
 assert.equal((await race(g,'agent','checkIn',{credential:'ABCDEFGH'})).state,'ARRIVED');let visit=await row(g);assert.equal(visit.startedAt,null);assert.equal((await pg.query('SELECT count(*)::int AS n FROM "StationVisitPlayer" WHERE "visitId"=$1',[visit.id])).rows[0].n,0);
 const captainPage=await (await fetch(origin+'/events/'+g.id,{headers:{cookie:cookies.agent}})).text();assert(captainPage.includes('Waiting for facilitator'));assert(!captainPage.includes('class="player-picker"'));assert.equal((await mission(g)).stations[0].briefing,'');
 assert.equal((await race(g,'agent','confirmLineup',confirm(g,visit))).status,403);assert.equal((await race(g,'agent','startChallenge',{visitId:visit.id,playerIds:g.roster.slice(4)})).status,403);assert.equal((await race(g,'agent','saveLineup',{stationId:g.station,playerIds:g.roster.slice(4)})).status,403);
 assert.equal((await race(g,'facilitator','startChallenge',{visitId:visit.id})).status,409,'Legacy start cannot skip the lineup review');
 for(const excluded of [[],[g.foreign],[g.roster[0],g.roster[0]],g.roster])assert.equal((await race(g,'facilitator','confirmLineup',confirm(g,visit,excluded))).status,400);
 assert.equal((await race(g,'facilitator','confirmLineup',{...confirm(g,visit),expectedRosterIds:g.roster.slice(1)})).status,409);
 await pg.query('UPDATE "Station" SET "playersRequired"=16 WHERE id=$1',[g.station]);assert.equal((await race(g,'facilitator','confirmLineup',confirm(g,visit))).status,409);await pg.query('UPDATE "Station" SET "playersRequired"=15 WHERE id=$1',[g.station]);
 await pg.query('UPDATE "EventMembership" SET active=false WHERE id=$1',[g.roster[0]]);assert.equal((await race(g,'facilitator','confirmLineup',confirm(g,visit))).status,409);await pg.query('UPDATE "EventMembership" SET active=true WHERE id=$1',[g.roster[0]]);
 await pg.query('UPDATE "Event" SET state=$1 WHERE id=$2',['PAUSED',g.id]);assert.equal((await race(g,'facilitator','confirmLineup',confirm(g,visit))).status,409);await pg.query('UPDATE "Event" SET state=$1 WHERE id=$2',['LIVE',g.id]);
 await pg.query('UPDATE "Station" SET available=false WHERE id=$1',[g.station]);assert.equal((await race(g,'facilitator','confirmLineup',confirm(g,visit))).status,409);await pg.query('UPDATE "Station" SET available=true WHERE id=$1',[g.station]);
 await pg.query('UPDATE "Event" SET "archivedAt"=$1 WHERE id=$2',[new Date().toISOString(),g.id]);assert.equal((await race(g,'facilitator','confirmLineup',confirm(g,visit))).status,409);await pg.query('UPDATE "Event" SET "archivedAt"=NULL WHERE id=$1',[g.id]);
 await pg.query('DELETE FROM "FacilitatorAssignment" WHERE "stationId"=$1',[g.station]);assert.equal((await race(g,'facilitator','confirmLineup',confirm(g,visit))).status,403);await pg.query('INSERT INTO "FacilitatorAssignment" (id,"membershipId","stationId") VALUES ($1,$2,$3)',[g.id+'-assignment',g.faci,g.station]);
 const key=randomUUID(),concurrent=await Promise.all([race(g,'facilitator','confirmLineup',confirm(g,visit),key),race(g,'facilitator','confirmLineup',confirm(g,visit),key)]);assert(concurrent.every(r=>r.status===200));assert(concurrent.some(r=>r.replayed));
 const selected=(await pg.query('SELECT "membershipId" FROM "StationVisitPlayer" WHERE "visitId"=$1',[visit.id])).rows.map(r=>r.membershipId).sort();assert.deepEqual(selected,g.roster.slice(4).sort());visit=await row(g);assert.equal(visit.state,'ACTIVE');assert(visit.startedAt);assert(visit.arrivalApprovedAt);assert(visit.lineupSubmittedAt);assert.equal((await mission(g)).stations[0].briefing,'Private instructions until play');
 assert.equal((await race(g,'facilitator','confirmLineup',confirm(g,visit))).status,409,'Started lineups are immutable');assert.equal((await pg.query('SELECT count(*)::int AS n FROM "AuditEntry" WHERE "eventId"=$1 AND action=$2',[g.id,'RACE_CONFIRMLINEUP'])).rows[0].n,1);
 assert.equal((await race(g,'facilitator','finishChallenge',{visitId:visit.id})).status,200);assert.equal((await mission(g)).team.members.every(p=>p.played===0),true);assert.equal((await race(g,'facilitator','confirmResult',{visitId:visit.id,successful:true})).status,200);
 const members=(await mission(g)).team.members;assert.equal(members.filter(p=>p.played===1).length,15);assert.equal(members.filter(p=>p.played===0).length,4);assert(members.every(p=>p.explored===1));
 // Every historical arrival policy keeps its timing but delegates lineup confirmation.
 for(const policy of ['PRESELECT_APPROVAL','SCAN_APPROVAL_TIMED','ARRIVAL_LINEUP_APPROVAL']){
  const f=await seed(policy,1,1);assert.equal((await race(f,'agent','checkIn',{credential:'ABCDEFGH'})).state,'ARRIVED');const v=await row(f),isTimed=policy==='SCAN_APPROVAL_TIMED';assert.equal(!!v.startedAt,isTimed);
  if(isTimed)await pg.query('UPDATE "StationVisit" SET "startedAt"=$1 WHERE id=$2',[new Date(Date.now()-30000).toISOString(),v.id]);const started=String((await row(f)).startedAt);
  assert.equal((await race(f,'facilitator','confirmLineup',confirm(f,v,[]))).state,'ACTIVE');if(isTimed)assert.equal(String((await row(f)).startedAt),started,'Lineup confirmation preserves QR timing');
  const waitingLogin=await login('lineup-18');cookies.waiting=waitingLogin.headers.get('set-cookie').split(';')[0];assert.equal((await race(f,'waiting','checkIn',{credential:'ABCDEFGH'})).state,'QUEUED');const queued=await row(f,true);assert.equal(queued.startedAt,null);assert.equal((await race(f,'facilitator','confirmLineup',{visitId:queued.id,excludedPlayerIds:[],expectedRosterIds:[f.foreign],expectedPlayersRequired:1})).status,409);
  await race(f,'facilitator','finishChallenge',{visitId:v.id});assert.equal((await race(f,'facilitator','confirmResult',{visitId:v.id,successful:true})).status,200);const admitted=await row(f,true);assert.equal(admitted.state,'ARRIVED');assert.equal(!!admitted.startedAt,isTimed);assert.equal((await race(f,'facilitator','confirmLineup',{visitId:admitted.id,excludedPlayerIds:[],expectedRosterIds:[f.foreign],expectedPlayersRequired:1})).state,'ACTIVE');
 }
 console.log('PASS: facilitator-only 19-minus-4 lineup, captain arrival-only, exact/foreign/duplicate/roster/requirement guards, assignment/pause/archive checks, atomic concurrent retries, immutable starts, actual participation and preserved scan/queue timing across all policies.');
}finally{if(app){app.kill();await new Promise(r=>app.once('exit',r));}await socket.stop();await pg.close();}

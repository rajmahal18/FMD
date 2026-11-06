import {PGlite} from '@electric-sql/pglite';
import {PGLiteSocketServer} from '@electric-sql/pglite-socket';
import {spawn} from 'node:child_process';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {shareResult} from './result-sharing-helpers.mjs';
const pg=await PGlite.create();for(const dir of fs.readdirSync('prisma/migrations').sort()){const f=`prisma/migrations/${dir}/migration.sql`;if(fs.existsSync(f))await pg.exec(fs.readFileSync(f,'utf8'));}
const socket=new PGLiteSocketServer({db:pg,host:'127.0.0.1',port:5564});await socket.start();
const origin='http://127.0.0.1:3209',env={...process.env,DATABASE_URL:'postgresql://postgres:postgres@127.0.0.1:5564/postgres',DIRECT_URL:'postgresql://postgres:postgres@127.0.0.1:5564/postgres',APP_ORIGIN:origin,DB_POOL_SIZE:'1',SEED_PASSWORD:'isolated-breakdown-password',GMAIL_USER:'',GMAIL_APP_PASSWORD:''};let app;
try{
 await new Promise((resolve,reject)=>{const c=spawn(process.execPath,['--import','tsx','prisma/seed.ts'],{env,stdio:'ignore'});c.on('error',reject);c.on('exit',code=>code?reject(Error('Seed failed')):resolve());});
 const event=(await pg.query('SELECT id FROM "Event" WHERE slug=$1',['classified-demo'])).rows[0].id;
 await pg.query('INSERT INTO "Team" (id,"eventId",name) VALUES ($1,$2,$3)',['breakdown-team-two',event,'Second squad']);
 const teams=(await pg.query('SELECT id,name FROM "Team" WHERE "eventId"=$1 ORDER BY name',[event])).rows;
 const org=(await pg.query('SELECT "userId" FROM "EventMembership" WHERE "eventId"=$1 AND role=$2',[event,'ORGANIZER'])).rows[0].userId;
 const firstJudge=(await pg.query('SELECT id FROM "EventMembership" WHERE "eventId"=$1 AND role=$2',[event,'FACILITATOR'])).rows[0].id;
 for(const id of ['sheet-judge-two','sheet-inactive-judge']){await pg.query('INSERT INTO "User" (id,email,name,"passwordHash") SELECT $1,$2,$3,"passwordHash" FROM "User" WHERE email=$4',[id,id+'@example.test',id,'facilitator@example.test']);await pg.query('INSERT INTO "EventMembership" (id,"eventId","userId",role) VALUES ($1,$2,$1,$3)',[id,event,'FACILITATOR']);}
 const contest='breakdown-gala',criteria=[{id:'impact',name:'Impact',description:'',maximum:100}],judging={target:'TEAM',candidateIds:teams.map(t=>t.id),criteria};
 await pg.query('INSERT INTO "JudgingContest" (id,"eventId",name,config,state) VALUES ($1,$2,$3,$4,$5)',[contest,event,'Gala',JSON.stringify(judging),'OPEN']);
 for(const [id,active] of [[firstJudge,true],['sheet-judge-two',true],['sheet-inactive-judge',false]])await pg.query('INSERT INTO "JudgingAssignment" ("eventId","contestId","membershipId",active) VALUES ($1,$2,$3,$4)',[event,contest,id,active]);
 for(let i=0;i<2;i++)for(const [j,id] of [firstJudge,'sheet-judge-two','sheet-inactive-judge'].entries()){const score=j===2?100:80-i*20+j*10;await pg.query('INSERT INTO "JudgingScore" (id,"eventId","contestId","judgeMembershipId","candidateId",scores,"totalHundredths","submittedAt","updatedAt") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW())',[`sheet-${i}-${j}`,event,contest,id,teams[i].id,JSON.stringify({impact:score}),score*100,j===1?null:new Date().toISOString()]);}
 await pg.query('UPDATE "Event" SET state=$1 WHERE id=$2',['FINALIZED',event]);
 await pg.query('INSERT INTO "ResultRevision" (id,"eventId",revision,"actorId",reason,"teamStandingsJson","summaryJson") VALUES ($1,$2,1,$3,$4,$5,$6)',['breakdown-race',event,org,'Isolated approved race fixture',JSON.stringify(teams.map(t=>({id:t.id,name:t.name,rank:1,value:88,rule:'STATION_PLACEMENTS'}))),'{}']);
 const config={raceRule:'STATION_PLACEMENTS',raceScoring:{credits:[100,90,80,70,60],regularWeight:80,finalWeight:20,successScore:100,failedScore:50,stationIds:['demo-cipher-room']},events:[{id:'race',name:'Race',source:'SPY',weight:45,credits:[100,90],ranks:{}},{id:'gala',name:'Gala',source:'JUDGING',contestId:contest,weight:45,credits:[100,90],ranks:{}},{id:'manual',name:'Manual award',source:'MANUAL',weight:10,credits:[100,90],ranks:{[teams[0].id]:2,[teams[1].id]:1}}]};
 await pg.query('INSERT INTO "OverallRanking" ("eventId",config) VALUES ($1,$2)',[event,JSON.stringify(config)]);
 app=spawn(process.execPath,['node_modules/next/dist/bin/next','start','-H','127.0.0.1','-p','3209'],{env,stdio:'ignore'});for(let i=0;i<70;i++){try{if((await fetch(origin)).ok)break;}catch{}await new Promise(r=>setTimeout(r,250));}
 const cookies={};for(const role of ['organizer','agent','facilitator','sheet-judge-two']){const r=await fetch(origin+'/api/auth/login',{method:'POST',headers:{origin,'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({email:role+'@example.test',password:env.SEED_PASSWORD}),redirect:'manual'});assert.equal(r.status,303);cookies[role]=r.headers.get('set-cookie').split(';')[0];}
 const base='/api/events/'+event,get=(path,role='organizer')=>fetch(origin+path,{headers:{cookie:cookies[role]??''}}),read=async(role='organizer')=>(await get(base+'/overall-breakdown',role)).json();
 const post=(path,body,role='organizer')=>fetch(origin+base+path,{method:'POST',headers:{cookie:cookies[role],origin,'content-type':'application/json'},body:JSON.stringify(body)});
 const judge=async(operation,extra={},role='organizer')=>{const c=(await (await get(base+'/judging')).json()).contests.find(c=>c.id===contest);return post('/judging',{operation,contestId:contest,revision:c.revision,runRevision:0,requestKey:crypto.randomUUID(),...extra},role);};
 assert.equal((await get(base+'/overall-breakdown','none')).status,401);assert.equal((await get('/api/events/foreign/overall-breakdown','agent')).status,403);
 for(const role of ['agent','facilitator']){const hidden=await read(role);assert.equal(hidden.visible,false);assert(!('rows' in hidden));assert(!('activities' in hidden));}
 const r=await get(base+'/overall-breakdown');assert(r.headers.get('cache-control').includes('no-store'));
 let data=await read();assert.equal(data.complete,false);assert(data.rows.every(r=>r.rank===null));assert.equal(data.activities[1].judges.length,2);assert(!JSON.stringify(data).includes('sheet-inactive-judge'));
 const partial=data.rows.find(r=>r.id===teams[0].id).values[1];assert.equal(partial.judgeSum,80);assert.equal(partial.average,80);assert.equal(partial.submitted,1);assert.equal(partial.rank,null);assert.equal(partial.judgeScores.filter(x=>x===null).length,1);
 for(let i=0;i<2;i++)assert.equal((await judge('submitScore',{candidateId:teams[i].id,version:1,scores:{impact:90-i*20}},'sheet-judge-two')).status,200);
 data=await read();assert.equal(data.complete,true);const a=data.rows.find(r=>r.id===teams[0].id),b=data.rows.find(r=>r.id===teams[1].id);assert.equal(a.values[1].judgeSum,170);assert.equal(a.values[1].average,85);assert.equal(a.values[0].credit,95);assert.equal(a.values[0].contribution,42.75);assert.equal(a.total,90);assert.equal(b.total,82);assert.equal(a.rank,1);
 const finalize=async()=>{const x=await (await get(base+'/overall?view=draft')).json();return post('/overall',{operation:'finalize',revision:x.revision,config:x.config,expectedJudgingRevisions:{[contest]:x.judgingSources[0].revision}});};
 assert.equal((await finalize()).status,400);assert.equal((await judge('close')).status,200);assert.equal((await judge('publish')).status,200);assert.equal((await finalize()).status,200);
 const sharingPreview=async()=>{const center=await (await get(base+'/result-sharing')).json(),item=center.items.find(i=>i.key==='overall-breakdown');return post('/result-sharing',{operation:'preview',key:item.key,facilitators:'PUBLISHED',participants:'PUBLISHED',sourceRevision:item.sourceRevision,sharingRevision:item.sharingRevision,runRevision:center.runRevision});};
 assert.equal((await sharingPreview()).status,409);
 for(const key of ['race','judging:'+contest,'overall'])await shareResult({origin,eventId:event,cookie:cookies.organizer,key});
 assert.equal((await read('agent')).visible,false,'Summary sharing does not share individual judge scores');
 const review=await sharingPreview();assert.equal(review.status,200);assert((await review.json()).effects.some(s=>s.includes('judge names')));
 await shareResult({origin,eventId:event,cookie:cookies.organizer,key:'overall-breakdown',participants:'HIDDEN'});
 assert.equal((await read('facilitator')).visible,true);assert.equal((await read('agent')).visible,false);
 await shareResult({origin,eventId:event,cookie:cookies.organizer,key:'overall-breakdown'});assert.equal((await read('agent')).visible,true);
 await shareResult({origin,eventId:event,cookie:cookies.organizer,key:'judging:'+contest,participants:'HIDDEN'});assert.equal((await read('agent')).visible,false);assert.equal((await read('facilitator')).visible,true);
 await shareResult({origin,eventId:event,cookie:cookies.organizer,key:'judging:'+contest});await shareResult({origin,eventId:event,cookie:cookies.organizer,key:'overall'});assert.equal((await read('agent')).visible,false,'Re-sharing source/summary must not silently re-share details');
 await shareResult({origin,eventId:event,cookie:cookies.organizer,key:'overall-breakdown'});
 await shareResult({origin,eventId:event,cookie:cookies.organizer,key:'overall',facilitators:'HIDDEN'});assert.equal((await read('facilitator')).visible,false);await shareResult({origin,eventId:event,cookie:cookies.organizer,key:'overall'});assert.equal((await read('facilitator')).visible,false);
 await shareResult({origin,eventId:event,cookie:cookies.organizer,key:'overall-breakdown'});
 assert.equal((await judge('unpublish',{reason:'Correct submitted contest scores'})).status,200);assert.equal((await read('agent')).visible,false);assert.equal((await read('facilitator')).visible,false);assert.equal((await read()).stale,true);
 const counts=(await pg.query('SELECT (SELECT count(*) FROM "JudgingScore") scores,(SELECT count(*) FROM "ResultRevision") race_results,(SELECT count(*) FROM "ScoreLedgerEntry") ledger')).rows[0];assert.equal(Number(counts.scores),6);assert.equal(Number(counts.race_results),1);assert.equal(Number(counts.ledger),0);
 console.log('PASS: partial submitted-only sheet; correct sums/averages/tie credits/weighted totals; inactive judge exclusion; default hidden API; independent audience access; source/summary revocation; stale result sealing; unchanged race and judging records.');
}finally{if(app){app.kill();await new Promise(r=>app.once('exit',r));}await socket.stop();await pg.close();}

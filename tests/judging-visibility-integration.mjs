import {shareResult} from './result-sharing-helpers.mjs';
import {PGlite} from '@electric-sql/pglite';
import {PGLiteSocketServer} from '@electric-sql/pglite-socket';
import {spawn} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
const pg=await PGlite.create();for(const dir of fs.readdirSync('prisma/migrations').sort()){const f=path.join('prisma/migrations',dir,'migration.sql');if(fs.existsSync(f))await pg.exec(fs.readFileSync(f,'utf8'));}
const socket=new PGLiteSocketServer({db:pg,host:'127.0.0.1',port:5554});await socket.start();
const origin='http://127.0.0.1:3196',env={...process.env,DATABASE_URL:'postgresql://postgres:postgres@127.0.0.1:5554/postgres',DIRECT_URL:'postgresql://postgres:postgres@127.0.0.1:5554/postgres',APP_ORIGIN:origin,DB_POOL_SIZE:'1',SEED_PASSWORD:'isolated-judging-visibility-password',GMAIL_USER:'',GMAIL_APP_PASSWORD:''};
let app;
try{
 await new Promise((resolve,reject)=>{const c=spawn(process.execPath,['--import','tsx','prisma/seed.ts'],{env,stdio:'ignore'});c.on('error',reject);c.on('exit',code=>code?reject(Error('Seed failed')):resolve());});
 const event=(await pg.query('SELECT id FROM "Event" WHERE slug=$1',['classified-demo'])).rows[0].id;
 await pg.query('INSERT INTO "Team" (id,"eventId",name) VALUES ($1,$2,$3)',['visibility-team-two',event,'Second team']);
 const teams=(await pg.query('SELECT id FROM "Team" WHERE "eventId"=$1 ORDER BY id LIMIT 2',[event])).rows.map(r=>r.id);
 for(const name of ['judge2','observer']){await pg.query('INSERT INTO "User" (id,email,name,"passwordHash") SELECT $1,$2,$1,"passwordHash" FROM "User" WHERE email=$3',[name,name+'@example.test','facilitator@example.test']);await pg.query('INSERT INTO "EventMembership" (id,"eventId","userId",role) VALUES ($1,$2,$1,$3)',[name,event,'FACILITATOR']);}
 const judge1=(await pg.query('SELECT m.id FROM "EventMembership" m JOIN "User" u ON u.id=m."userId" WHERE m."eventId"=$1 AND u.email=$2',[event,'facilitator@example.test'])).rows[0].id;
 app=spawn(process.execPath,['node_modules/next/dist/bin/next','start','-H','127.0.0.1','-p','3196'],{env,stdio:'ignore'});
 for(let i=0;i<60;i++){try{if((await fetch(origin)).ok)break;}catch{}if(i===59)throw Error('App did not start');await new Promise(r=>setTimeout(r,250));}
 const cookies={};for(const role of ['organizer','agent','facilitator','judge2','observer']){const r=await fetch(origin+'/api/auth/login',{method:'POST',headers:{origin,'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({email:role+'@example.test',password:env.SEED_PASSWORD}),redirect:'manual'});assert.equal(r.status,303);cookies[role]=r.headers.get('set-cookie').split(';')[0];}
 const base='/api/events/'+event;
 const get=(url,role='organizer')=>fetch(origin+url,{headers:{cookie:cookies[role]},redirect:'manual'});
 const read=async role=>(await get(base+'/judging',role)).json();
 const post=(role,body)=>fetch(origin+base+'/judging',{method:'POST',headers:{cookie:cookies[role],origin,'content-type':'application/json'},body:JSON.stringify({runRevision:0,requestKey:randomUUID(),...body})});
 const config={target:'TEAM',candidateIds:teams,criteria:[{id:'impact',name:'Impact',description:'',maximum:100}]};
 const created=await post('organizer',{operation:'createContest',name:'Live Gala',instructions:'Private judge notes',config,judgeIds:[judge1,'judge2']});assert.equal(created.status,200);const id=(await created.json()).targetId;
 const other=await post('organizer',{operation:'createContest',name:'Other hidden contest',config,judgeIds:[judge1]});assert.equal(other.status,200);
 const contest=async(role='organizer')=>(await read(role)).contests.find(c=>c.id===id);
 assert.equal((await contest()).facilitatorVisibility,'HIDDEN');assert.equal((await read('observer')).contests.length,0);assert.equal((await read('agent')).contests.length,0);
 assert.equal((await post('organizer',{operation:'open',contestId:id,revision:1})).status,200);
 const visibility={operation:'setVisibility',contestId:id,visibilityRevision:1,facilitatorVisibility:'LIVE',participantVisibility:'HIDDEN',requestKey:randomUUID()};
 assert.equal((await post('facilitator',visibility)).status,403);assert.equal((await post('agent',visibility)).status,403);
 assert.equal((await post('organizer',visibility)).status,200);assert.equal((await post('organizer',visibility)).status,200);assert.equal((await contest()).revision,2,'Visibility must not invalidate score sheet revisions');
 assert.equal((await post('organizer',{...visibility,requestKey:randomUUID()})).status,409);
 assert.equal((await post('organizer',{...visibility,visibilityRevision:2,participantVisibility:'INVALID',requestKey:randomUUID()})).status,400);
 const draft=await post('facilitator',{operation:'saveDraft',contestId:id,revision:2,candidateId:teams[0],version:0,scores:{impact:99}});assert.equal(draft.status,200);
 assert((await contest('observer')).results.every(r=>r.average===null&&r.submitted===0));
 for(let i=0;i<2;i++)assert.equal((await post('facilitator',{operation:'submitScore',contestId:id,revision:2,candidateId:teams[i],version:i===0?1:0,scores:{impact:80-i*20}})).status,200);
 const partial=await contest('observer');assert.equal(partial.resultsStatus,'PARTIAL');assert(partial.results.every(r=>r.rank===null&&r.submitted===1&&r.judges===2));assert.deepEqual(partial.ownSheets,[]);assert.equal(partial.breakdown,undefined);assert.equal(partial.instructions,'');assert.deepEqual(partial.candidates,[]);assert.equal((await read('observer')).contests.length,1);assert.equal((await read('agent')).contests.length,0);
 await pg.query('INSERT INTO "OverallRanking" ("eventId",config) VALUES ($1,$2)',[event,JSON.stringify({raceRule:'POINTS',events:[{id:'gala',name:'Gala',source:'JUDGING',contestId:id,weight:100,credits:[100,90],ranks:{}}]})]);
 const live=await (await get(base+'/overall?view=draft')).json();assert.equal(live.judgingSources.find(s=>s.id===id).liveRows.find(r=>r.id===teams[0]).average,80);assert.deepEqual(live.judgingSources.find(s=>s.id===id).rows,[]);
 assert.equal((await post('organizer',{operation:'setVisibility',contestId:id,visibilityRevision:2,facilitatorVisibility:'LIVE',participantVisibility:'LIVE'})).status,200);
 assert.equal((await contest('agent')).resultsStatus,'PARTIAL');assert.deepEqual((await contest('agent')).ownSheets,[]);
 for(let i=0;i<2;i++)assert.equal((await post('judge2',{operation:'submitScore',contestId:id,revision:2,candidateId:teams[i],version:0,scores:{impact:90-i*20}})).status,200);
 const complete=await contest('agent');assert.equal(complete.resultsStatus,'COMPLETE');assert.deepEqual(complete.results.map(r=>[r.average,r.rank]),[[85,1],[65,2]]);
 const completeOverall=await (await get(base+'/overall?view=draft')).json();assert(completeOverall.judgingSources.find(s=>s.id===id).liveRows.every(r=>r.rank!==null));
 const finalize=async()=>{const data=await (await get(base+'/overall?view=draft')).json();return fetch(origin+base+'/overall',{method:'POST',headers:{cookie:cookies.organizer,origin,'content-type':'application/json'},body:JSON.stringify({operation:'finalize',revision:data.revision,config:data.config,expectedJudgingRevisions:{[id]:(await contest()).revision}})});};
 assert.equal((await finalize()).status,400,'Unpublished previews must not become official overall results');
 assert.equal((await post('organizer',{operation:'close',contestId:id,revision:2})).status,200);assert.equal((await post('organizer',{operation:'publish',contestId:id,revision:3})).status,200);assert.equal((await finalize()).status,200);
 await shareResult({origin,eventId:event,cookie:cookies.organizer,key:'overall'});
 assert.equal((await (await get(base+'/overall','agent')).json()).published,true);
 assert.equal((await post('organizer',{operation:'setVisibility',contestId:id,visibilityRevision:4,facilitatorVisibility:'LIVE',participantVisibility:'HIDDEN'})).status,200);
 assert.equal((await read('agent')).contests.length,0);assert.equal((await (await get(base+'/overall','agent')).json()).published,false,'Hidden contest totals must not leak through overall results');assert.equal((await (await get(base+'/overall','observer')).json()).published,true);
 assert.equal((await post('organizer',{operation:'setVisibility',contestId:id,visibilityRevision:5,facilitatorVisibility:'HIDDEN',participantVisibility:'PUBLISHED'})).status,200);
 assert.equal((await read('observer')).contests.length,0);const own=await contest('facilitator');assert.equal(own.ownSheets.length,2);assert.deepEqual(own.results,[]);assert.equal(own.published,null);assert.equal((await (await get(base+'/overall','observer')).json()).published,false);assert.equal((await (await get(base+'/overall','agent')).json()).published,false,'Re-showing a source must not silently reveal combined results');
 await pg.query('UPDATE "Event" SET "archivedAt"=NOW() WHERE id=$1',[event]);assert.equal((await post('organizer',{operation:'setVisibility',contestId:id,visibilityRevision:6,facilitatorVisibility:'LIVE',participantVisibility:'LIVE'})).status,409);
 assert.equal((await get('/api/events/other/judging','observer')).status,403);
 console.log('PASS: automatic submitted-score averages, draft exclusion, independent per-contest role visibility, private sheets, live overall sources, publication/finalization guards, stale/replay controls, hidden-overall protection and archive/event scope.');
}finally{if(app){app.kill();await new Promise(r=>app.once('exit',r));}await socket.stop();await pg.close();}

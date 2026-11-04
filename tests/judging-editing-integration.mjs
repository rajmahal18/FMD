import {PGlite} from '@electric-sql/pglite';
import {PGLiteSocketServer} from '@electric-sql/pglite-socket';
import {spawn} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {randomUUID,randomBytes,createHash} from 'node:crypto';
const pg=await PGlite.create();for(const dir of fs.readdirSync('prisma/migrations').sort()){const f=path.join('prisma/migrations',dir,'migration.sql');if(fs.existsSync(f))await pg.exec(fs.readFileSync(f,'utf8'));}
const socket=new PGLiteSocketServer({db:pg,host:'127.0.0.1',port:5555});await socket.start();
const origin='http://127.0.0.1:3197',env={...process.env,DATABASE_URL:'postgresql://postgres:postgres@127.0.0.1:5555/postgres',DIRECT_URL:'postgresql://postgres:postgres@127.0.0.1:5555/postgres',APP_ORIGIN:origin,DB_POOL_SIZE:'1',SEED_PASSWORD:'isolated-judging-edit-password',GMAIL_USER:'',GMAIL_APP_PASSWORD:''};
let app;
try{
 await new Promise((resolve,reject)=>{const c=spawn(process.execPath,['--import','tsx','prisma/seed.ts'],{env,stdio:'ignore'});c.on('error',reject);c.on('exit',code=>code?reject(Error('Seed failed')):resolve());});
 const event=(await pg.query('SELECT id FROM "Event" WHERE slug=$1',['classified-demo'])).rows[0].id,team=(await pg.query('SELECT id FROM "Team" WHERE "eventId"=$1 LIMIT 1',[event])).rows[0].id;
 const judge=(await pg.query('SELECT m.id,m."userId" FROM "EventMembership" m JOIN "User" u ON u.id=m."userId" WHERE m."eventId"=$1 AND u.email=$2',[event,'facilitator@example.test'])).rows[0];
 app=spawn(process.execPath,['node_modules/next/dist/bin/next','start','-H','127.0.0.1','-p','3197'],{env,stdio:'ignore'});
 for(let i=0;i<60;i++){try{if((await fetch(origin)).ok)break;}catch{}if(i===59)throw Error('App did not start');await new Promise(r=>setTimeout(r,250));}
 const login=(role,returnTo)=>fetch(origin+'/api/auth/login',{method:'POST',headers:{origin,'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({email:role+'@example.test',password:env.SEED_PASSWORD,...(returnTo?{returnTo}:{})}),redirect:'manual'});
 const cookies={};for(const role of ['organizer','agent','facilitator']){const r=await login(role);assert.equal(r.status,303);cookies[role]=r.headers.get('set-cookie').split(';')[0];}
 const base='/api/events/'+event;
 const get=(url,role='facilitator')=>fetch(origin+url,{headers:{cookie:cookies[role]},redirect:'manual'});
 const data=async(role='organizer')=>(await get(base+'/judging',role)).json();
 const post=(role,body)=>fetch(origin+base+'/judging',{method:'POST',headers:{cookie:cookies[role],origin,'content-type':'application/json'},body:JSON.stringify({runRevision:0,requestKey:randomUUID(),...body})});
 const config={target:'TEAM',candidateIds:[team],criteria:[{id:'impact',name:'Impact',description:'',maximum:100}]};
 assert.equal((await post('organizer',{operation:'createContest',name:'Fractional maximum',config:{...config,criteria:[{...config.criteria[0],maximum:99.5}]},judgeIds:[judge.id]})).status,400);
 const created=await post('organizer',{operation:'createContest',name:'Editable judging',config,judgeIds:[judge.id]});assert.equal(created.status,200);const id=(await created.json()).targetId;
 const pathToJudge='/events/'+event+'/judging';assert.equal((await login('facilitator')).headers.get('location'),origin+pathToJudge);assert.equal((await login('facilitator','/events/'+event+'/inbox')).headers.get('location'),origin+'/events/'+event+'/inbox');
 assert.equal((await get('/events/'+event)).headers.get('location'),pathToJudge);assert.equal((await get('/events/'+event+'/field')).status,200);
 const draftPage=await (await get(pathToJudge)).text();assert(draftPage.includes('No open judging events.'));assert(!draftPage.includes('class="judging-score-sheet"'));
 assert.equal((await post('organizer',{operation:'open',contestId:id,revision:1})).status,200);
 const openPage=await (await get(pathToJudge)).text();assert(openPage.includes('class="judging-score-sheet"'));assert(openPage.includes('step="1"'));assert(!openPage.includes('step="0.01"'));
 const input={contestId:id,revision:2,candidateId:team,version:0};
 assert.equal((await post('facilitator',{...input,operation:'submitScore',scores:{impact:89.5}})).status,400);assert.equal((await post('facilitator',{...input,operation:'saveDraft',scores:{impact:89.5}})).status,400);
 assert.equal((await post('agent',{...input,operation:'submitScore',scores:{impact:89}})).status,403);
 assert.equal((await post('facilitator',{...input,operation:'submitScore',scores:{impact:89}})).status,200);
 const edit={...input,operation:'submitScore',version:1,scores:{impact:95},requestKey:randomUUID()};
 const concurrent=await Promise.all([post('facilitator',edit),post('facilitator',edit)]);assert(concurrent.every(r=>r.status===200));
 let rows=(await pg.query('SELECT version,"totalHundredths","submittedAt" FROM "JudgingScore" WHERE "contestId"=$1',[id])).rows;assert.equal(rows.length,1);assert.equal(rows[0].version,2);assert.equal(rows[0].totalHundredths,9500);assert(rows[0].submittedAt);
 assert.equal((await data()).contests.find(c=>c.id===id).results[0].average,95);
 assert.equal((await post('facilitator',{...input,operation:'submitScore',version:1,scores:{impact:96}})).status,409);
 assert.equal((await post('facilitator',{...input,operation:'saveDraft',version:2,scores:{impact:90}})).status,409,'Draft save must not withdraw the current submission');
 await pg.query('UPDATE "Event" SET state=$1 WHERE id=$2',['PAUSED',event]);assert.equal((await post('facilitator',{...input,operation:'submitScore',version:2,scores:{impact:90}})).status,409);await pg.query('UPDATE "Event" SET state=$1 WHERE id=$2',['LIVE',event]);
 assert.equal((await post('organizer',{operation:'close',contestId:id,revision:2})).status,200);
 assert.equal((await post('facilitator',{...input,revision:3,operation:'submitScore',version:2,scores:{impact:90}})).status,409);
 const closedPage=await (await get(pathToJudge)).text();assert(closedPage.includes('No open judging events.'));assert(!closedPage.includes('class="judging-score-sheet"'));
 assert.equal((await post('organizer',{operation:'open',contestId:id,revision:3})).status,200);assert.equal((await post('facilitator',{...input,revision:4,operation:'submitScore',version:2,scores:{impact:91}})).status,200);
 const race=await Promise.all([post('facilitator',{...input,revision:4,operation:'submitScore',version:3,scores:{impact:92}}),post('organizer',{operation:'close',contestId:id,revision:4})]);assert.equal(race[1].status,200);assert([200,409].includes(race[0].status));
 const current=(await data()).contests.find(c=>c.id===id),sheet=current.breakdown[0];assert.equal(current.state,'CLOSED');assert([91,92].includes(sheet.total));assert.equal((await pg.query('SELECT count(*)::int AS n FROM "JudgingScore" WHERE "contestId"=$1',[id])).rows[0].n,1);
 const history=(await pg.query('SELECT "detailsJson" FROM "AuditEntry" WHERE "eventId"=$1 AND action=$2',[event,'JUDGING_SUBMITSCORE'])).rows;assert(history.some(r=>r.detailsJson.before?.scores?.impact===89&&r.detailsJson.after?.scores?.impact===95));
 const otp=randomBytes(32).toString('base64url'),code='123456';await pg.query('INSERT INTO "EmailOtp" (id,email,"codeHash","returnTo","expiresAt") VALUES ($1,$2,$3,$4,$5)',[otp,'facilitator@example.test',createHash('sha256').update(otp+':'+code).digest('hex'),'/workspace',new Date(Date.now()+60000).toISOString()]);
 const email=await fetch(origin+'/api/auth/otp',{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify({operation:'verify',challenge:otp,code})});assert.equal(email.status,200);assert.equal((await email.json()).redirect,pathToJudge);
 await pg.query('INSERT INTO "Event" (id,slug,name) VALUES ($1,$1,$2)',['second-judge-event','Second assignment']);await pg.query('INSERT INTO "EventMembership" (id,"eventId","userId",role) VALUES ($1,$2,$3,$4)',['second-judge-membership','second-judge-event',judge.userId,'FACILITATOR']);assert.equal((await login('facilitator')).headers.get('location'),origin+'/workspace','Multiple events still require event selection');
 console.log('PASS: whole-number inputs/API validation, open-only judge desk, password/OTP judge-first entry, explicit links and station access, editable submitted scores, one-row audited updates, replay/stale protection, pause/close races and multi-event selection.');
}finally{if(app){app.kill();await new Promise(r=>app.once('exit',r));}await socket.stop();await pg.close();}

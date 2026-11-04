import {PGlite} from '@electric-sql/pglite';
import {PGLiteSocketServer} from '@electric-sql/pglite-socket';
import {spawn} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
const pg=await PGlite.create();for(const dir of fs.readdirSync('prisma/migrations').sort()){const f=path.join('prisma/migrations',dir,'migration.sql');if(fs.existsSync(f))await pg.exec(fs.readFileSync(f,'utf8'));}
const socket=new PGLiteSocketServer({db:pg,host:'127.0.0.1',port:5553});await socket.start();
const origin='http://127.0.0.1:3195',env={...process.env,DATABASE_URL:'postgresql://postgres:postgres@127.0.0.1:5553/postgres',DIRECT_URL:'postgresql://postgres:postgres@127.0.0.1:5553/postgres',APP_ORIGIN:origin,DB_POOL_SIZE:'1',SEED_PASSWORD:'isolated-category-voting-password',GMAIL_USER:'',GMAIL_APP_PASSWORD:''};
let app;
try{
 await new Promise((resolve,reject)=>{const c=spawn(process.execPath,['--import','tsx','prisma/seed.ts'],{env,stdio:'ignore'});c.on('error',reject);c.on('exit',code=>code?reject(Error('Seed failed')):resolve());});
 const event=(await pg.query('SELECT id FROM "Event" WHERE slug=$1',['classified-demo'])).rows[0].id;
 const members=(await pg.query('SELECT m.id,u.email FROM "EventMembership" m JOIN "User" u ON u.id=m."userId" WHERE m."eventId"=$1',[event])).rows;
 for(const id of ['male-one','male-two','female-one','female-two']){await pg.query('INSERT INTO "User" (id,email,name,sex,"passwordHash") SELECT $1,$2,$1,$3,"passwordHash" FROM "User" WHERE email=$4',[id,id+'@example.test',id.startsWith('female')?'F':'M','agent@example.test']);await pg.query('INSERT INTO "EventMembership" (id,"eventId","userId",role) VALUES ($1,$2,$1,$3)',[id,event,'PARTICIPANT']);}
 app=spawn(process.execPath,['node_modules/next/dist/bin/next','start','-H','127.0.0.1','-p','3195'],{env,stdio:'ignore'});
 for(let i=0;i<60;i++){try{if((await fetch(origin)).ok)break;}catch{}if(i===59)throw Error('App did not start');await new Promise(r=>setTimeout(r,250));}
 const cookies={};for(const role of ['organizer','agent','facilitator']){const r=await fetch(origin+'/api/auth/login',{method:'POST',headers:{origin,'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({email:role+'@example.test',password:env.SEED_PASSWORD}),redirect:'manual'});assert.equal(r.status,303);cookies[role]=r.headers.get('set-cookie').split(';')[0];}
 const url=origin+'/api/events/'+event+'/voting';
 const post=(role,body)=>fetch(url,{method:'POST',headers:{cookie:cookies[role],origin,'content-type':'application/json'},body:JSON.stringify({requestKey:randomUUID(),...body})});
 const read=async role=>(await fetch(url,{headers:{cookie:cookies[role]}})).json();
 const config={voterMode:'PEOPLE',voterRoles:[],voterTeamIds:[],voterMembershipIds:members.filter(m=>['agent@example.test','facilitator@example.test'].includes(m.email)).map(m=>m.id),candidateIds:['male-one','male-two','female-one','female-two'],maxChoices:2,allowSelf:false,allowSameTeam:true,categories:[{id:'MALE',name:'Male',candidateIds:['male-one','male-two']},{id:'FEMALE',name:'Female',candidateIds:['female-one','female-two']}]};
 const input={name:'Agents of the Night',instructions:'Choose one in each category.',opensAt:new Date(Date.now()-60000).toISOString(),closesAt:new Date(Date.now()+3600000).toISOString(),config};
 assert.equal((await post('agent',{operation:'create',input})).status,403);
 assert.equal((await post('organizer',{operation:'create',input:{...input,config:{...config,categories:[config.categories[0],{...config.categories[1],candidateIds:['male-one','female-one']}]}}})).status,400);
 const created=await post('organizer',{operation:'create',input});assert.equal(created.status,200);const {id}=await created.json();
 const poll=async role=>(await read(role)).polls.find(p=>p.id===id);
 assert.equal((await post('organizer',{operation:'setEnabled',id,revision:(await poll('organizer')).revision,enabled:true})).status,200);
 const privatePoll=await poll('agent');assert.equal(privatePoll.results,null);assert.equal(privatePoll.config,null);assert.equal(privatePoll.categories.length,2);assert((await read('agent')).people.every(p=>!('sex' in p)));
 for(const choices of [['male-one'],['female-one'],['male-one','male-two'],['female-one','female-two'],['male-one','female-one','female-two']])assert.equal((await post('agent',{operation:'cast',id,choices})).status,400);
 assert.equal((await pg.query('SELECT count(*)::int AS n FROM "VotingBallot" WHERE "votingEventId"=$1',[id])).rows[0].n,0);
 await pg.query('UPDATE "User" SET sex=$1 WHERE id=$2',['F','male-one']);
 const cast={operation:'cast',id,choices:['male-one','female-one'],requestKey:randomUUID()};const concurrent=await Promise.all([post('agent',cast),post('agent',cast)]);assert(concurrent.every(r=>r.status===200));
 assert.equal((await pg.query('SELECT count(*)::int AS n FROM "VotingBallot" WHERE "votingEventId"=$1',[id])).rows[0].n,1);assert.equal((await pg.query('SELECT count(*)::int AS n FROM "VotingChoice" WHERE "ballotId" IN (SELECT id FROM "VotingBallot" WHERE "votingEventId"=$1)',[id])).rows[0].n,2);
 assert.equal((await post('agent',{operation:'cast',id,choices:['male-two','female-two']})).status,409);
 assert.equal((await post('facilitator',{operation:'cast',id,choices:['male-two','female-two']})).status,200);
 assert.equal((await post('organizer',{operation:'setEnabled',id,revision:(await poll('organizer')).revision,enabled:false})).status,200);
 assert.equal((await post('organizer',{operation:'update',id,revision:(await poll('organizer')).revision,input})).status,409);
 assert.equal((await post('organizer',{operation:'publish',id,revision:(await poll('organizer')).revision})).status,200);
 const published=await poll('agent');assert.equal(published.results.length,4);assert(published.results.every(r=>r.rank===1&&r.votes===1));assert.equal(published.results.filter(r=>r.category==='MALE').length,2);
 const snapshot=JSON.stringify(published.results);await pg.query('UPDATE "User" SET name=$1 WHERE id=$2',['New profile name','male-one']);assert.equal(JSON.stringify((await poll('agent')).results),snapshot);
 assert.equal((await post('agent',{operation:'cast',id,choices:['male-two','female-two']})).status,409);
 console.log('PASS: combined category ballot, complete category validation, member privacy, atomic two-choice submission/replay, frozen category assignments, independent ties/ranks, rule locks and immutable publication.');
}finally{if(app){app.kill();await new Promise(r=>app.once('exit',r));}await socket.stop();await pg.close();}

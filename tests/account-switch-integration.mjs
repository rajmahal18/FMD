import {PGlite} from '@electric-sql/pglite';
import {PGLiteSocketServer} from '@electric-sql/pglite-socket';
import {spawn} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {randomUUID,randomBytes,createHash} from 'node:crypto';
const pg=await PGlite.create();for(const dir of fs.readdirSync('prisma/migrations').sort()){const f=path.join('prisma/migrations',dir,'migration.sql');if(fs.existsSync(f))await pg.exec(fs.readFileSync(f,'utf8'));}
const socket=new PGLiteSocketServer({db:pg,host:'127.0.0.1',port:5558});await socket.start();
const origin='http://127.0.0.1:3201',env={...process.env,DATABASE_URL:'postgresql://postgres:postgres@127.0.0.1:5558/postgres',DIRECT_URL:'postgresql://postgres:postgres@127.0.0.1:5558/postgres',APP_ORIGIN:origin,DB_POOL_SIZE:'1',SEED_PASSWORD:'isolated-account-switch-password',GMAIL_USER:'',GMAIL_APP_PASSWORD:''};
let app;
try{
 await new Promise((resolve,reject)=>{const c=spawn(process.execPath,['--import','tsx','prisma/seed.ts'],{env,stdio:'ignore'});c.on('error',reject);c.on('exit',code=>code?reject(Error('Seed failed')):resolve());});
 const event=(await pg.query('SELECT id FROM "Event" WHERE slug=$1',['classified-demo'])).rows[0].id,team=(await pg.query('SELECT id FROM "Team" WHERE "eventId"=$1 LIMIT 1',[event])).rows[0].id;
 await pg.query('UPDATE "Event" SET "isDemo"=false WHERE id=$1',[event]);
 const judge=(await pg.query('SELECT m.id,m."userId" FROM "EventMembership" m JOIN "User" u ON u.id=m."userId" WHERE m."eventId"=$1 AND u.email=$2',[event,'facilitator@example.test'])).rows[0];
 app=spawn(process.execPath,['node_modules/next/dist/bin/next','start','-H','127.0.0.1','-p','3201'],{env,stdio:'ignore'});
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

 const people=(await pg.query('SELECT m.id,m."userId",m.role,u.email FROM "EventMembership" m JOIN "User" u ON u.id=m."userId" WHERE m."eventId"=$1',[event])).rows;
 const organizer=people.find(p=>p.role==='ORGANIZER'),participant=people.find(p=>p.role==='PARTICIPANT');
 const originalCookie=cookies.organizer,normalJudgeCookie=cookies.facilitator;
 const api=async(path,body,cookie=originalCookie,extra={})=>{const r=await fetch(origin+path,{method:'POST',headers:{cookie,origin,'content-type':'application/json',...extra},body:JSON.stringify(body),redirect:'manual'});return r;};
 const switchedCookie=response=>response.headers.getSetCookie().map(s=>s.split(';')[0]).filter(s=>!s.endsWith('=')).join('; ');
 const start=(membershipId=judge.id,cookie=originalCookie,selectedEvent=event)=>api('/api/auth/switch-account',{eventId:selectedEvent,membershipId},cookie);
 const ret=cookie=>fetch(origin+'/api/auth/switch-account/return',{method:'POST',headers:{cookie,origin},redirect:'manual'});
 const actingGet=(url,cookie)=>fetch(origin+url,{headers:{cookie},redirect:'manual'});
 assert.equal((await get('/events/'+event+'/switch-account','organizer')).status,200);assert.equal((await get('/events/'+event+'/switch-account','agent')).status,404);
 assert.equal((await start(judge.id,cookies.agent)).status,403);assert.equal((await start(judge.id,cookies.facilitator)).status,403);assert.equal((await start(organizer.id)).status,403);assert.equal((await start('foreign-member')).status,403);
 const csrf=await start(judge.id,originalCookie,event);assert.equal(csrf.status,200);let acting=switchedCookie(csrf);assert(!JSON.stringify(await csrf.json()).includes('act_'));assert(csrf.headers.getSetCookie().every(v=>v.includes('HttpOnly')&&v.includes('SameSite=lax')));
 assert.equal((await start(judge.id,acting)).status,403,'Nested switches are blocked');assert.equal((await ret(acting)).status,303);
 await pg.query('UPDATE "User" SET "mustChangePassword"=true WHERE id=$1',[judge.userId]);
 const pendingSwitch=await start();assert.equal(pendingSwitch.status,200);acting=switchedCookie(pendingSwitch);
 assert.equal((await actingGet('/events/'+event,acting)).status,200,'Pending judge opens actual event view while switched');
 assert.equal((await actingGet(base+'/field',acting)).status,200,'Pending judge has assigned station access');
 assert(new URL((await login('facilitator')).headers.get('location')).pathname==='/account/password','Normal login still requires password setup');
 assert.equal((await get(base+'/field','facilitator')).status,403,'Normal pending sessions do not receive the organizer exception');
 await ret(acting);
 await pg.query('UPDATE "EventMembership" SET active=false WHERE id=$1',[judge.id]);assert.equal((await start()).status,403);await pg.query('UPDATE "EventMembership" SET active=true WHERE id=$1',[judge.id]);
 assert.equal((await api('/api/auth/switch-account',{eventId:event,membershipId:judge.id},originalCookie,{origin:'https://evil.test'})).status,403);
 const config={target:'TEAM',candidateIds:[team],criteria:[{id:'impact',name:'Impact',description:'',maximum:100}]};
 const made=await post('organizer',{operation:'createContest',name:'Switch judge test',config,judgeIds:[judge.id]});assert.equal(made.status,200);const contestId=(await made.json()).targetId;assert.equal((await post('organizer',{operation:'open',contestId,revision:1})).status,200);
 await pg.query('INSERT INTO "Event" (id,slug,name) VALUES ($1,$1,$2)',['switch-other-event','Other event']);await pg.query('INSERT INTO "EventMembership" (id,"eventId","userId",role) VALUES ($1,$2,$3,$4)',['switch-other-member','switch-other-event',judge.userId,'FACILITATOR']);
 const beforePassword=(await pg.query('SELECT "passwordHash" FROM "User" WHERE id=$1',[judge.userId])).rows[0].passwordHash;
 const first=await start();assert.equal(first.status,200);assert.equal((await first.json()).redirect,'/events/'+event+'/judging');acting=switchedCookie(first);
 let own=await (await actingGet(base+'/judging',acting)).json();assert.equal(own.role,'FACILITATOR');assert(own.contests.some(c=>c.id===contestId&&c.assigned));
 assert.equal((await actingGet('/api/events/switch-other-event/judging',acting)).status,403,'Switched session is scoped even if the target has another membership');assert.equal((await actingGet('/api/events/switch-other-event/judging',normalJudgeCookie)).status,403,'Normal pending target access still requires password setup');
 for(const path of ['/api/auth/password','/api/auth/login','/api/auth/otp','/api/management'])assert.equal((await api(path,{},acting,{'x-spy-account-user':judge.userId})).status,403);
 assert.equal((await actingGet('/account/password',acting)).status,403);assert.equal(new URL((await actingGet('/workspace',acting)).headers.get('location'),origin).pathname,'/events/'+event);
 const score={operation:'submitScore',contestId,revision:2,runRevision:0,candidateId:team,version:0,scores:{impact:84},requestKey:randomUUID()};
 assert.equal((await api(base+'/judging',score,acting)).status,409,'Old/missing UI identity cannot submit');assert.equal((await api(base+'/judging',score,acting,{'x-spy-account-user':participant.userId})).status,409);
 assert.equal((await api(base+'/judging',score,acting,{'x-spy-account-user':judge.userId})).status,200,'The switched judge can really submit scores');
 const actual=(await pg.query('SELECT "judgeMembershipId","totalHundredths" FROM "JudgingScore" WHERE "contestId"=$1',[contestId])).rows;assert.equal(actual.length,1);assert.equal(actual[0].judgeMembershipId,judge.id);assert.equal(actual[0].totalHundredths,8400);
 assert.equal((await get(base+'/judging','facilitator')).status,403,'Real judge still needs password setup');
 const audit=(await pg.query('SELECT "actorId","targetUserId","detailsJson" FROM "AuditEntry" WHERE action=$1 AND "eventId"=$2',['ACCOUNT_SWITCH_ACTION',event])).rows;assert(audit.some(a=>a.actorId===organizer.userId&&a.targetUserId===judge.userId&&a.detailsJson.status==='ATTEMPTED'));
 assert.equal((await api('/api/auth/switch-account/return',{},acting,{origin:'https://evil.test'})).status,403);
 let back=await ret(acting);assert.equal(back.status,303);assert(back.headers.getSetCookie().some(c=>c.startsWith(originalCookie+';')));assert.equal((await actingGet(base+'/judging',acting)).status,401,'Return revokes switched access');assert.equal((await get('/events/'+event+'/switch-account','organizer')).status,200);assert.equal((await api(base+'/judging',{...score,requestKey:randomUUID()},originalCookie,{'x-spy-account-user':judge.userId})).status,409,'A stale switched tab cannot submit under the restored organizer');
 assert.equal((await ret(originalCookie)).status,303);assert.equal((await get('/events/'+event+'/switch-account','organizer')).status,200,'Repeated return keeps the restored organizer signed in');
 await pg.query('UPDATE "User" SET "mustChangePassword"=true WHERE id=$1',[participant.userId]);
 // Participant submissions use the participant identity and remain real.
 const vote=await api(base+'/voting',{operation:'create',requestKey:randomUUID(),input:{name:'Switch ballot',instructions:'',opensAt:new Date(Date.now()-60000).toISOString(),closesAt:new Date(Date.now()+600000).toISOString(),config:{voterMode:'PARTICIPANTS',voterRoles:[],voterTeamIds:[],voterMembershipIds:[],candidateIds:[judge.id,participant.id],maxChoices:1,allowSelf:true,allowSameTeam:true}}});assert.equal(vote.status,200);const voteId=(await vote.json()).id;assert.equal((await api(base+'/voting',{operation:'setEnabled',id:voteId,revision:1,enabled:true,requestKey:randomUUID()})).status,200);
 acting=switchedCookie(await start(participant.id));assert.equal((await actingGet(base+'/mission',acting)).status,200);assert.equal((await actingGet('/events/'+event,acting)).status,200);assert.equal((await get(base+'/mission','agent')).status,403);assert.equal((await api(base+'/voting',{operation:'cast',id:voteId,choices:[judge.id],requestKey:randomUUID()},acting,{'x-spy-account-user':participant.userId})).status,200);assert.equal((await pg.query('SELECT "voterMembershipId" FROM "VotingBallot" WHERE "votingEventId"=$1',[voteId])).rows[0].voterMembershipId,participant.id);
 assert.equal((await api(base+'/judging',{...score,requestKey:randomUUID()},acting,{'x-spy-account-user':participant.userId})).status,403,'Existing role checks still deny judge actions to participants');await ret(acting);
 assert.equal((await pg.query('SELECT "mustChangePassword" FROM "User" WHERE id=$1',[participant.userId])).rows[0].mustChangePassword,true);
 await pg.query('UPDATE "User" SET "mustChangePassword"=false WHERE id=ANY($1)',[[judge.userId,participant.userId]]);
 // Expiry/revocation must still leave a valid organizer able to return.
 acting=switchedCookie(await start());await pg.query('UPDATE "Session" SET "expiresAt"=$1 WHERE "parentSessionId" IS NOT NULL',[new Date(Date.now()-60000).toISOString()]);assert.equal((await actingGet(base+'/judging',acting)).status,401);assert.equal((await ret(acting)).status,303);
 acting=switchedCookie(await start());await pg.query('UPDATE "EventMembership" SET active=false WHERE id=$1',[organizer.id]);assert.equal((await actingGet(base+'/judging',acting)).status,401);assert.equal((await ret(acting)).status,303);await pg.query('UPDATE "EventMembership" SET active=true WHERE id=$1',[organizer.id]);
 acting=switchedCookie(await start());const logout=await fetch(origin+'/api/auth/logout',{method:'POST',headers:{cookie:acting,origin},redirect:'manual'});assert.equal(logout.status,303);assert.equal((await actingGet(base+'/judging',acting)).status,401);assert.equal((await get(base+'/judging','organizer')).status,401);assert.equal((await actingGet(base+'/judging',normalJudgeCookie)).status,200,'Signing out of a switch never signs out the real target');
 assert.equal((await pg.query('SELECT "passwordHash" FROM "User" WHERE id=$1',[judge.userId])).rows[0].passwordHash,beforePassword);
 assert.equal((await pg.query('SELECT count(*)::int AS n FROM "Session" WHERE "parentSessionId" IS NOT NULL')).rows[0].n,0);
 console.log('PASS: organizer-scoped actual judge/voter actions, private cookies, exact identities, audited switches/actions, no password changes, no nesting/security/cross-event access, stale-tab guard, expiry/revocation/return and logout isolation.');
}finally{if(app){app.kill();await new Promise(r=>app.once('exit',r));}await socket.stop();await pg.close();}

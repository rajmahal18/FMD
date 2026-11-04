import {judgingVisibilityBrowser} from "./judging-visibility-browser.mjs";
import {categoryVotingBrowser} from "./category-voting-browser.mjs";
import {inboxBrowser} from "./inbox-browser.mjs";
import {verifyJudgingInputs} from "./judging-input-browser.mjs";
import {wakeLockMock,verifyWakeLock} from "./wake-lock-browser.mjs";
import {judgedOverallBrowser} from "./judged-overall-browser.mjs";
import {squadHandlersBrowser} from "./squad-handlers-browser.mjs";
import {raceFlowBrowser} from "./race-flow-browser.mjs";
import {auditContrast} from './browser-contrast.mjs';
import {PGlite} from '@electric-sql/pglite';
import {PGLiteSocketServer} from '@electric-sql/pglite-socket';
import {spawn} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import http from 'node:http';
import https from 'node:https';

const out=path.resolve('.tmp/stability-evidence');fs.mkdirSync(out,{recursive:true});
const origin='https://127.0.0.1:3189';
const appOrigin='http://127.0.0.1:3188';
const env={...process.env,DATABASE_URL:'postgresql://postgres:postgres@127.0.0.1:5546/postgres',DIRECT_URL:'postgresql://postgres:postgres@127.0.0.1:5546/postgres',APP_ORIGIN:origin,SEED_PASSWORD:'isolated-stability-password',SEED_AGENT_PASSWORD:'isolated-roster-password',SEED_ORGANIZER_EMAIL:'organizer@example.test',DB_POOL_SIZE:'1'};
if(process.env.INBOX_BROWSER_ONLY){env.GMAIL_USER='';env.GMAIL_APP_PASSWORD='';}
const judgingBrowserCriteria=[{id:'story',name:'Thematic Storyline & Interpretation',description:'Clear espionage narrative.',maximum:30},{id:'quality',name:'Performance Quality & Mastery',description:'Precision, timing and confidence.',maximum:30},{id:'creativity',name:'Creativity & Entertainment Value',description:'Original concept and entertainment impact.',maximum:20},{id:'stage',name:'Costumes, Props & Stage Utilization',description:'Props, costumes and stage presence.',maximum:20}];
const previewNetwork=[];
const pg=await PGlite.create();
for(const dir of fs.readdirSync('prisma/migrations').sort()){const p=path.join('prisma/migrations',dir,'migration.sql');if(fs.existsSync(p))await pg.exec(fs.readFileSync(p,'utf8'));}
const socket=new PGLiteSocketServer({db:pg,host:'127.0.0.1',port:5546});await socket.start();
const run=args=>new Promise((resolve,reject)=>{const c=spawn(process.execPath,args,{env,stdio:['ignore','ignore','pipe']});let error='';c.stderr.on('data',v=>error+=v);c.on('error',reject);c.on('exit',code=>code===0?resolve():reject(Error(error)));});
let app,browser,proxy;
try{
 const certificate=path.join(out,'localhost.crt'),privateKey=path.join(out,'localhost.key');
 await new Promise((resolve,reject)=>{
  const child=spawn(process.env.OPENSSL_PATH||(process.platform==='win32'?'C:/Program Files/Git/usr/bin/openssl.exe':'openssl'),['req','-x509','-newkey','rsa:2048','-nodes','-keyout',privateKey,'-out',certificate,'-days','2','-subj','/CN=localhost'],{stdio:'ignore'});
  child.on('error',reject);child.on('exit',code=>code===0?resolve():reject(Error('Unable to generate local test certificate')));
 });
 await run(['--import','tsx','prisma/seed.ts']);
 await run(['--import','tsx','prisma/seed-roster.ts']);
 if(process.env.ROSTER_BROWSER_ONLY)await pg.query('UPDATE "EventMembership" SET "squadRole"=$1 WHERE role=$2 AND "teamId" IN (SELECT id FROM "Team" WHERE name=$3)', ['Intel / Radio Officer','PARTICIPANT','Team 4']);
 if(process.env.PROGRAM_BROWSER_ONLY)await run(['--import','tsx','scripts/configure-operation-program.ts']);
 const before=await pg.query('SELECT email,"passwordHash" FROM "User" WHERE email LIKE $1 ORDER BY email',['%@agents.invalid']);
 await run(['--import','tsx','prisma/seed-roster.ts']);
 assert(JSON.stringify((await pg.query('SELECT email,"passwordHash" FROM "User" WHERE email LIKE $1 ORDER BY email',['%@agents.invalid'])).rows)===JSON.stringify(before.rows),'Roster rerun must preserve account passwords');
 assert.equal(before.rows.length,93);
 const {rows:[event]}=await pg.query('SELECT id FROM "Event" WHERE slug=$1',['classified-demo']);
 await pg.query('UPDATE "Station" SET "arrivalCode"=$1 WHERE id=$2',['23456789','demo-cipher-room']);
 const {rows:[roster]}=await pg.query('SELECT id FROM "Event" WHERE slug=$1',['operation-classified-fmd']);
 if(process.env.PROGRAM_BROWSER_ONLY)await pg.query('INSERT INTO "EventProgram" ("eventId",content) SELECT $1,content FROM "EventProgram" WHERE "eventId"=$2',[event.id,roster.id]);

 assert.equal((await pg.query('SELECT count(*)::int AS n FROM "EventMembership" WHERE "eventId"=$1 AND role=$2 AND active=true',[roster.id,'ORGANIZER'])).rows[0].n,1);
 const overallFixture={events:[{id:'spy',name:'Spy Chase',weight:40,source:'SPY',credits:[100,90,80,70,60],ranks:{}},{id:'sports',name:'Sports and physical team challenges',weight:60,source:'MANUAL',credits:[100,90,80,70,60],ranks:{}}]};
 await pg.query('INSERT INTO "OverallRanking" ("eventId",config) VALUES ($1,$2)',[roster.id,JSON.stringify(overallFixture)]);

 const publishedId='overall-browser-publication';
 await pg.query('INSERT INTO "Event" (id,slug,name) VALUES ($1,$2,$3)',[publishedId,publishedId,'Team Building Publication']);
 const publicConfig={events:[{id:'sports',name:'Sports',source:'MANUAL',weight:100,credits:[100,90],ranks:{'overall-browser-a':1,'overall-browser-b':2}}]};
 const publicRows=[{id:'overall-browser-a',name:'Team Alpha',color:'#72d5e3',points:0,rank:1,value:100,contributions:[{eventId:'sports',rank:1,credit:100,contribution:100}]},{id:'overall-browser-b',name:'Team Bravo',color:'#83d6b2',points:0,rank:2,value:90,contributions:[{eventId:'sports',rank:2,credit:90,contribution:90}]}];
 for(const r of publicRows)await pg.query('INSERT INTO "Team" (id,"eventId",name,color) VALUES ($1,$2,$3,$4)',[r.id,publishedId,r.name,r.color]);
 for(const role of ['ORGANIZER','FACILITATOR','PARTICIPANT']){const email=role==='PARTICIPANT'?'agent@example.test':role.toLowerCase()+'@example.test';await pg.query('INSERT INTO "EventMembership" (id,"eventId","userId",role) SELECT $1,$2,id,$3 FROM "User" WHERE email=$4',['overall-browser-'+role,publishedId,role,email]);}
 await pg.query('INSERT INTO "OverallRanking" ("eventId",config,finalized) VALUES ($1,$2,$3)',[publishedId,JSON.stringify(publicConfig),JSON.stringify({rows:publicRows,config:publicConfig,finalizedAt:new Date().toISOString()})]);

 const timerTeam=(await pg.query('SELECT id FROM "Team" WHERE "eventId"=$1 AND name=$2 LIMIT 1',[event.id,'Delta'])).rows[0].id;
 await pg.query('UPDATE "Event" SET state=$1 WHERE id=$2',['LIVE',event.id]);
 await pg.query('UPDATE "EventMembership" SET "isCaptain"=true WHERE "eventId"=$1 AND role=$2',[event.id,'PARTICIPANT']);
 await pg.query('UPDATE "Station" SET configured=true,"timePenaltyButtons"=$1,"timePenaltyRevision"=1 WHERE id=$2',[JSON.stringify([{id:'wrong-step',label:'Wrong step',seconds:10},{id:'boundary',label:'Boundary violation',seconds:30}]),'demo-cipher-room']);
 await pg.query('INSERT INTO "OverallRanking" ("eventId",config) VALUES ($1,$2)',[event.id,JSON.stringify({raceRule:'TIME',events:[{id:'race',name:'Amazing Race',source:'SPY',weight:100,credits:[100],ranks:{}}]})]);
 await pg.query('INSERT INTO "RoutePlan" (id,"eventId",name,mode,"stationIds") VALUES ($1,$2,$3,$4,$5)',['timer-browser-route',event.id,'Timed route','FIXED',JSON.stringify(['demo-cipher-room'])]);
 await pg.query('INSERT INTO "TeamRouteAssignment" (id,"teamId","routeId","routeRevision",mode,"stationIds") VALUES ($1,$2,$3,1,$4,$5)',['timer-browser-assignment',timerTeam,'timer-browser-route','FIXED',JSON.stringify(['demo-cipher-room'])]);
 await pg.query('INSERT INTO "StationVisit" (id,"eventId","teamId","stationId",state,"startedAt","updatedAt") VALUES ($1,$2,$3,$4,$5,NOW(),NOW())',['timer-browser-visit',event.id,timerTeam,'demo-cipher-room','ACTIVE']);
 if(process.env.PARTICIPATION_BROWSER_ONLY||process.env.ARRIVAL_FLOW_BROWSER_ONLY){
  await pg.query('DELETE FROM "StationVisit" WHERE id=$1',['timer-browser-visit']);
  await pg.query('UPDATE "Station" SET "playersRequired"=2,briefing=$1 WHERE id=$2',['Read the cipher and solve the physical challenge.','demo-cipher-room']);
  const extras=(await pg.query('SELECT id,name FROM "User" WHERE email LIKE $1 ORDER BY name LIMIT 5',['%@agents.invalid'])).rows;
  for(const [i,u] of extras.entries())await pg.query('INSERT INTO "EventMembership" (id,"eventId","userId",role,"teamId","squadRole") VALUES ($1,$2,$3,$4,$5,$6)',['lineup-browser-'+i,event.id,u.id,'PARTICIPANT',timerTeam,'Recon Specialist']);
 }
 if(process.env.ARRIVAL_FLOW_BROWSER_ONLY){
  await pg.query('UPDATE "Event" SET "arrivalPolicy"=$2,"finalStationId"=$3 WHERE id=$1',[event.id,process.env.ARRIVAL_FLOW_BROWSER_ONLY,'flow-final-station']);
  await pg.query('INSERT INTO "Station" (id,"eventId",name,location,briefing,"facilitatorInstructions",configured,"timeLimitMinutes",available) VALUES ($1,$2,$3,$4,$5,$6,true,5,true)',['flow-final-station',event.id,'HQ Final Station','Headquarters','Physical finale instructions.','Confirm physical defusal.',]);
  const faci=(await pg.query('SELECT id FROM "EventMembership" WHERE "eventId"=$1 AND role=$2',[event.id,'FACILITATOR'])).rows[0].id;
  await pg.query('INSERT INTO "FacilitatorAssignment" (id,"membershipId","stationId") VALUES ($3,$1,$2)',[faci,'flow-final-station','flow-final-handler']);
  const ids=JSON.stringify(['demo-cipher-room','flow-final-station']);
  await pg.query('UPDATE "RoutePlan" SET "stationIds"=$1 WHERE id=$2',[ids,'timer-browser-route']);
  await pg.query('UPDATE "TeamRouteAssignment" SET "stationIds"=$1 WHERE "teamId"=$2',[ids,timerTeam]);
 }
 if(process.env.STATION_TILES_BROWSER_ONLY){
  const ids=['demo-cipher-room'];
  for(let i=0;i<6;i++){const id='tile-station-'+i;ids.push(id);await pg.query('INSERT INTO "Station" (id,"eventId",name,location,briefing,"facilitatorInstructions",configured,available,capacity) VALUES ($1,$2,$3,$4,$6,$7,true,$5,1)',[id,event.id,['Minefield Matrix','Signal Station with a longer physical challenge name','Laser Crossing','Puzzle Vault','Rope Bridge','HQ Briefing Point'][i],'Station venue '+(i+1),i!==4,'Physical challenge instructions.','Facilitator notes.']);}
  for(const [i,state] of ['ARRIVED','QUEUED'].entries()){const teamId='tile-fixture-team-'+i;await pg.query('INSERT INTO "Team" (id,"eventId",name) VALUES ($1,$2,$3)',[teamId,event.id,'Other team '+(i+1)]);await pg.query('INSERT INTO "StationVisit" (id,"eventId","teamId","stationId",state,"queuedAt","updatedAt") VALUES ($1,$2,$3,$4,$5,NOW(),NOW())',['tile-fixture-visit-'+i,event.id,teamId,'tile-station-0',state]);}
  await pg.query('UPDATE "TeamRouteAssignment" SET "stationIds"=$1 WHERE "teamId"=$2',[JSON.stringify(ids),timerTeam]);
 }
 if(process.env.JUDGED_OVERALL_BROWSER_ONLY){
  const ids=[timerTeam];for(let i=1;i<5;i++){const id='auto-overall-team-'+i;ids.push(id);await pg.query('INSERT INTO "Team" (id,"eventId",name) VALUES ($1,$2,$3)',[id,event.id,'Squad '+(i+1)]);}
  const config={target:'TEAM',candidateIds:ids,criteria:[{id:'total',name:'Total',description:'Judging criterion',maximum:100}]};
  await pg.query('INSERT INTO "JudgingContest" (id,"eventId",name,config,state) VALUES ($1,$2,$3,$4,$5)',['overall-auto-judging',event.id,'Banner judging',JSON.stringify(config),'CLOSED']);
  await pg.query('UPDATE "OverallRanking" SET config=$1 WHERE "eventId"=$2',[JSON.stringify({raceRule:'TIME',events:[{id:'banner-auto',name:'Banner',source:'JUDGING',contestId:'overall-auto-judging',weight:100,credits:[100,90,80,70,60],ranks:{}}]}),event.id]);
 }
 if(process.env.STATION_REQUIREMENTS_BROWSER_ONLY){
  await pg.query('UPDATE "Station" SET brawn=5,brain=0,"playersRequired"=6 WHERE id=$1',['demo-cipher-room']);
  await pg.query('INSERT INTO "Station" (id,"eventId",name,location,briefing,"facilitatorInstructions",configured) VALUES ($1,$2,$3,$4,$5,$6,true)',['requirements-editor-station',roster.id,'Station requirements editor','Main hall','Meet the facilitator.','Confirm the result.']);
 }
 if(process.env.JUDGING_BROWSER_ONLY){
  await pg.query('INSERT INTO "Team" (id,"eventId",name) VALUES ($1,$2,$3)',['judging-browser-bravo',event.id,'Bravo with a long team name']);
  const membership=(await pg.query('SELECT id FROM "EventMembership" WHERE "eventId"=$1 AND role=$2',[event.id,'FACILITATOR'])).rows[0].id;
  const config={target:'TEAM',candidateIds:[timerTeam,'judging-browser-bravo'],criteria:judgingBrowserCriteria};
  for(const [id,name,state] of [['judging-browser-gala','Gala Showcase Performance','OPEN'],['judging-browser-draft','Banner judging draft','DRAFT']]){
   await pg.query('INSERT INTO "JudgingContest" (id,"eventId",name,instructions,config,state) VALUES ($1,$2,$3,$4,$5,$6)',[id,event.id,name,'Score each criterion independently. Each judge has equal weight.',JSON.stringify(config),state]);
   await pg.query('INSERT INTO "JudgingAssignment" ("eventId","contestId","membershipId") VALUES ($1,$2,$3)',[event.id,id,membership]);
  }
 }
 if(process.env.SQUAD_HANDLERS_BROWSER_ONLY)await pg.query('UPDATE "Event" SET state=$2 WHERE id=$1',[event.id,'PREPARING']);
 if(process.env.SCREEN_PREVIEW_BROWSER_ONLY){
  await pg.query('UPDATE "Event" SET state=$1 WHERE id=$2',['PREPARING',event.id]);
  await pg.query('UPDATE "OverallRanking" SET config=$1 WHERE "eventId"=$2',[JSON.stringify({raceRule:'POINTS',events:[]}),event.id]);
 }


 if(process.env.CONTROLLER_BROWSER_ONLY){
  await pg.query('INSERT INTO "Team" (id,"eventId",name) VALUES ($1,$2,$3)',['controller-second-team',event.id,'Second team with a long name']);
  await pg.query('INSERT INTO "StationVisit" (id,"eventId","teamId","stationId",state,"updatedAt") VALUES ($1,$2,$3,$4,$5,NOW())',['controller-second-visit',event.id,'controller-second-team','demo-cipher-room','ARRIVED']);
 }
 if(process.env.PLAYER_BROWSER_ONLY)await pg.query('INSERT INTO "ContactPolicy" (id,"eventId",mode,"sameTeamAllowed","mutualConfirmation","reciprocityAllowed",visibility,"tieRule",enabled,"opensAt","closesAt") VALUES ($1,$2,$3,true,true,true,$4,$5,true,$6,$7)',['player-ui-contact-policy',event.id,'INTERACTION','SELF','SHARED',new Date(Date.now()-60000).toISOString(),new Date(Date.now()+7200000).toISOString()]);

 if(process.env.ROSTER_BROWSER_ONLY)await pg.query('INSERT INTO "EventMembership" (id,"eventId","userId",role) SELECT $1,$2,id,$3 FROM "User" WHERE email=$4',['roster-browser-faci',roster.id,'FACILITATOR','facilitator@example.test']);

 if(process.env.LISTS_BROWSER_ONLY||process.env.VISIBILITY_BROWSER_ONLY){
  for(let i=0;i<7;i++){
   await pg.query('INSERT INTO "Station" (id,"eventId",name,location,briefing,"facilitatorInstructions",configured) VALUES ($1,$2,$3,$4,$5,$6,true)',['list-station-'+i,roster.id,'Station '+(i+1)+(i===0?' with a long physical challenge name':''),'Hall '+(i+1),'Complete the physical station game.','Confirm the team result.']);
   await pg.query('INSERT INTO "User" (id,name,email,"passwordHash") SELECT $1,$2,$3,"passwordHash" FROM "User" WHERE email=$4',['list-user-'+i,'Facilitator '+(i+1),'list-faci-'+i+'@example.test','facilitator@example.test']);
   await pg.query('INSERT INTO "EventMembership" (id,"eventId","userId",role) VALUES ($1,$2,$3,$4)',['list-member-'+i,roster.id,'list-user-'+i,'FACILITATOR']);
   await pg.query('INSERT INTO "FacilitatorAssignment" (id,"membershipId","stationId") VALUES ($1,$2,$3)',['list-staff-'+i,'list-member-'+i,'list-station-'+i]);
  }
  for(let i=0;i<3;i++)await pg.query('INSERT INTO "RoutePlan" (id,"eventId",name,mode,"stationIds") VALUES ($1,$2,$3,$4,$5)',['list-route-'+i,roster.id,'Route '+(i+1),'FIXED',JSON.stringify(['list-station-0','list-station-1'])]);
  const teamRows=(await pg.query('SELECT id FROM "Team" WHERE "eventId"=$1 ORDER BY name',[roster.id])).rows;
  for(const t of teamRows)await pg.query('INSERT INTO "TeamRouteAssignment" (id,"teamId","routeId","routeRevision",mode,"stationIds") VALUES ($1,$2,$3,1,$4,$5)',['list-team-route-'+t.id,t.id,'list-route-0','FIXED',JSON.stringify(['list-station-0','list-station-1'])]);
  for(let i=0;i<3;i++)await pg.query('INSERT INTO "VotingEvent" (id,"eventId",name,config,"opensAt","closesAt") VALUES ($1,$2,$3,$4,$5,$6)',['list-vote-'+i,roster.id,'Voting award '+(i+1),JSON.stringify({voterMode:'PARTICIPANTS',voterRoles:[],voterMembershipIds:[],voterTeamIds:[],candidateIds:[],maxChoices:1,allowSelf:false,allowSameTeam:true}),new Date(Date.now()+3600000).toISOString(),new Date(Date.now()+7200000).toISOString()]);
 }
 console.log('PASS: roster rerun preserves 93 passwords and links organizer.');
 app=spawn(process.execPath,['node_modules/next/dist/bin/next','start','-H','127.0.0.1','-p','3188'],{env,stdio:['ignore',fs.openSync(path.join(out,'server.log'),'w'),'ignore']});
 for(let i=0;i<50;i++){try{if((await fetch(appOrigin)).ok)break;}catch{}await new Promise(r=>setTimeout(r,200));}
 proxy=https.createServer({key:fs.readFileSync(privateKey),cert:fs.readFileSync(certificate)},(req,res)=>{
  const upstream=http.request({hostname:'127.0.0.1',port:3188,path:req.url,method:req.method,headers:req.headers},r=>{res.writeHead(r.statusCode,r.headers);r.pipe(res);});
  upstream.on('error',()=>{res.writeHead(502);res.end();});req.pipe(upstream);
 });
 await new Promise(resolve=>proxy.listen(3189,'127.0.0.1',resolve));
 browser=spawn(process.env.CHROMIUM_PATH||(process.platform==='win32'?'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe':'chromium'),['--headless=new','--no-sandbox','--disable-gpu','--no-first-run','--remote-debugging-pipe','--user-data-dir='+path.join(out,'profile'),'about:blank'],{stdio:['ignore','ignore','ignore','pipe','pipe']});
 let nextId=0,buffer='';const pending=new Map(),errors=[];
 browser.stdio[4].on('data',chunk=>{buffer+=chunk;let end;while((end=buffer.indexOf('\0'))>=0){const m=JSON.parse(buffer.slice(0,end));buffer=buffer.slice(end+1);if(m.id){const p=pending.get(m.id);if(p){pending.delete(m.id);clearTimeout(p.timer);m.error?p.reject(Error(JSON.stringify(m.error))):p.resolve(m.result);}}else if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.text);else if(m.method==='Network.requestWillBeSent'&&process.env.SCREEN_PREVIEW_BROWSER_ONLY)previewNetwork.push({url:m.params.request.url,method:m.params.request.method});}});
 const send=(method,params={},sessionId)=>new Promise((resolve,reject)=>{const id=++nextId;const timer=setTimeout(()=>{pending.delete(id);reject(Error('CDP timeout: '+method));},15000);pending.set(id,{resolve,reject,timer});browser.stdio[3].write(JSON.stringify({id,method,params,...(sessionId?{sessionId}:{})})+'\0');});
 const {targetId}=await send('Target.createTarget',{url:'about:blank'});
 const {sessionId}=await send('Target.attachToTarget',{targetId,flatten:true});
 const cmd=(method,params)=>send(method,params,sessionId);
 await cmd('Page.enable');if(process.env.WAKE_BROWSER_ONLY)await cmd('Page.addScriptToEvaluateOnNewDocument',{source:wakeLockMock});await cmd('Runtime.enable');await cmd('Network.enable');
 await cmd('Security.setIgnoreCertificateErrors',{ignore:true});
 const evaluate=async expression=>{const r=await cmd('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result.value;};
 const visit=async url=>{await cmd('Page.navigate',{url:origin+url});await new Promise(r=>setTimeout(r,450));await evaluate('document.fonts.ready.then(()=>true)');};
 let votingPollId,votingOrganizerCookie;
 const checks=[];
 async function check(label,url,setup){
  for(const width of (process.env.TIME_PENALTY_BROWSER_ONLY?[320]:[320,390,768,1440])){
   await cmd('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width<768});await visit(url);if(setup)await evaluate(setup);
   const result=await evaluate(`(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,brokenImages:[...document.images].filter(i=>i.complete&&i.naturalWidth===0).map(i=>i.getAttribute('src')),hud:document.querySelector('.content-hud-layer')?getComputedStyle(document.querySelector('.content-hud-layer')).position:null,nav:document.querySelector('.organizer-section-links,.shell-links')?getComputedStyle(document.querySelector('.organizer-section-links')||document.querySelector('.shell-links')).flexDirection:null,qr:document.querySelector('.station-sign')?getComputedStyle(document.querySelector('.station-sign')).backgroundColor:null,blocked:[...document.querySelectorAll('a[href],button:not(:disabled),input:not([type=hidden]),select')].filter(e=>{const r=e.getBoundingClientRect(),x=r.x+r.width/2,y=r.y+r.height/2;if(document.querySelector(".error-modal[open],.station-detail-modal[open]")&&!e.closest(".error-modal,.station-detail-modal"))return false;if(r.width===0||r.height===0||x<0||x>=innerWidth-1||y<0||y>=innerHeight-1)return false;if(e.closest("details:not([open])")&&!e.closest("summary"))return false;const nav=e.closest(".organizer-section-links,.shell-links,.roster-tabs,.record-tabs,.program-tabs,.controller-tabs");if(nav){const n=nav.getBoundingClientRect();if(x<n.left||x>=n.right||y<n.top||y>=n.bottom)return false;}const hit=document.elementFromPoint(x,y);if(hit?.closest(".player-bottom-nav,.field-bottom-nav,.player-selection-bar")&&!e.closest(".player-bottom-nav,.field-bottom-nav,.player-selection-bar"))return false;return !hit||!e.contains(hit);}).map(e=>e.textContent.trim().slice(0,40)||e.getAttribute('name'))}))()`);
   if(await evaluate("!!document.querySelector('.player-bottom-nav,.field-bottom-nav') && getComputedStyle(document.querySelector('.player-bottom-nav,.field-bottom-nav')).position==='fixed'")){
    await evaluate("window.scrollTo(0,document.documentElement.scrollHeight)");
    assert(await evaluate("document.querySelector('.player-content').getBoundingClientRect().bottom-110 <= document.querySelector('.player-bottom-nav,.field-bottom-nav').getBoundingClientRect().top"),'Bottom padding must keep the end of page content above navigation');
    await evaluate("window.scrollTo(0,0)");
   }
   if(process.env.WAKE_BROWSER_ONLY||process.env.JUDGED_OVERALL_BROWSER_ONLY||process.env.SQUAD_HANDLERS_BROWSER_ONLY||process.env.PREVIEW_TOGGLE_BROWSER_ONLY||process.env.STATION_TILES_BROWSER_ONLY||process.env.ARRIVAL_FLOW_BROWSER_ONLY||process.env.VISIBILITY_BROWSER_ONLY||process.env.SPY_THEME_BROWSER_ONLY||process.env.PARTICIPANT_VISIBILITY_BROWSER_ONLY||process.env.PARTICIPATION_BROWSER_ONLY||process.env.STATION_REQUIREMENTS_BROWSER_ONLY||process.env.JUDGING_BROWSER_ONLY||process.env.SCREEN_PREVIEW_BROWSER_ONLY)result.contrast=await evaluate('('+auditContrast.toString()+')()');
   checks.push({label,...result});console.log(JSON.stringify({label,...result}));
   if(width===320||width===1440){const image=await cmd('Page.captureScreenshot',{format:'png',captureBeyondViewport:true});fs.writeFileSync(path.join(out,label+'-'+width+'.png'),Buffer.from(image.data,'base64'));}
  }
 }
 await check('landing','/');await check('login','/login');
 await evaluate(`document.querySelector('details:has(form[action="/api/auth/login"])').open=true`);
 await evaluate(`document.querySelector('input[name=email]').focus()`);
 assert.notEqual(await evaluate(`getComputedStyle(document.querySelector('input[name=email]')).outlineStyle`),'none','Keyboard focus must remain visible');
 await evaluate(`document.querySelector('details:has(form[action="/api/auth/login"])').open=true;const form=document.querySelector('form[action="/api/auth/login"]');form.querySelector('input[name=email]').value='organizer@example.test';form.querySelector('input[name=password]').value='${env.SEED_PASSWORD}';form.requestSubmit()`);
 for(let i=0;i<30;i++){if(await evaluate(`location.pathname==='/workspace'`))break;await new Promise(r=>setTimeout(r,200));}
 const loginState=await evaluate(`({path:location.pathname,query:location.search,message:document.querySelector('[role=alertdialog][open]')?.textContent,valid:document.querySelector('form')?.checkValidity()})`);
 console.log('Browser sign-in result: '+JSON.stringify(loginState));
 assert.equal(loginState.path,'/workspace');console.log('PASS: browser sign-in form and visible keyboard focus.');
 for(const role of (process.env.JUDGING_VISIBILITY_BROWSER_ONLY?['organizer','facilitator','agent']:process.env.CATEGORY_VOTING_BROWSER_ONLY?['organizer','agent']:process.env.INBOX_BROWSER_ONLY?['organizer','agent']:process.env.WAKE_BROWSER_ONLY?['facilitator']:process.env.JUDGED_OVERALL_BROWSER_ONLY?['organizer','agent','facilitator']:process.env.SQUAD_HANDLERS_BROWSER_ONLY?['organizer','agent','facilitator']:process.env.PREVIEW_TOGGLE_BROWSER_ONLY?['organizer','facilitator']:process.env.STATION_TILES_BROWSER_ONLY?['organizer','agent']:process.env.ARRIVAL_FLOW_BROWSER_ONLY?['organizer','agent','facilitator']:process.env.PARTICIPATION_BROWSER_ONLY?['agent','facilitator']:process.env.CONTROLLER_BROWSER_ONLY?['organizer','agent','facilitator']:process.env.PROGRAM_BROWSER_ONLY?['organizer','facilitator','agent']:process.env.FREE_ROAM_BROWSER_ONLY?['organizer','agent']:process.env.LISTS_BROWSER_ONLY?['organizer']:process.env.ERROR_BROWSER_ONLY?['organizer']:process.env.ROSTER_BROWSER_ONLY?['organizer','facilitator']:process.env.RESET_BROWSER_ONLY?['organizer']:process.env.VOTING_BROWSER_ONLY?['organizer','agent','facilitator']:process.env.LIVE_OPERATIONS_BROWSER_ONLY?['organizer','facilitator']:process.env.ADMIN_BROWSER_ONLY?['organizer']:process.env.PLAYER_BROWSER_ONLY?['agent']:process.env.NAV_BROWSER_ONLY?['agent','facilitator']:process.env.TIME_PENALTY_BROWSER_ONLY?['facilitator']:['organizer','facilitator','agent'])){
  await cmd('Network.clearBrowserCookies');
  const response=await fetch(appOrigin+'/api/auth/login',{method:'POST',headers:{origin,'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({email:role+'@example.test',password:env.SEED_PASSWORD}),redirect:'manual'});assert.equal(response.status,303);
  const cookie=response.headers.get('set-cookie').split(';')[0];const split=cookie.indexOf('=');await cmd('Network.setCookie',{name:cookie.slice(0,split),value:cookie.slice(split+1),url:origin,httpOnly:true,secure:true,path:'/'});

  if(process.env.JUDGING_VISIBILITY_BROWSER_ONLY){await judgingVisibilityBrowser({role,pg,event,evaluate,visit,check});continue;}
  if(process.env.CATEGORY_VOTING_BROWSER_ONLY){await categoryVotingBrowser({role,cookie,pg,event,evaluate,visit,check,appOrigin,origin});continue;}
  if(process.env.INBOX_BROWSER_ONLY){await inboxBrowser({role,pg,event,evaluate,visit,check,cmd});continue;}
  if(process.env.WAKE_BROWSER_ONLY){await verifyWakeLock({evaluate,visit,check,cmd,event,auditContrast});continue;}
  if(process.env.JUDGED_OVERALL_BROWSER_ONLY){await judgedOverallBrowser({role,pg,event,evaluate,visit,check});continue;}
  if(process.env.SQUAD_HANDLERS_BROWSER_ONLY){await squadHandlersBrowser({role,pg,event,timerTeam,evaluate,visit,check});continue;}
  if(process.env.PREVIEW_TOGGLE_BROWSER_ONLY){
   const base='/events/'+event.id;const setup="document.querySelector('#screen-preview-visibility').open=true";
   const saveToggle=async(enabled)=>{await visit(base+'/setup');await evaluate(setup);await evaluate("document.querySelector('#screen-preview-visibility input[type=checkbox]').click();document.querySelector('#screen-preview-visibility form').requestSubmit()");for(let i=0;i<60;i++){if((await pg.query('SELECT "screenPreviewEnabled" FROM "Event" WHERE id=$1',[event.id])).rows[0].screenPreviewEnabled===enabled)return;await new Promise(r=>setTimeout(r,100));}throw Error('Preview toggle save did not complete');};
   if(role==='organizer'){
    await check('preview-toggle-on',base+'/setup',setup);assert(await evaluate(`!!document.querySelector('a[href="${base}/preview"]')`));
    await saveToggle(false);await check('preview-toggle-off',base+'/setup',setup);assert.equal(await evaluate(`!!document.querySelector('a[href="${base}/preview"]')`),false);
    await check('preview-disabled-organizer',base+'/preview');assert(await evaluate("document.body.textContent.includes('Live screen previews are disabled')"));
    await saveToggle(true);await visit(base+'/preview');assert(await evaluate("document.body.textContent.includes('Sample team')"));
    await saveToggle(false);
   }else{
    await check('preview-hidden-facilitator',base+'/field');await evaluate("document.querySelector('.player-account').open=true");assert.equal(await evaluate(`!!document.querySelector('a[href="${base}/preview"]')`),false);assert(await evaluate("!!document.querySelector('.station-timer')"),'Actual live timer remains available');
    await check('preview-disabled-facilitator',base+'/preview');assert(await evaluate("document.body.textContent.includes('Return to station work')"));
   }
   console.log('PASS: '+role+' organizer preview-toggle UI, persistence, event-day link hiding and recovery.');continue;
  }
  if(process.env.STATION_TILES_BROWSER_ONLY){
   const base='/events/'+event.id;
   const tabs=role==='agent'?"document.querySelector('.mission-section').open=true;":"";
   await check('station-tiles-'+role,base,tabs);
   assert(await evaluate("document.querySelectorAll('.station-tile').length>0"));
   const open=tabs+"await new Promise(r=>setTimeout(r,100));document.querySelector('.station-tile').click();await new Promise(r=>setTimeout(r,150));";
   await check('station-modal-'+role,base,`(async()=>{${open}})()`);
   assert(await evaluate("document.querySelector('.station-detail-modal').open&&document.querySelector('.station-detail-modal').contains(document.activeElement)"),'Native modal traps keyboard focus');
   for(const width of [320,390,768,1440]){await cmd('Emulation.setDeviceMetricsOverride',{width,height:740,deviceScaleFactor:1,mobile:width<768});const rect=await evaluate("(()=>{const r=document.querySelector('.station-detail-modal').getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom};})()");assert(rect.x>=0&&rect.y>=0&&rect.right<=width&&rect.bottom<=740,'Modal stays within the phone viewport');}
   await cmd('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});await cmd('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});await new Promise(r=>setTimeout(r,100));
   assert(await evaluate("!document.querySelector('.station-detail-modal[open]')&&document.activeElement.classList.contains('station-tile')&&document.body.style.overflow!=='hidden'"),'Escape closes modal, restores focus and unlocks page scroll');
   await evaluate("document.querySelector('.station-tile').click()");await new Promise(r=>setTimeout(r,100));await cmd('Input.dispatchMouseEvent',{type:'mousePressed',x:1,y:1,button:'left',clickCount:1});await cmd('Input.dispatchMouseEvent',{type:'mouseReleased',x:1,y:1,button:'left',clickCount:1});await new Promise(r=>setTimeout(r,100));assert(await evaluate("!document.querySelector('.station-detail-modal[open]')"),'Backdrop click closes modal');
   console.log('PASS: '+role+' POS station tiles, lightweight modal, viewport bounds, keyboard focus/Escape and backdrop recovery.');continue;
  }
  if(process.env.ARRIVAL_FLOW_BROWSER_ONLY){await raceFlowBrowser({role,cookie,pg,event,timerTeam,evaluate,visit,check,cmd,origin,appOrigin,policy:process.env.ARRIVAL_FLOW_BROWSER_ONLY});continue;}
  if(process.env.PARTICIPATION_BROWSER_ONLY){
   if(role==='agent'){
    const verifySelection=`for(let i=0;i<40&&!document.querySelector('.player-picker');i++)await new Promise(r=>setTimeout(r,100));document.querySelector('.player-picker')?.scrollIntoView({block:'start'});`;
    await check('participation-player-picker','/events/'+event.id+'/check-in?code=23456789',`(async()=>{${verifySelection}})()`);
    assert(await evaluate("!!document.querySelector('.player-picker')"));
    await evaluate("document.querySelectorAll('.player-option input')[0].click();document.querySelectorAll('.player-option input')[1].click()");await new Promise(r=>setTimeout(r,100));
    assert.equal(await evaluate("document.querySelectorAll('.player-option.is-selected').length"),2);
    assert(await evaluate("document.querySelectorAll('.player-option input')[2].disabled"),'Count limit disables unselected players');
    assert.equal((await pg.query('SELECT COUNT(*)::int AS n FROM "StationVisit" WHERE "teamId"=$1',[timerTeam])).rows[0].n,0,'QR verification must not start timing or record a visit');
    await evaluate("(()=>{const input=document.querySelector('.player-picker-tools input');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,'no-such-teammate');input.dispatchEvent(new Event('input',{bubbles:true}));})()");await new Promise(r=>setTimeout(r,100));
    assert(await evaluate("!document.querySelector('.player-option')&&document.querySelector('.player-selection-bar').textContent.includes('2 of 2')"),'Search preserves selection and shows no-match recovery');
    await evaluate("document.querySelector('.player-picker .notice button').click()");await new Promise(r=>setTimeout(r,100));
    assert.equal(await evaluate("document.querySelectorAll('.player-option.is-selected').length"),2,'Clearing search restores selected rows');
    for(const width of [320,390,768,1440]){
     await cmd('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width<768});
     for(const fraction of [0,.5,1]){
      await evaluate(`(()=>{const list=document.querySelector('.player-options'),r=list.getBoundingClientRect();window.scrollTo(0,scrollY+r.top+Math.max(0,r.height-innerHeight+250)*${fraction}-90);})()`);await new Promise(r=>setTimeout(r,120));
      const pinned=await evaluate("(()=>{const bar=document.querySelector('.player-selection-bar'),r=bar.getBoundingClientRect();return {position:getComputedStyle(bar).position,top:r.top,bottom:r.bottom,visible:!!bar.getClientRects().length};})()");
      assert(pinned.visible&&pinned.top>=0&&pinned.bottom<=900,`Selection count must stay visible while browsing the roster at ${width}px / ${fraction}`);
     }
     const layout=await evaluate("(()=>{const bar=document.querySelector('.player-selection-bar').getBoundingClientRect(),dock=document.querySelector('.player-bottom-nav').getBoundingClientRect();return {width:innerWidth,scroll:document.documentElement.scrollWidth,bottom:bar.bottom,top:bar.top,dockTop:dock.top,position:getComputedStyle(document.querySelector('.player-bottom-nav')).position};})()");
     assert(layout.scroll<=width,'Picker must not overflow');assert(layout.top>=0&&layout.bottom<=900,'Selection action remains reachable');if(layout.position==='fixed')assert(layout.bottom<=layout.dockTop,'Selection action stays above bottom navigation');
     const image=await cmd('Page.captureScreenshot',{format:'png',captureBeyondViewport:true});fs.writeFileSync(path.join(out,'participation-selected-'+width+'.png'),Buffer.from(image.data,'base64'));
    }
    await evaluate("document.querySelector('.player-selection-bar button').click()");
    for(let i=0;i<40;i++){if(await evaluate("location.pathname.endsWith('/check-in')===false && !!document.querySelector('.station-timer')"))break;await new Promise(r=>setTimeout(r,200));}
    assert(await evaluate("!!document.querySelector('.station-timer')"),'Captain confirmation starts a visible timer');
    await evaluate("document.querySelector('.action-feedback-modal[open] button')?.click()");
    await check('participation-running-mission','/events/'+event.id);
    const v=(await pg.query('SELECT id FROM "StationVisit" WHERE "teamId"=$1',[timerTeam])).rows[0];assert(v);
    assert.equal((await pg.query('SELECT COUNT(*)::int AS n FROM "StationVisitPlayer" WHERE "visitId"=$1',[v.id])).rows[0].n,2);
    await check('participation-team-history','/events/'+event.id,"document.querySelector('#team-file').open=true");
   }else{
    await check('participation-facilitator-lineup','/events/'+event.id+'/field');
    assert(await evaluate("document.querySelector('.station-lineup').textContent.includes('0 played / 1 explored')"));
    for(const width of [320,390,768,1440]){
     const height=width<768?740:900;
     await cmd('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<768});await visit('/events/'+event.id+'/field');
     const consoleLayout=await evaluate("(()=>{const dock=document.querySelector('.field-bottom-nav'),limit=getComputedStyle(dock).position==='fixed'?dock.getBoundingClientRect().top:innerHeight;const targets=[document.querySelector('.station-team:not([hidden]) .station-timer'),...document.querySelectorAll('.station-team:not([hidden]) .time-penalty-actions button'),[...document.querySelectorAll('.station-team:not([hidden]) button')].find(b=>(b.getAttribute('aria-label')||b.textContent)==='Finish challenge')];return {limit,rects:targets.map(e=>e?{top:e.getBoundingClientRect().top,bottom:e.getBoundingClientRect().bottom}:null),lineupOpen:document.querySelector('.station-lineup').open};})()");
     assert.equal(consoleLayout.lineupOpen,false,'Roster stays folded during urgent station work');
     assert(consoleLayout.rects.every(r=>r&&r.top>=0&&r.bottom<=consoleLayout.limit),`Timer, penalty buttons and Finish must fit without scrolling at ${width}x${height}: ${JSON.stringify(consoleLayout)}`);
     const shot=await cmd('Page.captureScreenshot',{format:'png'});fs.writeFileSync(path.join(out,'field-urgent-'+width+'.png'),Buffer.from(shot.data,'base64'));
    }
    await evaluate("document.querySelector('.time-penalty-actions button').click()");
    for(let i=0;i<40;i++){if(await evaluate("!!document.querySelector('.race-action-note')"))break;await new Promise(r=>setTimeout(r,100));}
    assert(await evaluate("!!document.querySelector('.race-action-note')&&!document.querySelector('.action-feedback-modal[open]')"),'Penalty taps confirm inline without blocking live controls');

   }
   continue;
  }
  if(process.env.SCREEN_PREVIEW_BROWSER_ONLY){
   if(role==='agent'){assert.equal((await fetch(appOrigin+'/events/'+event.id+'/preview',{headers:{cookie},redirect:'manual'})).status,404);continue;}
   const before=JSON.stringify((await pg.query('SELECT state,(SELECT COUNT(*)::int FROM "StationVisit" WHERE "eventId"=$1) AS visits,(SELECT COUNT(*)::int FROM "AuditEntry" WHERE "eventId"=$1) AS audits,(SELECT COUNT(*)::int FROM "ScoreLedgerEntry" WHERE "eventId"=$1) AS scores FROM "Event" WHERE id=$1',[event.id])).rows);
   await visit('/events/'+event.id+'/preview');
   await evaluate("sessionStorage.setItem('spy-field-draft:real-user:sentinel','keep-draft');sessionStorage.setItem('spy-race:real-user:sentinel','keep-pending')");
   if(role==='organizer'){
    await check('screen-preview-participant','/events/'+event.id+'/preview?view=participant');
    await check('screen-preview-empty-setup','/events/'+roster.id+'/preview');
   }
   await check('screen-preview-facilitator-'+role,'/events/'+event.id+'/preview?view=facilitator');
   const trafficStart=previewNetwork.length;
   await evaluate("(()=>{const s=document.querySelector('.screen-preview-fields select');s.value='AWAITING_CONFIRMATION';s.dispatchEvent(new Event('change',{bubbles:true}));})()");await new Promise(r=>setTimeout(r,100));
   await evaluate("document.querySelector('.station-team .management-form').requestSubmit()");await new Promise(r=>setTimeout(r,100));
   assert(await evaluate("[...document.querySelectorAll('.result-review button')].some(b=>b.textContent==='Confirm completion'&&b.disabled)"),'Preview must disable recording even after local result review');
   await evaluate("document.querySelectorAll('.screen-preview-surface button:disabled').forEach(b=>b.click())");
   await new Promise(r=>setTimeout(r,10500));
   assert(!previewNetwork.slice(trafficStart).some(r=>r.url.includes('/api/')),'Preview must not send API mutations or poll live endpoints');
   assert.equal(await evaluate("sessionStorage.getItem('spy-field-draft:real-user:sentinel')"),'keep-draft');assert.equal(await evaluate("sessionStorage.getItem('spy-race:real-user:sentinel')"),'keep-pending');
   assert.equal(JSON.stringify((await pg.query('SELECT state,(SELECT COUNT(*)::int FROM "StationVisit" WHERE "eventId"=$1) AS visits,(SELECT COUNT(*)::int FROM "AuditEntry" WHERE "eventId"=$1) AS audits,(SELECT COUNT(*)::int FROM "ScoreLedgerEntry" WHERE "eventId"=$1) AS scores FROM "Event" WHERE id=$1',[event.id])).rows),before);
   assert(await evaluate("!!document.querySelector('.screen-preview-heading a[href]')"),'Exit preview must remain a real link');
   continue;
  }

  if(process.env.JUDGING_BROWSER_ONLY){
   if(role==='organizer'){
    await check('judging-setup','/events/'+event.id+'/judging-settings',"[...document.querySelectorAll('[role=tab]')].find(t=>t.textContent.includes('Add contest')).click()");
    await check('judging-organizer','/events/'+event.id+'/judging');
   }else if(role==='facilitator'){
    await check('judging-score-sheet','/events/'+event.id+'/judging');assert.equal(await evaluate("document.querySelectorAll('[aria-label=\"Judging contests\"] [role=tab]').length"),1,'Only open assigned contests are listed');
    assert(await evaluate("!!document.querySelector('.field-bottom-nav a[href$=\"/judging\"]')"),'Assigned judges need a navigation entry');
    await cmd('Emulation.setDeviceMetricsOverride',{width:320,height:900,deviceScaleFactor:1,mobile:true});await visit('/events/'+event.id+'/judging');
    await verifyJudgingInputs({evaluate,pg,event,check,cmd});
    await evaluate("const input=document.querySelector('.judging-score-sheet input[type=number]');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,'27');input.dispatchEvent(new Event('input',{bubbles:true}));");
    await new Promise(r=>setTimeout(r,100));
    await evaluate("[...document.querySelectorAll('.judging-score-sheet button')].find(b=>b.textContent==='Save draft').click()");
    for(let i=0;i<50;i++){if((await pg.query('SELECT COUNT(*)::int AS n FROM "JudgingScore" WHERE "contestId"=$1',['judging-browser-gala'])).rows[0].n===1)break;await new Promise(r=>setTimeout(r,100));}
    assert.equal((await pg.query('SELECT "totalHundredths" FROM "JudgingScore" WHERE "contestId"=$1',['judging-browser-gala'])).rows[0].totalHundredths,2700);
    await visit('/events/'+event.id+'/judging');assert.equal(await evaluate("document.querySelector('.judging-score-sheet input[type=number]').value"),'27');
    await evaluate("document.querySelectorAll('.judging-score-sheet')[0].querySelectorAll('input[type=number]').forEach((input,i)=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,String([27,25,18,19][i]));input.dispatchEvent(new Event('input',{bubbles:true}));})");
    await new Promise(r=>setTimeout(r,150));await evaluate("document.querySelector('.judging-score-sheet form').requestSubmit()");await new Promise(r=>setTimeout(r,150));
    assert(await evaluate("!!document.querySelector('.judging-dialog[open]')"));
    assert(await evaluate("(()=>{const d=document.querySelector('.judging-dialog');const r=d.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight;})()"),'Judging review must fit the mobile viewport');
    const reviewImage=await cmd('Page.captureScreenshot',{format:'png'});fs.writeFileSync(path.join(out,'judging-review-320.png'),Buffer.from(reviewImage.data,'base64'));
    await evaluate("(()=>{const d=document.querySelector('.judging-dialog');d.scrollTop=d.scrollHeight;[...d.querySelectorAll('button')].find(b=>b.textContent==='Confirm & submit score').click();})()");
    for(let i=0;i<50;i++){if((await pg.query('SELECT "submittedAt" FROM "JudgingScore" WHERE "contestId"=$1',['judging-browser-gala'])).rows[0]?.submittedAt)break;await new Promise(r=>setTimeout(r,100));}
    assert.equal((await pg.query('SELECT "totalHundredths" FROM "JudgingScore" WHERE "contestId"=$1',['judging-browser-gala'])).rows[0].totalHundredths,8900);
    for(let i=0;i<60;i++){if(await evaluate("!![...document.querySelectorAll('.judging-score-sheet button')].find(b=>b.textContent==='Review changes')"))break;await new Promise(r=>setTimeout(r,100));}
    assert(await evaluate("!document.querySelector('.judging-score-sheet input[type=number]').disabled"),'Submitted sheets remain editable while open');
    await evaluate("(()=>{const input=document.querySelector('.judging-score-sheet input[type=number]');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,'28');input.dispatchEvent(new Event('input',{bubbles:true}));})()");
    await evaluate("[...document.querySelectorAll('.judging-score-sheet button')].find(b=>b.textContent==='Review changes').click()");
    await evaluate("[...document.querySelectorAll('.judging-dialog button')].find(b=>b.textContent==='Confirm & update score').click()");
    for(let i=0;i<60;i++){if((await pg.query('SELECT "totalHundredths" FROM "JudgingScore" WHERE "contestId"=$1',['judging-browser-gala'])).rows[0].totalHundredths===9000)break;await new Promise(r=>setTimeout(r,100));}
    assert.equal((await pg.query('SELECT COUNT(*)::int AS n FROM "JudgingScore" WHERE "contestId"=$1',['judging-browser-gala'])).rows[0].n,1);
    assert.equal((await pg.query('SELECT "totalHundredths" FROM "JudgingScore" WHERE "contestId"=$1',['judging-browser-gala'])).rows[0].totalHundredths,9000);

    const other=await fetch(appOrigin+'/api/events/'+event.id+'/judging',{method:'POST',headers:{origin,cookie,'content-type':'application/json'},body:JSON.stringify({operation:'submitScore',contestId:'judging-browser-gala',revision:1,version:0,candidateId:'judging-browser-bravo',scores:{story:26,quality:25,creativity:17,stage:18},runRevision:0,requestKey:crypto.randomUUID()})});assert.equal(other.status,200);
    const adminCookie=(await fetch(appOrigin+'/api/auth/login',{method:'POST',headers:{origin,'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({email:'organizer@example.test',password:env.SEED_PASSWORD}),redirect:'manual'})).headers.get('set-cookie').split(';')[0];
    for(const [operation,revision] of [['close',1],['publish',2]]){const r=await fetch(appOrigin+'/api/events/'+event.id+'/judging',{method:'POST',headers:{origin,cookie:adminCookie,'content-type':'application/json'},body:JSON.stringify({operation,revision,contestId:'judging-browser-gala',runRevision:0,requestKey:crypto.randomUUID()})});assert.equal(r.status,200);}
    await visit('/events/'+event.id);assert(await evaluate("location.pathname.endsWith('/judging')&&document.body.textContent.includes('No open judging events.')"));
    await evaluate("document.querySelector('.field-bottom-nav a[href$=\"/field\"]').click()");for(let i=0;i<60;i++){if(await evaluate("!!document.querySelector('.field-board-controller')"))break;await new Promise(r=>setTimeout(r,100));}assert(await evaluate("!!document.querySelector('.field-board-controller')"),'Judge station navigation must remain reachable');

   }else{
    await check('judging-published','/events/'+event.id+'/judging');
    assert(await evaluate("document.querySelector('.judging-results').textContent.includes('90')"));
    await evaluate("document.querySelector('.judging-result-row').click()");await new Promise(r=>setTimeout(r,100));assert(await evaluate("document.querySelector('.judging-dialog').textContent.includes('Individual judge sheets remain private')"));
   }
   continue;
  }

  if(process.env.STATION_REQUIREMENTS_BROWSER_ONLY){
   if(role==='organizer'){
    await check('station-requirements-editor','/events/'+roster.id+'/stations');
    await evaluate("const form=document.querySelector('form:has([name=brawn])');form.querySelector('[name=brawn]').value='5';form.querySelector('[name=brain]').value='0';form.querySelector('[name=playersRequired]').value='6';form.requestSubmit()");
    for(let i=0;i<40;i++){if((await pg.query('SELECT brawn FROM "Station" WHERE id=$1',['requirements-editor-station'])).rows[0].brawn===5)break;await new Promise(r=>setTimeout(r,100));}
    assert.deepEqual((await pg.query('SELECT brawn,brain,"playersRequired" FROM "Station" WHERE id=$1',['requirements-editor-station'])).rows[0],{brawn:5,brain:0,playersRequired:6});
   }else if(role==='agent'){
    await check('station-requirements-mission','/events/'+event.id);
    assert(await evaluate("document.querySelector('#current-mission .station-requirements').textContent.includes('0/5')"),'Zero rating must display explicitly');
    assert.equal(await evaluate("document.querySelector('#current-mission .station-rating-icons>span:first-child').textContent"),'👊'.repeat(5));
    await check('station-requirements-list','/events/'+event.id,"document.querySelector('.mission-section').open=true");
    assert(await evaluate("!!document.querySelector('.station-tiles')"),'Requirements must appear before selecting the next station');
    await pg.query('UPDATE "Event" SET "hideStationDetails"=true WHERE id=$1',[event.id]);
    await check('station-requirements-hidden','/events/'+event.id);
    assert.equal(await evaluate("document.querySelectorAll('.player-body .station-requirements').length"),0);
   }
   continue;
  }

  if(process.env.PARTICIPANT_VISIBILITY_BROWSER_ONLY){
   if(role==='organizer'){
    await check('participant-visibility-controls','/events/'+roster.id+'/setup');
    assert.equal(await evaluate("document.querySelectorAll('.participant-visibility input[role=switch]').length"),2);
    await evaluate("const s=document.querySelector('[name=hideStationDetails]');s.scrollIntoView({block:'center'});s.focus()");
    await cmd('Input.dispatchKeyEvent',{type:'keyDown',key:' ',code:'Space',windowsVirtualKeyCode:32});
    await cmd('Input.dispatchKeyEvent',{type:'keyUp',key:' ',code:'Space',windowsVirtualKeyCode:32});
    assert(await evaluate("document.querySelector('[name=hideStationDetails]').checked"),'Visibility switch must support keyboard interaction');
    await evaluate("document.querySelector('.participant-visibility form').requestSubmit()");
    for(let i=0;i<40;i++){if((await pg.query('SELECT "hideStationDetails" FROM "Event" WHERE id=$1',[roster.id])).rows[0].hideStationDetails)break;await new Promise(r=>setTimeout(r,100));}
    assert.equal((await pg.query('SELECT "hideStationDetails" FROM "Event" WHERE id=$1',[roster.id])).rows[0].hideStationDetails,true);
    await pg.query('UPDATE "Event" SET "hideStationDetails"=true,"hideEventDetails"=true WHERE id=$1',[event.id]);
   }else if(role==='agent'){
    await check('participant-hidden-mission','/events/'+event.id);
    assert(await evaluate("document.body.textContent.includes('Station details not released yet')"));
    assert(!await evaluate("document.querySelector('.player-body').textContent.includes('Cipher Room')"));
    await check('participant-hidden-checkin','/events/'+event.id+'/check-in');
    await check('participant-hidden-program','/events/'+event.id+'/program');
   }else{
    await check('visibility-facilitator-unaffected','/events/'+event.id+'/field');
    assert(await evaluate("document.querySelector('.player-body').textContent.includes('Cipher Room')"));
   }
   continue;
  }

  if(process.env.SPY_THEME_BROWSER_ONLY){
   await check('spy-'+role+'-workspace','/workspace');
   if(role==='organizer'){
    await check('spy-setup','/events/'+roster.id+'/setup');
    await check('spy-people','/events/'+roster.id+'/people');
    await check('spy-control','/events/'+event.id);
   }else if(role==='facilitator')await check('spy-field','/events/'+event.id+'/field');
   else{
    await check('spy-mission','/events/'+event.id);
    await check('spy-contact','/events/'+event.id+'/contact');
    await check('spy-profile','/events/'+event.id+'/agents/me');
    await check('spy-results','/events/'+publishedId+'/overall');
   }
   assert(await evaluate("getComputedStyle(document.querySelector('.spy-atmosphere')).pointerEvents==='none'"),'Effects must never intercept input');
   if(role==='agent'){
    await cmd('Emulation.setDeviceMetricsOverride',{width:320,height:900,deviceScaleFactor:1,mobile:true});
    await visit('/events/'+event.id);
    await evaluate("document.querySelector('.mission-section>summary').focus()");
    await cmd('Input.dispatchKeyEvent',{type:'keyDown',key:'Enter',code:'Enter',windowsVirtualKeyCode:13});
    await cmd('Input.dispatchKeyEvent',{type:'keyUp',key:'Enter',code:'Enter',windowsVirtualKeyCode:13});
    assert(await evaluate("document.querySelector('.mission-section').open"),'Station disclosure must support the keyboard');
    assert(await evaluate("getComputedStyle(document.querySelector('.player-bottom-item:not(.active)')).backgroundColor==='rgba(0, 0, 0, 0)'"),'Inactive dock destinations must remain visually secondary');
   }
   await cmd('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
   assert(await evaluate("[...document.querySelectorAll('.spy-atmosphere *')].every(e=>getComputedStyle(e).animationName==='none')"),'Decorative effects must respect reduced motion');
   await cmd('Emulation.setEmulatedMedia',{features:[]});
   continue;
  }






  if(process.env.FREE_ROAM_BROWSER_ONLY){
   const {rows:[team]}=await pg.query('SELECT id FROM "Team" WHERE "eventId"=$1 LIMIT 1',[event.id]);
   if(role==='organizer'){
    await pg.query('DELETE FROM "StationVisit" WHERE "eventId"=$1',[event.id]);await pg.query('UPDATE "Event" SET state=$2 WHERE id=$1',[event.id,'PREPARING']);
    await pg.query('UPDATE "Station" SET configured=true,capacity=1,"queueEnabled"=false WHERE id=$1',['demo-cipher-room']);
    await pg.query('INSERT INTO "Station" (id,"eventId",name,location,briefing,configured,capacity) VALUES ($1,$2,$3,$4,$5,true,1)',['roam-browser-second',event.id,'Signal Station With a Long Station Name','South entrance with a long location description','Meet the handler']);
    await pg.query('INSERT INTO "RoutePlan" (id,"eventId",name,mode,"stationIds") VALUES ($1,$2,$3,$4,$5)',['roam-browser-route',event.id,'Captain choice','FREE',JSON.stringify(['demo-cipher-room','roam-browser-second'])]);

    for(let i=0;i<4;i++)await pg.query('INSERT INTO "Team" (id,"eventId",name) VALUES ($1,$2,$3)',['bulk-browser-team-'+i,event.id,'Team '+(i+1)+' with a long team name']);
    const showBulk="(async()=>{const tabs=[...document.querySelectorAll('[role=tablist]')].find(e=>e.getAttribute('aria-label')==='Route sections');[...tabs.children].find(e=>e.textContent.startsWith('Team routes')).click();await new Promise(r=>setTimeout(r,100));document.querySelector('.bulk-starts>button').click();await new Promise(r=>setTimeout(r,100));})()";
    await check('roam-free-choice-setup','/events/'+event.id+'/routes',"(async()=>{const tabs=[...document.querySelectorAll('[role=tablist]')].find(e=>e.getAttribute('aria-label')==='Route sections');[...tabs.children].find(e=>e.textContent.startsWith('Team routes')).click();await new Promise(r=>setTimeout(r,100));})()");
    await check('roam-all-team-preview','/events/'+event.id+'/routes',showBulk);
    assert.equal(await evaluate("document.querySelectorAll('.bulk-starts .management-form .bulk-start-row').length"),5);
    assert.equal((await pg.query('SELECT COUNT(*)::int AS n FROM "TeamRouteAssignment" WHERE "routeId"=$1',['roam-browser-route'])).rows[0].n,0,'Preview must not save assignments');
    await evaluate("document.querySelector('.bulk-starts input[name=startingAssignments]').form.requestSubmit()");
    for(let i=0;i<40;i++){if((await pg.query('SELECT COUNT(*)::int AS n FROM "TeamRouteAssignment" WHERE "routeId"=$1',['roam-browser-route'])).rows[0].n===5)break;await new Promise(r=>setTimeout(r,150));}
    assert.equal((await pg.query('SELECT COUNT(*)::int AS n FROM "TeamRouteAssignment" WHERE "routeId"=$1',['roam-browser-route'])).rows[0].n,5);
    const loads=(await pg.query('SELECT COUNT(*)::int AS n FROM "TeamRouteAssignment" WHERE "routeId"=$1 GROUP BY "startStationId"',['roam-browser-route'])).rows.map(r=>r.n);assert.equal(Math.max(...loads)-Math.min(...loads),1);
    await pg.query('UPDATE "EventMembership" SET "isCaptain"=true WHERE "eventId"=$1 AND role=$2',[event.id,'PARTICIPANT']);await pg.query('UPDATE "Event" SET state=$2 WHERE id=$1',[event.id,'LIVE']);
   }else{
    await check('roam-required-first','/events/'+event.id);assert(await evaluate("document.body.textContent.includes('Required first station.')"));assert.equal(await evaluate("!!document.querySelector('.station-choice')"),false);
    await pg.query('UPDATE "TeamRouteAssignment" SET "startStationId"=NULL WHERE "teamId"=$1',[team.id]);
    await pg.query('INSERT INTO "Team" (id,"eventId",name) VALUES ($1,$2,$3)',['roam-busy-team',event.id,'Busy team']);await pg.query('INSERT INTO "StationVisit" (id,"eventId","teamId","stationId",state,"updatedAt") VALUES ($1,$2,$3,$4,$5,now())',['roam-busy-visit',event.id,'roam-busy-team','demo-cipher-room','ARRIVED']);
    await pg.query('INSERT INTO "AuditEntry" (id,"eventId","actorId",action,"targetId","detailsJson") SELECT $1,$2,id,$3,$4,$5 FROM "User" WHERE email=$6',['roam-busy-arrival',event.id,'RACE_CHECKIN','roam-busy-visit',JSON.stringify({state:'ARRIVED'}),'agent@example.test']);
    await check('roam-station-choice','/events/'+event.id,"document.querySelector('.mission-section').open=true");assert(await evaluate("document.querySelector('.station-tiles').textContent.includes('Full')"));
    await evaluate("[...document.querySelectorAll('.station-tile')].find(t=>t.textContent.includes('Full')).click()");await new Promise(r=>setTimeout(r,100));assert(await evaluate("document.querySelector('.station-detail-modal').textContent.includes('Busy team')&&document.querySelector('.station-detail-modal').textContent.includes('Since')"));
    await evaluate("document.querySelector('.station-modal-close').click()");await new Promise(r=>setTimeout(r,100));await evaluate("[...document.querySelectorAll('.station-tile')].find(t=>t.textContent.includes('Signal Station')).click()");await new Promise(r=>setTimeout(r,100));await evaluate("[...document.querySelectorAll('.station-detail-modal button')].find(b=>b.textContent==='Go to this station').click()");await new Promise(r=>setTimeout(r,100));assert(await evaluate("!document.querySelector('.station-detail-modal[open]')&&document.querySelector('.destination').textContent.includes('Signal Station')"));
    await cmd('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});await check('roam-reduced-motion','/events/'+event.id);
   }
   console.log('PASS: free roam '+role+' preview/save or required first/availability/choice at all viewport sizes.');continue;
  }
  if(process.env.VISIBILITY_BROWSER_ONLY){
   const expand="document.querySelectorAll('.content-body details,.player-body details').forEach(d=>d.open=true)";
   if(role==='organizer'){
    await check('visibility-new-event','/events/new');
    await check('visibility-empty-route','/events/'+roster.id+'/routes',"[...document.querySelectorAll('[role=tab]')].find(t=>t.textContent.includes('Create route')).click()");
    for(const section of ['setup','people','stations','routes','staff','ranking-settings','contact-settings','voting-settings','rehearsal','lifecycle'])await check('visibility-'+section,'/events/'+roster.id+'/'+section,expand);
    await check('visibility-new-route','/events/'+roster.id+'/routes',"(async()=>{[...document.querySelectorAll('[role=tab]')].find(t=>t.textContent.includes('Create route')).click();await new Promise(r=>setTimeout(r,100));const select=[...document.querySelectorAll('.fields select')].find(e=>e.getClientRects().length);select.value=select.options[1].value;select.dispatchEvent(new Event('change',{bubbles:true}));await new Promise(r=>setTimeout(r,100));})()");
    for(const section of ['','field','results','overall','contact-policy'])await check('visibility-operations-'+(section||'control'),'/events/'+event.id+(section?'/'+section:''),expand);
   }else if(role==='facilitator')await check('visibility-facilitator','/events/'+event.id+'/field',expand);
   else for(const section of ['','contact','check-in','results','overall','agents/me'])await check('visibility-player-'+(section||'mission').replace('/','-'),'/events/'+event.id+(section?'/'+section:''),expand);
   continue;
  }
  if(process.env.LISTS_BROWSER_ONLY){
   const clickTab=async(label,name)=>evaluate("(()=>{const list=[...document.querySelectorAll('[role=tablist]')].find(e=>e.getAttribute('aria-label')==="+JSON.stringify(label)+"&&e.getClientRects().length);const tab=[...list.children].find(e=>e.textContent.startsWith("+JSON.stringify(name)+"));tab.click();})()");
   const visibleForm=label=>"[...document.forms].find(f=>f.getClientRects().length&&[...f.querySelectorAll('button')].some(b=>b.textContent==="+JSON.stringify(label)+"))";
   await check('list-stations','/events/'+roster.id+'/stations');
   assert.equal(await evaluate("[...document.querySelectorAll('form')].filter(f=>f.getClientRects().length&&f.textContent.includes('Save station rules')).length"),1);
   await evaluate("const f="+visibleForm('Save station rules')+";f.querySelector('input[name=location]').value='Unsaved station location'");
   await clickTab('Stations','Station 2');await clickTab('Stations','Station 1');
   assert.equal(await evaluate(visibleForm('Save station rules')+".querySelector('input[name=location]').value"),'Unsaved station location');
   await evaluate(visibleForm('Save station rules')+'.requestSubmit()');
   for(let i=0;i<40;i++){if((await pg.query('SELECT location FROM "Station" WHERE id=$1',['list-station-0'])).rows[0].location==='Unsaved station location')break;await new Promise(r=>setTimeout(r,150));}
   assert.equal((await pg.query('SELECT location FROM "Station" WHERE id=$1',['list-station-0'])).rows[0].location,'Unsaved station location');
   await evaluate("const x=document.querySelector('.record-search input');x.focus()");await cmd('Input.insertText',{text:'Station 7'});
   assert.equal(await evaluate("document.querySelectorAll('.record-tabs [role=tab]').length"),1);
   await evaluate("document.querySelector('.record-search input').focus()");await cmd('Input.dispatchKeyEvent',{type:'keyDown',key:'a',code:'KeyA',modifiers:2,windowsVirtualKeyCode:65});await cmd('Input.dispatchKeyEvent',{type:'keyUp',key:'a',code:'KeyA',modifiers:2,windowsVirtualKeyCode:65});await cmd('Input.insertText',{text:'No matching station'});
   assert(await evaluate("document.body.textContent.includes('No matching records')"));
   await check('list-routes','/events/'+roster.id+'/routes');await clickTab('Route sections','Team routes');await clickTab('Teams','Team 2');
   assert.equal(await evaluate("[...document.querySelectorAll('.route-preview')].filter(e=>e.getClientRects().length).length"),1);
   await evaluate("const d=[...document.querySelectorAll('.record-add')].find(e=>e.getClientRects().length);d.open=true");
   assert.equal(await evaluate(visibleForm('Assign route')+".querySelector('select[name=teamId]').selectedOptions[0].textContent"),'Team 2');
   await cmd('Emulation.setDeviceMetricsOverride',{width:320,height:900,deviceScaleFactor:1,mobile:true});assert(await evaluate('document.documentElement.scrollWidth<=innerWidth'),'Expanded route form overflow');
   await evaluate("const f="+visibleForm('Assign route')+";const x=f.querySelector('select[name=routeId]');x.value='list-route-1';x.dispatchEvent(new Event('change',{bubbles:true}))");
   await evaluate(visibleForm('Assign route')+'.requestSubmit()');
   for(let i=0;i<40;i++){if((await pg.query('SELECT a."routeId" FROM "TeamRouteAssignment" a JOIN "Team" t ON t.id=a."teamId" WHERE t."eventId"=$1 AND t.name=$2',[roster.id,'Team 2'])).rows[0].routeId==='list-route-1')break;await new Promise(r=>setTimeout(r,150));}
   assert.equal((await pg.query('SELECT a."routeId" FROM "TeamRouteAssignment" a JOIN "Team" t ON t.id=a."teamId" WHERE t."eventId"=$1 AND t.name=$2',[roster.id,'Team 2'])).rows[0].routeId,'list-route-1');
   assert.equal((await pg.query('SELECT a."routeId" FROM "TeamRouteAssignment" a JOIN "Team" t ON t.id=a."teamId" WHERE t."eventId"=$1 AND t.name=$2',[roster.id,'Team 1'])).rows[0].routeId,'list-route-0');

   await check('list-facilitators','/events/'+roster.id+'/staff');await clickTab('Staffing sections','By facilitator');await clickTab('Facilitators','Facilitator 2');
   assert.equal(await evaluate("[...document.forms].filter(f=>f.getClientRects().length&&f.textContent.includes('Save station access')).length"),1);
   await evaluate("const f="+visibleForm('Save station access')+";f.querySelector('input[name=stationId]').checked=true;f.requestSubmit()");
   for(let i=0;i<40;i++){if((await pg.query('SELECT count(*)::int AS n FROM "FacilitatorAssignment" WHERE "membershipId"=$1',['list-member-1'])).rows[0].n===2)break;await new Promise(r=>setTimeout(r,150));}
   assert.equal((await pg.query('SELECT count(*)::int AS n FROM "FacilitatorAssignment" WHERE "membershipId"=$1',['list-member-1'])).rows[0].n,2);

   await check('list-activities','/events/'+roster.id+'/ranking-settings');await clickTab('Activities','Sports');
   await evaluate("[...document.querySelectorAll('input[maxlength]')].find(e=>e.getClientRects().length).focus()");await cmd('Input.dispatchKeyEvent',{type:'keyDown',key:'a',code:'KeyA',modifiers:2,windowsVirtualKeyCode:65});await cmd('Input.dispatchKeyEvent',{type:'keyUp',key:'a',code:'KeyA',modifiers:2,windowsVirtualKeyCode:65});await cmd('Input.insertText',{text:'Edited sports name'});
   await clickTab('Activities','Spy Chase');await clickTab('Activities','Edited sports name');
   assert.equal(await evaluate("[...document.querySelectorAll('input[maxlength]')].find(e=>e.getClientRects().length).value"),'Edited sports name');

   await evaluate("[...document.querySelectorAll('button')].find(b=>b.getClientRects().length&&b.textContent==='Save draft').click()");
   for(let i=0;i<40;i++){if((await pg.query('SELECT config FROM "OverallRanking" WHERE "eventId"=$1',[roster.id])).rows[0].config.events[1].name==='Edited sports name')break;await new Promise(r=>setTimeout(r,150));}
   assert.equal((await pg.query('SELECT config FROM "OverallRanking" WHERE "eventId"=$1',[roster.id])).rows[0].config.events[1].name,'Edited sports name');
   await clickTab('Overall ranking sections','Team standings');assert.equal(await evaluate("[...document.querySelectorAll('.overall-standing')].filter(e=>e.getClientRects().length).length"),5);
   await check('list-voting','/events/'+roster.id+'/voting-settings');await clickTab('Voting events','Voting award 2');
   assert.equal(await evaluate("[...document.querySelectorAll('.voting-event')].filter(e=>e.getClientRects().length).length"),1);
   console.log('PASS: station/route/facilitator/activity/voting tabs, preserved unsaved edits, actual station save, search/empty state, team-scoped assignment and responsive lists.');continue;
  }
  if(process.env.ERROR_BROWSER_ONLY){
   await check('error-modal-login','/login?error=rate');
   assert(await evaluate("document.activeElement===document.querySelector('.error-modal button')"),'Error modal receives focus');
   await evaluate("document.querySelector('input[name=email]').focus()");
   assert(await evaluate("document.activeElement===document.querySelector('.error-modal button')"),'Background is inert');
   await cmd('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
   await cmd('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});await new Promise(r=>setTimeout(r,150));
   assert(!(await evaluate("document.querySelector('.error-modal').open")),'Escape dismisses the error');
   await visit('/events/'+roster.id+'/people');
   await evaluate("document.querySelector('.roster-add').open=true;const form=[...document.forms].find(f=>f.querySelector('input[name=operation]')?.value==='addTeam'||[...f.querySelectorAll('button')].some(b=>b.textContent==='Add team'));form.querySelector('input[name=name]').focus();form.querySelector('input[name=name]').value='Team 1';form.requestSubmit()");
   for(let i=0;i<40;i++){if(await evaluate("document.querySelector('.error-modal').open"))break;await new Promise(r=>setTimeout(r,150));}
   assert(await evaluate("document.querySelector('.error-modal').open"),'Management errors open a modal');
   for(const width of [320,390,768,1440]){await cmd('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width<768});assert(await evaluate("(()=>{const r=document.querySelector('.error-modal').getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight&&document.documentElement.scrollWidth<=innerWidth})()"),'Modal fits the viewport');}
   await evaluate("document.querySelector('.error-modal button').click()");await new Promise(r=>setTimeout(r,150));
   assert(!(await evaluate("document.querySelector('.error-modal').open")));
   assert(await evaluate("[...document.forms].find(f=>[...f.querySelectorAll('button')].some(b=>b.textContent==='Add team')).querySelector('input[name=name]').value==='Team 1'"),'Error dismissal preserves input');
   assert(await evaluate("document.activeElement?.getAttribute('name')==='name'"),'Focus returns to the form');
   // Repeating the same failed submission must open a new notice.
   await evaluate("[...document.forms].find(f=>[...f.querySelectorAll('button')].some(b=>b.textContent==='Add team')).requestSubmit()");
   for(let i=0;i<40;i++){if(await evaluate("document.querySelector('.error-modal').open"))break;await new Promise(r=>setTimeout(r,150));}
   assert(await evaluate("document.querySelector('.error-modal').open"));await evaluate("document.querySelector('.error-modal button').click()");
   await evaluate("const f=[...document.forms].find(f=>[...f.querySelectorAll('button')].some(b=>b.textContent==='Add team'));f.querySelector('input[name=name]').value='Modal validation team';f.requestSubmit()");
   for(let i=0;i<40;i++){if((await pg.query('SELECT id FROM "Team" WHERE "eventId"=$1 AND name=$2',[roster.id,'Modal validation team'])).rows.length)break;await new Promise(r=>setTimeout(r,150));}
   assert.equal((await pg.query('SELECT id FROM "Team" WHERE "eventId"=$1 AND name=$2',[roster.id,'Modal validation team'])).rows.length,1);
   assert(!(await evaluate("document.querySelector('.error-modal').open")),'Successful submissions do not open an error modal');
   console.log('PASS: login and management error modals, focus trap/restore, Escape/Close, repeated errors, retained input, successful retry and responsive sizing.');continue;
  }


  if(process.env.CONTROLLER_BROWSER_ONLY){
   const base='/events/'+event.id;
   const click=async label=>evaluate("[...document.querySelectorAll('button')].find(b=>b.getClientRects().length&&(b.getAttribute('aria-label')||b.textContent.trim())==="+JSON.stringify(label)+").click()");
   const tab=async(label,item)=>evaluate("[...document.querySelectorAll('[role=tablist]')].find(e=>e.getAttribute('aria-label')==="+JSON.stringify(label)+").querySelectorAll('button')["+item+"].click()");
   const wait=async fn=>{for(let i=0;i<80;i++){if(await fn())return;await new Promise(r=>setTimeout(r,100));}throw Error('Controller condition timed out');};
   const closeFeedback=async()=>{await wait(()=>evaluate("!!document.querySelector('.action-feedback-modal[open] button')"));await evaluate("document.querySelector('.action-feedback-modal[open] button').click()");};
   if(role==='organizer'){
    await check('controller-organizer-unchanged',base);assert(await evaluate("!!document.querySelector('.themed-shell')&&!document.querySelector('.controller-shell')"));continue;
   }
   if(role==='agent'){
    await check('controller-player-mission',base);
    assert(await evaluate("!!document.querySelector('.participant-controller')"));
    assert.equal(await evaluate("document.querySelector('.mission-main').hidden"),false);
    assert.equal(await evaluate("document.querySelectorAll('.participant-controller [role=tablist]').length"),0);
    await check('controller-player-stations',base,"document.querySelector('.mission-section').open=true");
    assert.equal(await evaluate("document.querySelector('.mission-main').hidden"),false);
    await check('controller-player-team',base,"document.querySelector('#team-file').open=true");
    assert(await evaluate("document.querySelector('#team-file').open"));
    await evaluate("window.__controllerNavigation='same-document';document.querySelector('.player-bottom-nav a[href$=\"/agents/me\"]').click()");
    await wait(()=>evaluate("!!document.querySelector('.agent-dossier-shell')"));
    assert.equal(await evaluate('window.__controllerNavigation'),'same-document');
    await evaluate("document.querySelector('.dossier-mission-action').click()");await wait(()=>evaluate("!!document.querySelector('.participant-controller')"));
    assert.equal(await evaluate('window.__controllerNavigation'),'same-document');
    await pg.query('UPDATE "StationVisit" SET state=$1,"startedAt"=NULL WHERE id=$2',['CANCELLED','timer-browser-visit']);
    await visit(base);assert(await evaluate("document.querySelector('.mission-arrival').getBoundingClientRect().height>=56"));
    await pg.query('UPDATE "StationVisit" SET state=$1,"startedAt"=NOW() WHERE id=$2',['ACTIVE','timer-browser-visit']);
    console.log('PASS: participant mission and disclosures, large captain action, full profile, mobile safe area and client navigation.');continue;
   }
   await check('controller-field-work',base);
   assert.equal(await evaluate("[...document.querySelectorAll('.station-team')].filter(e=>e.getClientRects().length).length"),1);
   assert.equal(await evaluate("document.querySelectorAll('.field-board-controller [role=tablist]').length"),0);
   // Return to the active timer regardless of database row ordering.
   await evaluate("const select=document.querySelector('.field-columns .station-choice select');select.value=document.querySelector('.station-team[data-visit-state=ACTIVE]').id.split('-teams-panel-')[1];select.dispatchEvent(new Event('change',{bubbles:true}))");
   await check('controller-field-tools',base,"document.querySelector('.field-tools').open=true;document.querySelector('.time-penalty-editor').open=true");
   await visit(base);await evaluate("window.__controllerNavigation='same-document';document.querySelector('.field-bottom-nav a[href$=\"#field-history\"]').click()");
   await wait(()=>evaluate("document.querySelector('#field-history').getClientRects().length>0"));
   assert.equal(await evaluate('window.__controllerNavigation'),'same-document');
   await evaluate("document.querySelector('.field-bottom-nav a:not([href*=judging])').click()");
   const actorId=(await pg.query('SELECT id FROM "User" WHERE email=$1',['facilitator@example.test'])).rows[0].id;
   const hiddenRetryKey='spy-race:'+actorId+':'+event.id+':startChallenge:controller-second-visit';
   await evaluate("sessionStorage.setItem("+JSON.stringify(hiddenRetryKey)+","+JSON.stringify(JSON.stringify({body:{operation:'startChallenge',visitId:'controller-second-visit',requestKey:crypto.randomUUID()},description:'Hidden team pending check',endpoint:'race'}))+");window.dispatchEvent(new Event('spy-race-pending'))");
   await wait(()=>evaluate("!!document.querySelector('.pending-requests')&&document.querySelector('.pending-requests').textContent.includes('Hidden team pending check')"));
   await evaluate("sessionStorage.removeItem("+JSON.stringify(hiddenRetryKey)+");window.dispatchEvent(new Event('spy-race-pending'))");
   await evaluate("[...document.querySelectorAll('.station-team:not([hidden]) button')].find(b=>(b.getAttribute('aria-label')||b.textContent).startsWith('+10 sec')).click()");
   await wait(async()=>(await pg.query('SELECT COUNT(*)::int AS n FROM "TimePenaltyEntry" WHERE "visitId"=$1',['timer-browser-visit'])).rows[0].n===1);assert(await evaluate("!document.querySelector('.action-feedback-modal[open]')"));
   await click('Finish challenge');await wait(async()=>(await pg.query('SELECT state FROM "StationVisit" WHERE id=$1',['timer-browser-visit'])).rows[0].state==='AWAITING_CONFIRMATION');await closeFeedback();
   await wait(()=>evaluate("!![...document.querySelectorAll('.station-team:not([hidden]) button')].find(b=>b.textContent==='Review station time')"));
   await click('Review station time');await click('Confirm station time');
   await wait(async()=>(await pg.query('SELECT state FROM "StationVisit" WHERE id=$1',['timer-browser-visit'])).rows[0].state==='COMPLETED');await closeFeedback();
   assert.equal((await pg.query('SELECT "timePenaltySeconds" FROM "StationOutcome" WHERE "visitId"=$1',['timer-browser-visit'])).rows[0].timePenaltySeconds,10);
   // A points-mode draft must survive tabs, SPA navigation, reload, polling and disconnection.
   await pg.query('UPDATE "OverallRanking" SET config=jsonb_set(config,$1,$2) WHERE "eventId"=$3',['{raceRule}','"POINTS"',event.id]);
   await pg.query('UPDATE "Station" SET "allowAdjustments"=true WHERE id=$1',['demo-cipher-room']);
   await pg.query('UPDATE "StationVisit" SET state=$1,"startedAt"=NOW(),"finishedAt"=NOW() WHERE id=$2',['AWAITING_CONFIRMATION','controller-second-visit']);
   await visit(base);await evaluate("document.querySelector('.station-team:not([hidden]) textarea').focus()");await cmd('Input.insertText',{text:'Keep this facilitator draft'});
   await evaluate("document.querySelector('.field-bottom-nav a[href$=\"#field-history\"]').click()");await evaluate("document.querySelector('.field-bottom-nav a:not([href*=judging])').click()");
   assert.equal(await evaluate("document.querySelector('.station-team textarea').value"),'Keep this facilitator draft');
   await evaluate("window.__controllerNavigation='same-document';document.querySelector('.field-bottom-nav a[href$=\"/people\"]').click()");await wait(()=>evaluate("!!document.querySelector('.roster-tabs')"));
   await evaluate("document.querySelector('.field-bottom-nav a[href=\""+base+"/field\"]').click()");await wait(()=>evaluate("!!document.querySelector('.station-team textarea')"));
   assert.equal(await evaluate('window.__controllerNavigation'),'same-document');
   await wait(()=>evaluate("document.querySelector('.station-team textarea').value==='Keep this facilitator draft'"));
   await visit(base);assert.equal(await evaluate("document.querySelector('.station-team textarea').value"),'Keep this facilitator draft');
   await cmd('Network.emulateNetworkConditions',{offline:true,latency:0,downloadThroughput:0,uploadThroughput:0});await evaluate("window.dispatchEvent(new Event('offline'))");
   assert.equal(await evaluate("document.querySelector('.station-team textarea').value"),'Keep this facilitator draft');
   await cmd('Network.emulateNetworkConditions',{offline:false,latency:0,downloadThroughput:-1,uploadThroughput:-1});await evaluate("document.querySelector('.error-modal[open] button')?.click();window.dispatchEvent(new Event('online'))");
   await wait(()=>evaluate("!document.querySelector('.sync-status button').disabled"));
   assert.equal(await evaluate("document.querySelector('.station-team textarea').value"),'Keep this facilitator draft');
   await evaluate("document.querySelector('.player-account').open=true;document.querySelector('.player-account form').requestSubmit()");await wait(()=>evaluate("location.pathname==='/login'"));
   assert.equal(await evaluate("Object.keys(sessionStorage).filter(k=>k.startsWith('spy-field-draft:')).length"),0);
   console.log('PASS: one-team controller, station/history/tools, real penalty/finish/confirm, retained drafts across history/navigation/reload/offline and sign-out cleanup.');continue;
  }
  if(process.env.PROGRAM_BROWSER_ONLY){
   const url='/events/'+event.id+'/program';
   await check('program-'+role,url);
   assert.equal(await evaluate("document.querySelectorAll('.program-tabs [role=tab]').length"),3);
   assert(await evaluate("getComputedStyle(document.querySelectorAll('.program-tabs button')[0]).backgroundColor!==getComputedStyle(document.querySelectorAll('.program-tabs button')[1]).backgroundColor"),'Selected program tab must be visually distinct');
   await evaluate("document.querySelectorAll('.program-tabs button')[0].focus();document.querySelectorAll('.program-tabs button')[0].dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true}))");
   assert.equal(await evaluate("document.querySelectorAll('.program-tabs button')[1].getAttribute('aria-selected')"),'true');
   await check('program-briefing-'+role,url,"document.querySelectorAll('.program-tabs button')[1].click();[...document.querySelectorAll('.program-item summary')].find(e=>e.textContent.includes('Pre-Race Tactical Challenge')).click()");
   assert(await evaluate("[...document.querySelectorAll('.program-item[open]')].some(e=>e.textContent.includes('Chief Macabai M. Pangamadun'))"));
   await check('program-gala-'+role,url,"document.querySelectorAll('.program-tabs button')[2].click();[...document.querySelectorAll('.program-item summary')].find(e=>e.textContent.includes('Gala Showcase')).click()");
   assert(await evaluate("[...document.querySelectorAll('.program-day:not([hidden]) time')].some(e=>e.textContent==='10:00 PM')"));
   if(role==='agent'){
    await visit('/events/'+event.id);
    assert(await evaluate("!!document.querySelector('.mission-program-entry a')"));
    await evaluate("document.querySelector('.player-account').open=true");
    assert(await evaluate("!!document.querySelector('.player-account-menu a[href$=\"/program\"]')"));
   }
   console.log('PASS: '+role+' event program, keyboard tabs, expanded speakers, gala timings and 320/390/768/1440 layouts.');continue;
  }
  if(process.env.ROSTER_BROWSER_ONLY){
   const peopleUrl='/events/'+roster.id+'/people';await check('roster-'+role,peopleUrl);
   assert.equal(await evaluate("document.querySelectorAll('[role=tab]').length"),role==='organizer'?6:5);
   assert.equal(await evaluate("document.querySelector('[role=tabpanel]:not([hidden])').querySelectorAll('.roster-row').length"),19);
   await evaluate("document.querySelectorAll('[role=tab]')[2].click()");
   assert.equal(await evaluate("document.querySelector('[role=tabpanel]:not([hidden])').querySelectorAll('.roster-row').length"),18);
   assert.equal(await evaluate("[...document.querySelectorAll('[role=tabpanel]')].filter(e=>!e.hidden).length"),1);
   await evaluate("document.querySelectorAll('[role=tab]')[2].dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true}))");
   assert(await evaluate("document.querySelectorAll('[role=tab]')[3].getAttribute('aria-selected')==='true'"));
   assert(await evaluate("document.querySelector('[role=tabpanel]:not([hidden])').textContent.includes('Intel / Radio Officer')"));
   for(const width of [320,390,768,1440]){await cmd('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width<768});assert(await evaluate('document.documentElement.scrollWidth<=innerWidth'),'Squad role roster overflow');}
   if(role==='facilitator'){
    assert.equal(await evaluate("document.querySelectorAll('.roster-edit,.roster-add').length"),0);
    assert(await evaluate("!![...document.querySelectorAll('a')].find(a=>a.textContent==='Teams & agents')"));
    await evaluate("document.querySelector('[role=tabpanel]:not([hidden]) .roster-name').click()");await new Promise(r=>setTimeout(r,500));
    assert(await evaluate("!!document.querySelector('.agent-dossier-shell')"),'Facilitator can open a player dossier');
    assert(await evaluate("document.querySelector('.agent-biography').textContent.includes('Intel / Radio Officer')"));
   }else{
    await evaluate("document.querySelector('[role=tabpanel]:not([hidden]) .roster-edit').open=true");
    assert(await evaluate("!!document.querySelector('[role=tabpanel]:not([hidden]) input[name=membershipId]')"),'Organizer assignment form retained');
    assert.equal(await evaluate("document.querySelector('[role=tabpanel]:not([hidden]) select[name=squadRole]').value"),'Intel / Radio Officer');
    await cmd('Emulation.setDeviceMetricsOverride',{width:320,height:900,deviceScaleFactor:1,mobile:true});
    assert(await evaluate('document.documentElement.scrollWidth<=innerWidth'),'Expanded assignment form overflow');
   }
   console.log('PASS: '+role+' team tabs, participant grouping, keyboard navigation, roster permissions and mobile layout.');continue;
  }
  if(process.env.RESET_BROWSER_ONLY){
   const resetUrl='/events/'+roster.id+'/lifecycle';
   await pg.query('UPDATE "Event" SET state=$1 WHERE id=$2',['LIVE',roster.id]);
   const namesBefore=(await pg.query('SELECT id,name,email,"passwordHash" FROM "User" ORDER BY id')).rows;
   const membersBefore=(await pg.query('SELECT * FROM "EventMembership" WHERE "eventId"=$1 ORDER BY id',[roster.id])).rows;
   await check('event-reset',resetUrl);
   assert.equal(await evaluate("!![...document.querySelectorAll('h2')].find(e=>e.textContent==='Reset event run')"),true);
   await evaluate("document.querySelector('.danger-zone input').focus()");await cmd('Input.insertText',{text:'Repeat the dry run using the same roster'});
   const eventName=(await pg.query('SELECT name FROM "Event" WHERE id=$1',[roster.id])).rows[0].name;
   await evaluate("document.querySelectorAll('.danger-zone input')[1].focus()");await cmd('Input.insertText',{text:eventName});
   await evaluate("document.querySelector('.danger-zone form').requestSubmit()");
   for(let i=0;i<40;i++){if(await evaluate("!!document.querySelector('.lifecycle-preview')"))break;await new Promise(r=>setTimeout(r,150));}
   assert(await evaluate("!!document.querySelector('.lifecycle-preview')"),'Reset preview must open');
   for(const width of [320,390,768,1440]){await cmd('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width<768});assert(await evaluate('document.documentElement.scrollWidth<=innerWidth'),'Reset preview overflow');}
   await evaluate("document.querySelector('.lifecycle-preview button').click()");
   for(let i=0;i<40;i++){if(await evaluate("!!document.querySelector('[role=status]')?.textContent.includes('Event run reset')"))break;await new Promise(r=>setTimeout(r,150));}
   assert(await evaluate("!!document.querySelector('[role=status]')?.textContent.includes('Event run reset')"),'Reset must confirm');
   assert.equal((await pg.query('SELECT state FROM "Event" WHERE id=$1',[roster.id])).rows[0].state,'PREPARING');
   assert.deepEqual((await pg.query('SELECT id,name,email,"passwordHash" FROM "User" ORDER BY id')).rows,namesBefore);
   assert.deepEqual((await pg.query('SELECT * FROM "EventMembership" WHERE "eventId"=$1 ORDER BY id',[roster.id])).rows,membersBefore);

   // Fresh pages carry the new run revision; an already-open page keeps the old one.
   await pg.query('INSERT INTO "Station" (id,"eventId",name,location,briefing) VALUES ($1,$2,$3,$4,$5)',['revision-browser-station',roster.id,'Revision station','Hall','Physical game']);
   const fieldUrl='/events/'+roster.id+'/field';
   const reviewButtons=async()=>{
    await evaluate("document.querySelectorAll('details').forEach(d=>d.open=true)");
    await evaluate("[...document.querySelectorAll('button')].find(b=>b.textContent==='Add violation button').click()");
    await evaluate("[...document.querySelectorAll('button')].find(b=>b.textContent==='Review violation buttons').click()");
   };
   const saveButtons=async()=>{
    await evaluate("[...document.querySelectorAll('button')].find(b=>b.textContent==='Save violation buttons').click()");
    for(let i=0;i<40;i++){if(!(await evaluate("!![...document.querySelectorAll('button')].find(b=>b.textContent==='Confirming…')")))break;await new Promise(r=>setTimeout(r,150));}
    await new Promise(r=>setTimeout(r,400));
   };
   await visit(fieldUrl);await reviewButtons();await saveButtons();
   assert.equal((await pg.query('SELECT "timePenaltyRevision" AS n FROM "Station" WHERE id=$1',['revision-browser-station'])).rows[0].n,1,'Fresh post-reset page must save');
   await visit(fieldUrl);await reviewButtons();
   const resetAgain=await evaluate("(async()=>{const base="+JSON.stringify('/api/events/'+roster.id+'/lifecycle')+";const body={operation:'resetEventRun',reason:'Verify old pages are rejected after another reset',confirmation:"+JSON.stringify(eventName)+"};const p=await fetch(base+'-preview',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const preview=await p.json();const r=await fetch(base,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...body,previewToken:preview.token,requestKey:crypto.randomUUID()})});return r.status;})()");assert.equal(resetAgain,200);
   await saveButtons();
   assert(await evaluate("document.body.textContent.includes('This event was reset. Refresh the page')"),'Old rendered page must show reset error');
   assert.equal((await pg.query('SELECT "timePenaltyRevision" AS n FROM "Station" WHERE id=$1',['revision-browser-station'])).rows[0].n,1,'Old page must not change the new run');
   await visit(fieldUrl);await reviewButtons();await saveButtons();
   assert.equal((await pg.query('SELECT "timePenaltyRevision" AS n FROM "Station" WHERE id=$1',['revision-browser-station'])).rows[0].n,2,'Reloaded page must use the new revision');
   console.log('PASS: real browser sends current run revision, rejects stale open-page actions after reset, and resumes after reload.');
   console.log('PASS: real organizer reset form, preview, confirmation, preserved 93-player roster and 320/390/768/1440 layouts.');continue;
  }
  if(process.env.VOTING_BROWSER_ONLY){
   const voteUrl='/events/'+event.id+'/voting',setupUrl='/events/'+event.id+'/voting-settings';
   if(role==='organizer'){
    votingOrganizerCookie=cookie;
    await check('voting-setup-empty',setupUrl);
    await evaluate("[...document.querySelectorAll('button')].find(b=>b.textContent==='Create voting event').click()");
    await evaluate("document.querySelector('.voting-editor input[maxlength]').focus()");await cmd('Input.insertText',{text:'Showstealer'});
    await evaluate(`(()=>{const inputs=document.querySelectorAll('.voting-editor input[type="datetime-local"]');for(let i=0;i<2;i++){const d=new Date(Date.now()+(i?3600000:-60000));const value=new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,16);Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(inputs[i],value);inputs[i].dispatchEvent(new Event('input',{bubbles:true}));inputs[i].dispatchEvent(new Event('change',{bubbles:true}));}})()`);
    await evaluate("document.querySelectorAll('.voting-candidate-setup input[type=checkbox]').forEach(e=>e.click())");
    await evaluate("document.querySelector('.voting-editor button[type=submit]').click()");
    assert(await evaluate("document.body.textContent.includes('Review voting configuration')"),await evaluate('document.body.innerText'));
    await evaluate("[...document.querySelectorAll('button')].find(b=>b.textContent==='Save voting event').click()");
    for(let i=0;i<50;i++){const rows=(await pg.query('SELECT id FROM "VotingEvent" WHERE "eventId"=$1',[event.id])).rows;if(rows.length){votingPollId=rows[0].id;break;}await new Promise(r=>setTimeout(r,100));}
    assert(votingPollId,await evaluate('document.body.innerText'));
    await check('voting-controls',voteUrl);await evaluate('window.confirm=()=>true');
    await evaluate("[...document.querySelectorAll('button')].find(b=>b.textContent==='Enable voting').click()");
    await evaluate("document.querySelector('.action-feedback-modal[open] .action-feedback-actions button:last-child').click()");
    for(let i=0;i<50;i++){if((await pg.query('SELECT enabled FROM "VotingEvent" WHERE id=$1',[votingPollId])).rows[0].enabled)break;await new Promise(r=>setTimeout(r,100));}
    assert.equal((await pg.query('SELECT enabled FROM "VotingEvent" WHERE id=$1',[votingPollId])).rows[0].enabled,true);
    await check('voting-roster-setup','/events/'+roster.id+'/voting-settings',"(async()=>{[...document.querySelectorAll('button')].find(b=>b.textContent==='Create voting event').click();await new Promise(r=>setTimeout(r,100));[...document.querySelectorAll('button')].find(b=>b.textContent==='Select all participants').click();})()");
    assert((await evaluate('document.body.textContent')).includes('93 candidates selected'));
   }else if(role==='agent'){
    await visit('/events/'+event.id);assert(await evaluate("!!document.querySelector('.voting-notice a')"));
    await check('voting-player-ballot',voteUrl);
    assert.equal(await evaluate("!!document.querySelector('.voting-results')"),false);
    await check('voting-ballot-review',voteUrl,"document.querySelector('.voting-candidate input').click();document.querySelector('.voting-ballot button[type=submit]').click()");

    const changedCandidate=(await pg.query('SELECT id FROM "EventMembership" WHERE "eventId"=$1 AND role=$2',[event.id,'FACILITATOR'])).rows[0].id;
    await pg.query('UPDATE "EventMembership" SET active=false WHERE id=$1',[changedCandidate]);
    await evaluate("[...document.querySelectorAll('button')].find(b=>b.textContent==='Refresh voting events').click()");
    for(let i=0;i<40;i++){if(await evaluate("document.body.textContent.includes('The candidate list changed.')"))break;await new Promise(r=>setTimeout(r,100));}
    assert(await evaluate("document.body.textContent.includes('The candidate list changed.')"));
    assert.equal(await evaluate("document.querySelectorAll('.voting-candidate input:checked').length"),0);
    await pg.query('UPDATE "EventMembership" SET active=true WHERE id=$1',[changedCandidate]);
    await evaluate("[...document.querySelectorAll('button')].find(b=>b.textContent==='Refresh voting events').click()");
    await new Promise(r=>setTimeout(r,300));
    await evaluate("document.querySelector('.voting-candidate input').click()");
    await evaluate("document.querySelector('.voting-ballot button[type=submit]').click()");
    await evaluate("[...document.querySelectorAll('button')].find(b=>b.textContent==='Submit final ballot').click()");
    for(let i=0;i<50;i++){if((await pg.query('SELECT COUNT(*)::int AS n FROM "VotingBallot" WHERE "votingEventId"=$1',[votingPollId])).rows[0].n===1)break;await new Promise(r=>setTimeout(r,100));}
    await check('voting-player-receipt',voteUrl);assert(await evaluate("document.body.textContent.includes('Your ballot is recorded')"));
    assert.equal(await evaluate("!!document.querySelector('.voting-results')"),false);
   }else{
    await check('voting-ineligible-facilitator',voteUrl);assert.equal(await evaluate("!!document.querySelector('.voting-ballot')"),false);
    const votePost=async(body)=>{const r=await fetch(appOrigin+'/api/events/'+event.id+'/voting',{method:'POST',headers:{cookie:votingOrganizerCookie,origin,'content-type':'application/json'},body:JSON.stringify({...body,requestKey:crypto.randomUUID()})});const j=await r.json();assert.equal(r.status,200,JSON.stringify(j));};
    await votePost({operation:'setEnabled',id:votingPollId,revision:2,enabled:false});await votePost({operation:'publish',id:votingPollId,revision:3});
    await check('voting-published-results',voteUrl);assert(await evaluate("document.body.textContent.includes('Final voting results')"));
    assert.equal(await evaluate("document.querySelectorAll('.voting-results li').length"),3);
   }
   console.log('PASS: '+role+' voting UI, eligibility, privacy and responsive controls.');continue;
  }
  if(process.env.NAV_BROWSER_ONLY){
   const base='/events/'+event.id;
   for(const width of [320,1440]){
    await cmd('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width<768});await visit(base);
    const destinations=role==='agent'?[base+'/agents/me',base+'/contact',base+'/results',base+'/overall',base]:[base+'/results',base+'/overall',base];
    for(const href of destinations){
     if(role==='agent'){
      if(href.endsWith('/agents/me'))await evaluate("document.querySelector('.player-account').open=true");
      if(href.endsWith('/results')||href.endsWith('/overall'))await evaluate("document.querySelector('.player-ranks button').click()");
      await evaluate(`document.querySelector('a[href="${href}"]').click()`);
     }else await evaluate(`document.querySelector('.shell-links a[href="${href}"]').click()`);
     for(let i=0;i<40;i++){if(await evaluate(`location.pathname===${JSON.stringify(href)}`))break;await new Promise(r=>setTimeout(r,50));}
     await new Promise(r=>setTimeout(r,100));
     const active=await evaluate(`[...document.querySelectorAll('.shell-links .nav.active')].map(a=>({href:a.getAttribute('href'),current:a.getAttribute('aria-current'),visible:getComputedStyle(a).display!=='none'}))`);
     if(role==='agent'){
      if(href.endsWith('/results')||href.endsWith('/overall'))assert(await evaluate("document.querySelector('.player-ranks button').classList.contains('active')"));
      else assert(await evaluate(`!!document.querySelector('a[href="${href}"][aria-current=page]')`));
     }else assert.deepEqual(active,[{href,current:'page',visible:true}],role+' '+width+' '+href);
     assert(await evaluate('document.documentElement.scrollWidth<=innerWidth'));
    }
    if(role==='facilitator'){await visit(base+'/field');assert.deepEqual(await evaluate(`[...document.querySelectorAll('.shell-links .nav.active')].map(a=>a.getAttribute('href'))`),[base]);}
    await visit('/workspace');assert.deepEqual(await evaluate(`[...document.querySelectorAll('.shell-links .nav.active')].map(a=>a.getAttribute('href'))`),['/workspace']);
   }
   console.log('PASS: '+role+' navigation selects exactly the current tab during client navigation; active tabs remain visible at 320px and 1440px.');
   continue;
  }
  await check(role,'/events/'+event.id);
  if(role==='organizer'&&process.env.LIVE_OPERATIONS_BROWSER_ONLY){
   assert.equal(await evaluate("document.querySelector('#organizer-tools').open"),false);
   assert.equal(await evaluate("document.querySelector('.event-controls').open"),false);
   assert(await evaluate("!!document.querySelector('.operations-primary')"));
   continue;
  }
  if(role==='agent'){
   assert.equal(await evaluate(`!!document.querySelector('.player-shell')&&!document.querySelector('.content-hud-layer')`),true);
   await check('player-profile','/events/'+event.id+'/agents/me');
   assert.equal(await evaluate(`!!document.querySelector('.agent-dossier-shell')&&!!document.querySelector('.dossier-mission-action')`),true);
   await check('player-contact','/events/'+event.id+'/contact');
   if(process.env.PLAYER_BROWSER_ONLY){
    assert.equal(await evaluate(`[...document.querySelectorAll('button')].filter(b=>b.textContent==='Show my QR/code').length`),1);
    assert(await evaluate(`[...document.querySelectorAll('button')].find(b=>b.textContent==='Show my QR/code').getBoundingClientRect().bottom<=innerHeight`));
    assert(await evaluate(`document.querySelector('.player-shell').getBoundingClientRect().height>=innerHeight`));
    assert.equal(await evaluate(`[...document.querySelectorAll('button')].filter(b=>b.textContent==='Scan agent QR').length`),0);
    await evaluate(`[...document.querySelectorAll('button')].find(b=>b.textContent==='Scan a code').click()`);
    assert.equal(await evaluate(`[...document.querySelectorAll('button')].filter(b=>b.textContent==='Scan agent QR').length`),1);
    assert.equal(await evaluate(`[...document.querySelectorAll('button')].filter(b=>b.textContent==='Show my QR/code').length`),0);
    await evaluate(`[...document.querySelectorAll('button')].find(b=>b.textContent==='My QR code').click()`);
    await evaluate(`document.querySelector('.player-account').open=true`);
    assert(await evaluate(`[...document.querySelectorAll('.player-account-menu a')].some(a=>a.getAttribute('href')==='/account/password')`));
   }
   await check('player-race-results','/events/'+event.id+'/results');
   if(process.env.PLAYER_BROWSER_ONLY){
    await pg.query('UPDATE "StationVisit" SET state=$1,"startedAt"=NULL,"finishedAt"=NULL WHERE id=$2',['CANCELLED','timer-browser-visit']);
    await check('player-next-station','/events/'+event.id);
    assert.equal(await evaluate(`getComputedStyle(document.querySelector('.mission-arrival')).minHeight`),'56px');
    assert.equal(await evaluate(`!!document.querySelector('.mission-arrival')&&!document.querySelector('.mission-tabs')`),true);
    await check('player-checkin','/events/'+event.id+'/check-in');
    assert.equal(await evaluate(`document.querySelector('.manual-station-code').open`),false);
    await evaluate(`document.querySelector('.manual-station-code').open=true`);
    assert.equal(await evaluate(`document.querySelector('input[name=credential]').getBoundingClientRect().width>0`),true);

    await cmd('Emulation.setDeviceMetricsOverride',{width:320,height:900,deviceScaleFactor:1,mobile:true});await visit('/events/'+event.id);
    assert.equal(await evaluate("getComputedStyle(document.querySelector('.player-bottom-nav')).position"),'fixed');
    assert.equal(await evaluate("document.querySelectorAll('.player-bottom-inner>.player-bottom-item').length"),2);
    for(const suffix of ['/agents/me','/contact','/results','/overall','']){
     const href='/events/'+event.id+suffix;
     if(suffix==='/agents/me')await evaluate("document.querySelector('.player-account').open=true");
     if(suffix==='/results'||suffix==='/overall')await evaluate("document.querySelector('.player-ranks button').click()");
     await evaluate(`document.querySelector('a[href="${href}"]').click()`);
     for(let i=0;i<40;i++){if(await evaluate('location.pathname==='+JSON.stringify(href)))break;await new Promise(r=>setTimeout(r,50));}
     await new Promise(r=>setTimeout(r,100));
     if(suffix!=='/results'&&suffix!=='/overall')assert.equal(await evaluate(`!!document.querySelector('a[href="${href}"][aria-current=page]')`),true);
     else assert.equal(await evaluate("document.querySelector('.player-ranks button').classList.contains('active')"),true);
     assert.equal(await evaluate("!!document.querySelector('.player-ranks-options')"),false);
    }
    await evaluate("document.querySelector('.player-ranks button').click()");
    assert.equal(await evaluate("document.querySelector('.player-ranks-options').querySelectorAll('a').length"),2);
    await cmd('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape'});
    assert.equal(await evaluate("document.querySelector('.player-ranks button').getAttribute('aria-expanded')"),'false');
    await visit('/workspace');assert.deepEqual(await evaluate(`[...document.querySelectorAll('.shell-links .nav.active')].map(a=>a.getAttribute('href'))`),['/workspace']);
    console.log('PASS: themed player mission, prominent captain check-in, profile, contact, results, manual code access and client navigation.');
   }
  }

  if(role==='facilitator'){
   const fieldUrl='/events/'+event.id+'/field';
   await check('time-penalty-field',fieldUrl);
   await check('time-penalty-config',fieldUrl,`document.querySelector('.field-tools').open=true;document.querySelector('.time-penalty-editor').open=true`);
   await evaluate(`[...document.querySelectorAll('button')].find(b=>b.textContent==='Add violation button').click()`);
   await evaluate(`const inputs=document.querySelectorAll('.penalty-preset input[type=number]');inputs[2].focus();inputs[2].select()`);await cmd('Input.insertText',{text:'5'});
   await evaluate(`[...document.querySelectorAll('button')].find(b=>b.textContent==='Review violation buttons').click()`);
   await evaluate(`[...document.querySelectorAll('button')].find(b=>b.textContent==='Save violation buttons').click()`);
   for(let i=0;i<40;i++){if((await pg.query('SELECT "timePenaltyRevision" AS revision FROM "Station" WHERE id=$1',['demo-cipher-room'])).rows[0].revision===2)break;await new Promise(r=>setTimeout(r,100));}
   assert.deepEqual((await pg.query('SELECT "timePenaltyButtons" AS buttons FROM "Station" WHERE id=$1',['demo-cipher-room'])).rows[0].buttons.map(b=>b.seconds),[10,30,5],await evaluate('document.body.innerText'));
   await visit(fieldUrl);
   const slots=await evaluate(`[...document.querySelectorAll('[data-race-slot]')].map(e=>e.dataset.raceSlot).filter(s=>s.includes('addTimePenalty'))`);assert.equal(slots.length,new Set(slots).size);
   for(const seconds of [10,30]){await evaluate(`[...document.querySelectorAll('button')].find(b=>b.textContent.startsWith('+${seconds} sec -')).click()`);for(let i=0;i<40;i++){const sum=(await pg.query('SELECT COALESCE(SUM(seconds),0)::int AS n FROM "TimePenaltyEntry" WHERE "visitId"=$1 AND "voidedAt" IS NULL',['timer-browser-visit'])).rows[0].n;if(sum===(seconds===10?10:40))break;await new Promise(r=>setTimeout(r,100));}}
   assert.equal((await pg.query('SELECT SUM(seconds)::int AS n FROM "TimePenaltyEntry" WHERE "visitId"=$1',['timer-browser-visit'])).rows[0].n,40);
   await visit(fieldUrl);await evaluate(`document.querySelector('.time-penalty-history').open=true;document.querySelector('.time-penalty-history article:last-child details').open=true;document.querySelector('.time-penalty-history article:last-child input').focus()`);await cmd('Input.insertText',{text:'Accidental penalty button tap'});
   await evaluate(`document.querySelector('.time-penalty-history article:last-child button').click()`);
   for(let i=0;i<40;i++){if((await pg.query('SELECT COUNT(*)::int AS n FROM "TimePenaltyEntry" WHERE "visitId"=$1 AND "voidedAt" IS NOT NULL',['timer-browser-visit'])).rows[0].n===1)break;await new Promise(r=>setTimeout(r,100));}
   assert.equal((await pg.query('SELECT COUNT(*)::int AS n FROM "TimePenaltyEntry" WHERE "visitId"=$1 AND "voidedAt" IS NOT NULL',['timer-browser-visit'])).rows[0].n,1);
   await visit(fieldUrl);await evaluate(`[...document.querySelectorAll('button')].find(b=>(b.getAttribute('aria-label')||b.textContent)==='Finish challenge').click()`);
   for(let i=0;i<40;i++){if((await pg.query('SELECT state FROM "StationVisit" WHERE id=$1',['timer-browser-visit'])).rows[0].state==='AWAITING_CONFIRMATION')break;await new Promise(r=>setTimeout(r,100));}
   await pg.query('UPDATE "StationVisit" SET "startedAt"=$1,"finishedAt"=$2 WHERE id=$3',['2026-10-20T01:00:00Z','2026-10-20T01:02:00Z','timer-browser-visit']);
   await check('time-result-review',fieldUrl);
   await evaluate(`[...document.querySelectorAll('button')].find(b=>b.textContent==='Review station time').click()`);
   await evaluate(`[...document.querySelectorAll('button')].find(b=>b.textContent==='Confirm station time').click()`);
   for(let i=0;i<40;i++){if((await pg.query('SELECT state FROM "StationVisit" WHERE id=$1',['timer-browser-visit'])).rows[0].state==='COMPLETED')break;await new Promise(r=>setTimeout(r,100));}
   const timedOutcome=(await pg.query('SELECT "durationSeconds","timePenaltySeconds" FROM "StationOutcome" WHERE "visitId"=$1',['timer-browser-visit'])).rows[0];assert.equal(timedOutcome.durationSeconds,120);assert.equal(timedOutcome.timePenaltySeconds,30);
   console.log('PASS: real facilitator browser configures multiple timer buttons, applies +10/+30, voids an accidental tap with history and confirms adjusted station time.');
  }

  if(process.env.LIVE_OPERATIONS_BROWSER_ONLY)continue;
  if(role!=='organizer'){await check(role+'-overall-published','/events/'+publishedId+'/overall');assert((await evaluate(`document.body.textContent`)).includes('Final overall standings'));await check(role+'-overall-sealed','/events/'+event.id+'/overall');assert((await evaluate(`document.body.textContent`)).includes('Overall results are not published yet'));}
  if(role==='organizer'){
   await check('overall','/events/'+roster.id+'/ranking-settings');

   assert((await evaluate(`document.querySelector('.overall-weight-status').textContent`)).includes('Total is 100%'));
   assert.equal(await evaluate(`document.querySelector('#overall-standings h2').textContent`),'Partial totals');
   assert(await evaluate(`[...document.querySelectorAll('.overall-standing h3')].every(e=>Number.isNaN(parseInt(e.textContent,10)))`));
   await evaluate(`document.querySelector('.overall-inputs input[type=number]').focus();document.querySelector('.overall-inputs input[type=number]').select()`);await cmd('Input.insertText',{text:'45'});
   assert((await evaluate(`document.querySelector('.overall-weight-status').textContent`)).includes('Reduce weights by 5%'));
   await evaluate(`document.querySelector('.overall-inputs input[type=number]').select()`);await cmd('Input.insertText',{text:'40'});
   await evaluate(`const rule=document.querySelector('.overall-fields>label select');rule.value='POINTS_TIME';rule.dispatchEvent(new Event('change',{bubbles:true}))`);
   await evaluate(`[...document.querySelectorAll('button')].find(b=>b.textContent==='Save draft').click()`);
   for(let i=0;i<30;i++){if(await evaluate(`document.body.textContent.includes('Draft saved.')`))break;await new Promise(r=>setTimeout(r,100));}
   assert.equal((await pg.query('SELECT config FROM "OverallRanking" WHERE "eventId"=$1',[roster.id])).rows[0].config.raceRule,'POINTS_TIME');
   console.log('PASS: browser weight feedback, unranked partial totals and explicit race rule saving.');
   await check('overall-operations','/events/'+roster.id+'/overall');
   assert.equal(await evaluate("!!document.querySelector('.overall-inputs input[type=number]')"),false);
   assert.equal(await evaluate("[...document.querySelectorAll('button')].some(b=>b.textContent==='Add activity')"),false);
   await check('contact-settings','/events/'+roster.id+'/contact-settings');
   assert.equal(await evaluate("document.querySelector('.organizer-mode-switch .selected').textContent"),'Event setup');
   assert.equal(await evaluate("!!document.querySelector('input[name=opensAt]')"),true);
   await check('contact-operations','/events/'+roster.id+'/contact-policy');
   assert.equal(await evaluate("!!document.querySelector('input[name=opensAt]')"),false);
   assert.equal(await evaluate("document.querySelector('.organizer-mode-switch .selected').textContent"),'Live operations');
   await check('prepare-checks','/events/'+roster.id+'/setup');
   assert.equal(await evaluate("[...document.querySelectorAll('button')].some(b=>b.textContent==='Start operation')"),false);
   await check('prepare-operations','/events/'+roster.id);
   assert.equal(await evaluate("[...document.querySelectorAll('button')].some(b=>b.textContent==='Start operation')"),true);
   console.log('PASS: organizer setup and operations separate rules, placement entry, contact configuration and race start controls.');
   await check('race-results','/events/'+roster.id+'/results');
   await check('people','/events/'+roster.id+'/people');
   await check('setup','/events/'+event.id+'/setup');
   await check('sign','/events/'+event.id+'/stations/demo-cipher-room/sign');
   const credentials=await evaluate(`(()=>{const e=document.createElement('div');e.className='contact-credential';document.querySelector('.content-body').append(e);const s=getComputedStyle(e),v={bg:s.backgroundColor,image:s.backgroundImage,color:s.color};e.remove();return v;})()`);
   assert.equal(credentials.bg,'rgb(255, 255, 255)');assert.equal(credentials.image,'none');assert.equal(credentials.color,'rgb(7, 20, 38)');
   console.log('PASS: contact QR credential surface remains white with dark text.');
   await cmd('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});await visit('/events/'+event.id);
   const motion=await evaluate(`getComputedStyle(document.querySelector('.content-hud-layer')).animationName`);assert.equal(motion,'none');console.log('PASS: reduced-motion HUD animation disabled.');
   await visit('/events/'+event.id+'/stations/demo-cipher-room/sign');await cmd('Emulation.setEmulatedMedia',{media:'print'});
   assert.equal(await evaluate(`getComputedStyle(document.querySelector('.content-hud-layer')).display`),'none');
   assert.equal(await evaluate(`getComputedStyle(document.querySelector('.station-sign')).backgroundColor`),'rgb(255, 255, 255)');
   console.log('PASS: print sign remains white; decorative HUD is hidden.');
   await cmd('Emulation.setEmulatedMedia',{media:'screen',features:[]});
   await cmd('Emulation.setEmulatedMedia',{features:[]});
  }
 }
 fs.writeFileSync(path.join(out,'checks.json'),JSON.stringify({checks,errors},null,2));
 if(process.env.WAKE_BROWSER_ONLY||process.env.JUDGED_OVERALL_BROWSER_ONLY||process.env.SQUAD_HANDLERS_BROWSER_ONLY||process.env.PREVIEW_TOGGLE_BROWSER_ONLY||process.env.STATION_TILES_BROWSER_ONLY||process.env.ARRIVAL_FLOW_BROWSER_ONLY||process.env.VISIBILITY_BROWSER_ONLY||process.env.SPY_THEME_BROWSER_ONLY||process.env.PARTICIPANT_VISIBILITY_BROWSER_ONLY||process.env.PARTICIPATION_BROWSER_ONLY||process.env.STATION_REQUIREMENTS_BROWSER_ONLY||process.env.JUDGING_BROWSER_ONLY||process.env.SCREEN_PREVIEW_BROWSER_ONLY)assert(checks.every(c=>!c.contrast?.length),'Text contrast issues detected; see checks.json');
 assert.deepEqual(errors,[]);assert(checks.every(c=>c.scrollWidth<=c.width),'Horizontal overflow detected');assert(checks.every(c=>!c.brokenImages.length),'Broken image assets');
 assert(checks.every(c=>!c.hud||c.hud==='absolute'),'Decorative HUD must not occupy layout space');
 assert(checks.every(c=>!c.blocked.length),'Decorative layers must not block controls');
 assert(checks.every(c=>!c.nav||c.width>760||c.nav==='row'),'Mobile navigation must stay in scrollable tabs');
 assert(checks.filter(c=>c.label==='sign').every(c=>c.qr==='rgb(255, 255, 255)'),'QR sign must remain white');
 // The finally block terminates the owned headless browser after all assertions.

}finally{browser?.kill();app?.kill();proxy?.closeAllConnections();proxy?.close();await socket.stop();await pg.close();}

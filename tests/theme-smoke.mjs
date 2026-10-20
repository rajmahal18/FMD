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
 const before=await pg.query('SELECT email,"passwordHash" FROM "User" WHERE email LIKE $1 ORDER BY email',['%@agents.invalid']);
 await run(['--import','tsx','prisma/seed-roster.ts']);
 assert(JSON.stringify((await pg.query('SELECT email,"passwordHash" FROM "User" WHERE email LIKE $1 ORDER BY email',['%@agents.invalid'])).rows)===JSON.stringify(before.rows),'Roster rerun must preserve account passwords');
 assert.equal(before.rows.length,93);
 const {rows:[event]}=await pg.query('SELECT id FROM "Event" WHERE slug=$1',['classified-demo']);
 await pg.query('UPDATE "Station" SET "arrivalCode"=$1 WHERE id=$2',['23456789','demo-cipher-room']);
 const {rows:[roster]}=await pg.query('SELECT id FROM "Event" WHERE slug=$1',['operation-classified-fmd']);
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

 const timerTeam=(await pg.query('SELECT id FROM "Team" WHERE "eventId"=$1 LIMIT 1',[event.id])).rows[0].id;
 await pg.query('UPDATE "Event" SET state=$1 WHERE id=$2',['LIVE',event.id]);
 await pg.query('UPDATE "EventMembership" SET "isCaptain"=true WHERE "eventId"=$1 AND role=$2',[event.id,'PARTICIPANT']);
 await pg.query('UPDATE "Station" SET configured=true,"timePenaltyButtons"=$1,"timePenaltyRevision"=1 WHERE id=$2',[JSON.stringify([{id:'wrong-step',label:'Wrong step',seconds:10},{id:'boundary',label:'Boundary violation',seconds:30}]),'demo-cipher-room']);
 await pg.query('INSERT INTO "OverallRanking" ("eventId",config) VALUES ($1,$2)',[event.id,JSON.stringify({raceRule:'TIME',events:[{id:'race',name:'Amazing Race',source:'SPY',weight:100,credits:[100],ranks:{}}]})]);
 await pg.query('INSERT INTO "RoutePlan" (id,"eventId",name,mode,"stationIds") VALUES ($1,$2,$3,$4,$5)',['timer-browser-route',event.id,'Timed route','FIXED',JSON.stringify(['demo-cipher-room'])]);
 await pg.query('INSERT INTO "TeamRouteAssignment" (id,"teamId","routeId","routeRevision",mode,"stationIds") VALUES ($1,$2,$3,1,$4,$5)',['timer-browser-assignment',timerTeam,'timer-browser-route','FIXED',JSON.stringify(['demo-cipher-room'])]);
 await pg.query('INSERT INTO "StationVisit" (id,"eventId","teamId","stationId",state,"startedAt","updatedAt") VALUES ($1,$2,$3,$4,$5,NOW(),NOW())',['timer-browser-visit',event.id,timerTeam,'demo-cipher-room','ACTIVE']);

 if(process.env.PLAYER_BROWSER_ONLY)await pg.query('INSERT INTO "ContactPolicy" (id,"eventId",mode,"sameTeamAllowed","mutualConfirmation","reciprocityAllowed",visibility,"tieRule",enabled,"opensAt","closesAt") VALUES ($1,$2,$3,true,true,true,$4,$5,true,$6,$7)',['player-ui-contact-policy',event.id,'INTERACTION','SELF','SHARED',new Date(Date.now()-60000).toISOString(),new Date(Date.now()+7200000).toISOString()]);
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
 browser.stdio[4].on('data',chunk=>{buffer+=chunk;let end;while((end=buffer.indexOf('\0'))>=0){const m=JSON.parse(buffer.slice(0,end));buffer=buffer.slice(end+1);if(m.id){const p=pending.get(m.id);if(p){pending.delete(m.id);clearTimeout(p.timer);m.error?p.reject(Error(JSON.stringify(m.error))):p.resolve(m.result);}}else if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.text);}});
 const send=(method,params={},sessionId)=>new Promise((resolve,reject)=>{const id=++nextId;const timer=setTimeout(()=>{pending.delete(id);reject(Error('CDP timeout: '+method));},15000);pending.set(id,{resolve,reject,timer});browser.stdio[3].write(JSON.stringify({id,method,params,...(sessionId?{sessionId}:{})})+'\0');});
 const {targetId}=await send('Target.createTarget',{url:'about:blank'});
 const {sessionId}=await send('Target.attachToTarget',{targetId,flatten:true});
 const cmd=(method,params)=>send(method,params,sessionId);
 await cmd('Page.enable');await cmd('Runtime.enable');await cmd('Network.enable');
 await cmd('Security.setIgnoreCertificateErrors',{ignore:true});
 const evaluate=async expression=>{const r=await cmd('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.text);return r.result.value;};
 const visit=async url=>{await cmd('Page.navigate',{url:origin+url});await new Promise(r=>setTimeout(r,450));await evaluate('document.fonts.ready.then(()=>true)');};
 const checks=[];
 async function check(label,url,setup){
  for(const width of (process.env.TIME_PENALTY_BROWSER_ONLY?[320]:[320,390,768,1440])){
   await cmd('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width<768});await visit(url);if(setup)await evaluate(setup);
   const result=await evaluate(`(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,brokenImages:[...document.images].filter(i=>i.complete&&i.naturalWidth===0).map(i=>i.getAttribute('src')),hud:document.querySelector('.content-hud-layer')?getComputedStyle(document.querySelector('.content-hud-layer')).position:null,nav:document.querySelector('.shell-links')?getComputedStyle(document.querySelector('.shell-links')).flexDirection:null,qr:document.querySelector('.station-sign')?getComputedStyle(document.querySelector('.station-sign')).backgroundColor:null,blocked:[...document.querySelectorAll('a[href],button:not(:disabled),input:not([type=hidden]),select')].filter(e=>{const r=e.getBoundingClientRect(),x=r.x+r.width/2,y=r.y+r.height/2;if(r.width===0||r.height===0||x<0||x>=innerWidth||y<0||y>=innerHeight)return false;if(e.closest("details:not([open])")&&!e.closest("summary"))return false;const nav=e.closest(".shell-links");if(nav){const n=nav.getBoundingClientRect();if(x<n.left||x>=n.right||y<n.top||y>=n.bottom)return false;}const hit=document.elementFromPoint(x,y);if(hit?.closest(".player-bottom-nav")&&!e.closest(".player-bottom-nav"))return false;return !hit||!e.contains(hit);}).map(e=>e.textContent.trim().slice(0,40)||e.getAttribute('name'))}))()`);
   if(await evaluate("!!document.querySelector('.player-bottom-nav')")){
    await evaluate("window.scrollTo(0,document.documentElement.scrollHeight)");
    assert(await evaluate("document.querySelector('.player-content').getBoundingClientRect().bottom-110 <= document.querySelector('.player-bottom-nav').getBoundingClientRect().top"),'Bottom padding must keep the end of page content above navigation');
    await evaluate("window.scrollTo(0,0)");
   }
   checks.push({label,...result});console.log(JSON.stringify({label,...result}));
   if(width===320||width===1440){const image=await cmd('Page.captureScreenshot',{format:'png',captureBeyondViewport:true});fs.writeFileSync(path.join(out,label+'-'+width+'.png'),Buffer.from(image.data,'base64'));}
  }
 }
 await check('landing','/');await check('login','/login');
 await evaluate(`document.querySelector('input[name=email]').focus()`);
 assert.notEqual(await evaluate(`getComputedStyle(document.querySelector('input[name=email]')).outlineStyle`),'none','Keyboard focus must remain visible');
 await evaluate(`document.querySelector('input[name=email]').value='organizer@example.test';document.querySelector('input[name=password]').value='${env.SEED_PASSWORD}';document.querySelector('form').requestSubmit()`);
 for(let i=0;i<30;i++){if(await evaluate(`location.pathname==='/workspace'`))break;await new Promise(r=>setTimeout(r,200));}
 const loginState=await evaluate(`({path:location.pathname,query:location.search,message:document.querySelector('[role=alert]')?.textContent,valid:document.querySelector('form')?.checkValidity()})`);
 console.log('Browser sign-in result: '+JSON.stringify(loginState));
 assert.equal(loginState.path,'/workspace');console.log('PASS: browser sign-in form and visible keyboard focus.');
 for(const role of (process.env.PLAYER_BROWSER_ONLY?['agent']:process.env.NAV_BROWSER_ONLY?['agent','facilitator']:process.env.TIME_PENALTY_BROWSER_ONLY?['facilitator']:['organizer','facilitator','agent'])){
  await cmd('Network.clearBrowserCookies');
  const response=await fetch(appOrigin+'/api/auth/login',{method:'POST',headers:{origin,'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({email:role+'@example.test',password:env.SEED_PASSWORD}),redirect:'manual'});assert.equal(response.status,303);
  const cookie=response.headers.get('set-cookie').split(';')[0];const split=cookie.indexOf('=');await cmd('Network.setCookie',{name:cookie.slice(0,split),value:cookie.slice(split+1),url:origin,httpOnly:true,secure:true,path:'/'});

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
   await check('time-penalty-config',fieldUrl,`document.querySelector('.time-penalty-editor').open=true`);
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
   await visit(fieldUrl);await evaluate(`[...document.querySelectorAll('button')].find(b=>b.textContent==='Finish challenge').click()`);
   for(let i=0;i<40;i++){if((await pg.query('SELECT state FROM "StationVisit" WHERE id=$1',['timer-browser-visit'])).rows[0].state==='AWAITING_CONFIRMATION')break;await new Promise(r=>setTimeout(r,100));}
   await pg.query('UPDATE "StationVisit" SET "startedAt"=$1,"finishedAt"=$2 WHERE id=$3',['2026-10-20T01:00:00Z','2026-10-20T01:02:00Z','timer-browser-visit']);
   await check('time-result-review',fieldUrl);
   await evaluate(`[...document.querySelectorAll('button')].find(b=>b.textContent==='Review station time').click()`);
   await evaluate(`[...document.querySelectorAll('button')].find(b=>b.textContent==='Confirm station time').click()`);
   for(let i=0;i<40;i++){if((await pg.query('SELECT state FROM "StationVisit" WHERE id=$1',['timer-browser-visit'])).rows[0].state==='COMPLETED')break;await new Promise(r=>setTimeout(r,100));}
   const timedOutcome=(await pg.query('SELECT "durationSeconds","timePenaltySeconds" FROM "StationOutcome" WHERE "visitId"=$1',['timer-browser-visit'])).rows[0];assert.equal(timedOutcome.durationSeconds,120);assert.equal(timedOutcome.timePenaltySeconds,30);
   console.log('PASS: real facilitator browser configures multiple timer buttons, applies +10/+30, voids an accidental tap with history and confirms adjusted station time.');
  }

  if(role!=='organizer'){await check(role+'-overall-published','/events/'+publishedId+'/overall');assert((await evaluate(`document.body.textContent`)).includes('Final overall standings'));await check(role+'-overall-sealed','/events/'+event.id+'/overall');assert((await evaluate(`document.body.textContent`)).includes('Overall results are not published yet'));}
  if(role==='organizer'){
   await check('overall','/events/'+roster.id+'/overall');

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
 assert.deepEqual(errors,[]);assert(checks.every(c=>c.scrollWidth<=c.width),'Horizontal overflow detected');assert(checks.every(c=>!c.brokenImages.length),'Broken image assets');
 assert(checks.every(c=>!c.hud||c.hud==='absolute'),'Decorative HUD must not occupy layout space');
 assert(checks.every(c=>!c.blocked.length),'Decorative layers must not block controls');
 assert(checks.every(c=>!c.nav||c.width>760||c.nav==='row'),'Mobile navigation must stay in scrollable tabs');
 assert(checks.filter(c=>c.label==='sign').every(c=>c.qr==='rgb(255, 255, 255)'),'QR sign must remain white');
 await send('Browser.close');
}finally{browser?.kill();app?.kill();proxy?.closeAllConnections();proxy?.close();await socket.stop();await pg.close();}

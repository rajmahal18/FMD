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
 async function check(label,url){
  for(const width of [320,390,768,1440]){
   await cmd('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width<768});await visit(url);
   const result=await evaluate(`(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,brokenImages:[...document.images].filter(i=>i.complete&&i.naturalWidth===0).map(i=>i.getAttribute('src')),hud:document.querySelector('.content-hud-layer')?getComputedStyle(document.querySelector('.content-hud-layer')).position:null,nav:document.querySelector('.shell-links')?getComputedStyle(document.querySelector('.shell-links')).flexDirection:null,qr:document.querySelector('.station-sign')?getComputedStyle(document.querySelector('.station-sign')).backgroundColor:null,blocked:[...document.querySelectorAll('a[href],button:not(:disabled),input:not([type=hidden]),select')].filter(e=>{const r=e.getBoundingClientRect(),x=r.x+r.width/2,y=r.y+r.height/2;if(r.width===0||r.height===0||x<0||x>=innerWidth||y<0||y>=innerHeight)return false;if(e.closest("details:not([open])")&&!e.closest("summary"))return false;const nav=e.closest(".shell-links");if(nav){const n=nav.getBoundingClientRect();if(x<n.left||x>=n.right||y<n.top||y>=n.bottom)return false;}const hit=document.elementFromPoint(x,y);return !hit||!e.contains(hit);}).map(e=>e.textContent.trim().slice(0,40)||e.getAttribute('name'))}))()`);
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
 for(const role of ['organizer','facilitator','agent']){
  await cmd('Network.clearBrowserCookies');
  const response=await fetch(appOrigin+'/api/auth/login',{method:'POST',headers:{origin,'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({email:role+'@example.test',password:env.SEED_PASSWORD}),redirect:'manual'});assert.equal(response.status,303);
  const cookie=response.headers.get('set-cookie').split(';')[0];const split=cookie.indexOf('=');await cmd('Network.setCookie',{name:cookie.slice(0,split),value:cookie.slice(split+1),url:origin,httpOnly:true,secure:true,path:'/'});
  await check(role,'/events/'+event.id);
  if(role==='organizer'){
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

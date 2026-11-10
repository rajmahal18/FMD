import {spawn} from 'node:child_process';
import {randomBytes,createHash} from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

export async function eventRecapBrowser(db,eventId){
 const out=path.resolve('.tmp/event-recap');fs.mkdirSync(out,{recursive:true});
 const tokens={};for(const role of ['leader','handler','organizer']){const token=randomBytes(32).toString('base64url');tokens[role]=token;await db.session.create({data:{userId:role,tokenHash:createHash('sha256').update(token).digest('hex'),expiresAt:new Date(Date.now()+3600000)}});}await db.$disconnect();
 const origin='http://127.0.0.1:3197';
 const app=spawn(process.execPath,['node_modules/next/dist/bin/next','start','-H','127.0.0.1','-p','3197'],{env:{...process.env,APP_ORIGIN:origin},stdio:['ignore',fs.openSync(path.join(out,'server.log'),'w'),fs.openSync(path.join(out,'server-error.log'),'w')]});
 let browser;
 try{
  let ready=false;for(let i=0;i<80;i++){try{if((await fetch(origin)).ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,250));}assert(ready,'Test server started');
  browser=spawn(process.env.CHROMIUM_PATH??'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',['--headless=new','--no-sandbox','--disable-gpu','--no-first-run','--remote-debugging-pipe','--user-data-dir='+path.join(out,'profile'),'about:blank'],{stdio:['ignore','ignore','ignore','pipe','pipe']});
  let nextId=0,buffer='';const pending=new Map(),errors=[];
  browser.stdio[4].on('data',chunk=>{buffer+=chunk;let end;while((end=buffer.indexOf('\0'))>=0){const m=JSON.parse(buffer.slice(0,end));buffer=buffer.slice(end+1);if(m.id){const p=pending.get(m.id);if(p){pending.delete(m.id);clearTimeout(p.timer);m.error?p.reject(Error(JSON.stringify(m.error))):p.resolve(m.result);}}else if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.text);}});
  const send=(method,params={},sessionId)=>new Promise((resolve,reject)=>{const id=++nextId,timer=setTimeout(()=>reject(Error('CDP timeout: '+method)),15000);pending.set(id,{resolve,reject,timer});browser.stdio[3].write(JSON.stringify({id,method,params,...(sessionId?{sessionId}:{})})+'\0');});
  const {targetId}=await send('Target.createTarget',{url:'about:blank'}),{sessionId}=await send('Target.attachToTarget',{targetId,flatten:true});
  const cmd=(method,params)=>send(method,params,sessionId);
  await cmd('Page.enable');await cmd('Runtime.enable');await cmd('Network.enable');
  const evaluate=async expression=>{const r=await cmd('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description??r.exceptionDetails.text);return r.result.value;};
  for(const role of ['anonymous','leader','handler','organizer']){
   const token=tokens[role];
   await cmd('Network.clearBrowserCookies');
   if(token)await cmd('Network.setCookie',{url:origin,name:'__Host-spy-session',value:token,path:'/',secure:true,httpOnly:true,sameSite:'Lax'});
   for(const width of [320,390,768,1440]){
    await cmd('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width<768});
    if(role==='anonymous'){await cmd('Page.navigate',{url:origin+'/'});for(let i=0;i<60;i++){if(await evaluate("!!document.querySelector('.hero-actions a[href^=\"/results/\"]')"))break;await new Promise(r=>setTimeout(r,150));}assert(await evaluate("!!document.querySelector('.hero-actions a[href^=\"/results/\"]')"),'Public View results CTA');assert(await evaluate('document.documentElement.scrollWidth<=innerWidth'),'Homepage has no page overflow');await evaluate("document.querySelector('.hero-actions a[href^=\"/results/\"]').click()");}else await cmd('Page.navigate',{url:origin+`/events/${eventId}/results`+(role==='organizer'?'?share=recap':'')});
    for(let i=0;i<60;i++){if(await evaluate("!!document.querySelector('.recap-tabs')"))break;await new Promise(r=>setTimeout(r,150));}
    assert(await evaluate("!!document.querySelector('.recap-tabs')"),'Event recap rendered for '+role+' '+await evaluate('location.pathname+" / "+document.body.innerText.slice(0,1800)'));
    assert(await evaluate("document.body.textContent.includes('Naim A. Abdulkadir')&&document.body.textContent.includes('Erica Jean S. Falcatan')"),'Both Successful Double Agents appear');
    await evaluate('document.fonts.ready.then(()=>true)');
    for(let index=0;index<4;index++){
     await evaluate(`document.querySelectorAll('.recap-tabs button')[${index}].click()`);await new Promise(r=>setTimeout(r,100));
     await evaluate("document.querySelectorAll('.event-recap section:not([hidden]) details').forEach(d=>d.open=true)");
     assert(await evaluate('document.documentElement.scrollWidth<=innerWidth'),`No page overflow: ${role}, ${width}, tab ${index}`);
     assert(await evaluate("[...document.querySelectorAll('.recap-tabs button')].every(b=>b.getBoundingClientRect().height>=44)"),'44px section controls');
     if(width===320||width===1440&&index===0){const shot=await cmd('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});fs.writeFileSync(path.join(out,`${role}-${width}-${index}.png`),Buffer.from(shot.data,'base64'));}
    }
    if(role!=='organizer'&&role!=='anonymous')assert.equal(await evaluate("[...document.querySelectorAll('.player-bottom-nav a')].map(a=>a.textContent.trim()).join(',')"),'Event Results');
   }
   if(role!=='organizer'&&role!=='anonymous'){
    const r=await fetch(origin+`/events/${eventId}`,{headers:{cookie:'__Host-spy-session='+token},redirect:'manual'});assert.equal(r.headers.get('location'),`/events/${eventId}/results`);
   }
   if(role==='anonymous'){
    assert.equal((await fetch(origin+`/api/events/${eventId}/voting`)).status,401,'Public results do not open protected voting APIs');
    assert.equal((await fetch(origin+'/results/unknown-event')).status,404,'Unpublished event is unavailable');
   }
  }
  assert.deepEqual(errors,[],'No browser runtime errors');
  console.log('PASS: Event recap browser — anonymous homepage CTA, participant, facilitator and organizer; four sections at 320/390/768/1440px, expanded details, no page overflow, touch targets and result-only navigation.');
 }finally{browser?.kill();app.kill();await new Promise(r=>app.once('exit',r));}
}

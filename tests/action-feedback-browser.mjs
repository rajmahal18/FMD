import {build} from 'esbuild';
import {spawn} from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import assert from 'node:assert/strict';
fs.mkdirSync('.tmp',{recursive:true});
await build({entryPoints:['tests/fixtures/action-feedback.tsx'],outfile:'.tmp/feedback-harness.js',bundle:true,platform:'browser',jsx:'automatic',define:{'process.env':'{}','process.env.NODE_ENV':'"development"'}});
const server=http.createServer((req,res)=>{if(req.url==='/bundle.js'){res.setHeader('Content-Type','text/javascript');res.end(fs.readFileSync('.tmp/feedback-harness.js'));}else res.end('<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><style>'+fs.readFileSync('src/app/globals.css','utf8')+fs.readFileSync('src/app/action-feedback.css','utf8')+'</style><div id="root"></div><script src="/bundle.js"></script>');});
await new Promise(r=>server.listen(3193,'127.0.0.1',r));
const browser=spawn(process.env.CHROMIUM_PATH||(process.platform==='win32'?'C:/Program Files/Google/Chrome/Application/chrome.exe':'chromium'),['--headless=new','--no-sandbox','--disable-gpu','--no-first-run','--remote-debugging-pipe','--user-data-dir='+path.resolve('.tmp/feedback-profile'),'about:blank'],{stdio:['ignore','ignore','pipe','pipe','pipe']});
let id=0,buffer='';const pending=new Map();
browser.stderr.on('data',d=>fs.appendFileSync('.tmp/feedback-browser.log',d));
browser.stdio[4].on('data',chunk=>{buffer+=chunk;let end;while((end=buffer.indexOf('\0'))>=0){const m=JSON.parse(buffer.slice(0,end));buffer=buffer.slice(end+1);if(m.method==="Runtime.exceptionThrown")console.log(JSON.stringify(m.params));if(m.id){const p=pending.get(m.id);if(p){clearTimeout(p.timer);pending.delete(m.id);m.error?p.reject(Error(JSON.stringify(m.error))):p.resolve(m.result);}}}});
const send=(method,params={},sessionId)=>new Promise((resolve,reject)=>{const key=++id,timer=setTimeout(()=>reject(Error('Timeout '+method)),12000);pending.set(key,{resolve,reject,timer});browser.stdio[3].write(JSON.stringify({id:key,method,params,...(sessionId?{sessionId}:{})})+'\0');});
try{
 const {targetId}=await send('Target.createTarget',{url:'about:blank'}),{sessionId}=await send('Target.attachToTarget',{targetId,flatten:true});
 const cmd=(method,params)=>send(method,params,sessionId);
 const evaluate=async expression=>{const r=await cmd('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result.value;};
 const pause=()=>new Promise(r=>setTimeout(r,100));
 await cmd('Page.enable');await cmd('Runtime.enable');await cmd('Page.navigate',{url:'http://127.0.0.1:3193'});await new Promise(r=>setTimeout(r,800));

 await evaluate(`window.calls=[];window.fetch=async(url,options)=>{calls.push({url,key:options.body instanceof FormData?options.body.get('requestKey'):JSON.parse(options.body).requestKey});return new Promise(resolve=>window.respond=(status,body)=>resolve(new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json'}})));};document.querySelector('form button').focus();document.querySelector('form').requestSubmit();`);await pause();
 assert.equal(await evaluate('document.querySelector("dialog[open] h2").textContent'),'Confirm action');
 await evaluate(`document.querySelector('dialog[open] .secondary').click()`);await pause();assert.equal(await evaluate('calls.length'),0);
 await evaluate(`document.querySelector('form').requestSubmit()`);await pause();await evaluate(`document.querySelector('dialog[open] .action-feedback-actions button:last-child').click()`);await pause();
 assert.equal(await evaluate('calls.length'),1);assert.equal(await evaluate('document.querySelector("dialog[open] [aria-busy=true]")!==null'),true);
 await cmd('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape'});assert.equal(await evaluate('!!document.querySelector("dialog[open]")'),true);
 await evaluate(`respond(200,{message:'Station saved.'})`);await pause();assert.equal(await evaluate('document.querySelector("dialog[open] h2").textContent'),'Saved');
 for(const width of [320,390,768,1440]){await cmd('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:false});assert.equal(await evaluate('document.documentElement.scrollWidth<=innerWidth'),true);const shot=await cmd('Page.captureScreenshot',{format:'png'});fs.writeFileSync('.tmp/feedback-'+width+'.png',Buffer.from(shot.data,'base64'));}
 await evaluate(`document.querySelector('dialog[open] button').click();document.querySelector('form').requestSubmit()`);await pause();await evaluate(`document.querySelector('dialog[open] .action-feedback-actions button:last-child').click()`);await pause();await evaluate(`respond(400,{error:'Station name is required.'})`);await pause();assert.equal(await evaluate('document.querySelector("dialog[open]").textContent.includes("Station name is required.")'),true);
 await evaluate(`document.querySelector('dialog[open] button').click();document.querySelector('.race-action button').click();document.querySelector('.race-action button').click()`);await pause();assert.equal(await evaluate('calls.length'),3);
 await evaluate(`respond(500,{error:'Response lost'})`);await pause();assert.equal(await evaluate('document.querySelector("dialog[open]").textContent.includes("Retry the saved request")'),true);
 await evaluate(`document.querySelector('dialog[open] button').click();document.querySelector('.race-action button').click()`);await pause();assert.equal(await evaluate('calls[2].key===calls[3].key'),true);
 await evaluate(`respond(200,{message:'Challenge started.',replayed:true})`);await pause();assert.equal(await evaluate('!!document.querySelector(".race-action")'),false);assert.equal(await evaluate('document.querySelector("dialog[open]").textContent.includes("Already recorded")'),true);
 await evaluate(`document.querySelector('dialog[open] button').click();document.querySelector('#test-blocked-start').click()`);await pause();
 await evaluate(`document.querySelector('.race-action button').click()`);await pause();
 assert.equal(await evaluate('document.querySelector("dialog[open] h2").textContent'),'Operation not started');
 assert.equal(await evaluate('document.querySelectorAll("dialog[open] .start-operation-issues a").length'),2);
 assert.equal(await evaluate('calls.length'),4,'Blocked start must explain requirements without submitting');
 await evaluate(`document.querySelector('dialog[open] button').click();document.querySelector('#test-ready-start').click();window.refreshes=0;window.addEventListener('test-refresh',()=>refreshes++);`);await pause();
 await evaluate(`document.querySelector('.race-action button').click()`);await pause();
 assert.equal(await evaluate('document.querySelector("dialog[open] h2").textContent'),'Confirm action');
 await evaluate(`document.querySelector('dialog[open] .action-feedback-actions button:last-child').click()`);await pause();
 await evaluate(`respond(409,{error:'Preparation is incomplete: a station changed.'})`);await pause();
 assert.equal(await evaluate('document.querySelector("dialog[open]").textContent.includes("Preparation is incomplete")'),true);
 await evaluate(`document.querySelector('dialog[open] button').click();document.querySelector('.race-action button').click()`);await pause();
 await evaluate(`document.querySelector('dialog[open] .action-feedback-actions button:last-child').click()`);await pause();
 await evaluate(`respond(200,{message:'Operation started. Captain check-in and station handling are live.',state:'LIVE',redirect:'/'})`);await pause();
 assert.equal(await evaluate('document.querySelector("dialog[open]").textContent.includes("Operation started")'),true,'Start success must survive same-page refresh');
 assert.equal(await evaluate('refreshes>0'),true);
 console.log('PASS: action feedback and start-operation blockers, server revalidation, success persistence, and refresh; mobile overflow at 320/390/768/1440px.');
}finally{browser.kill();server.closeAllConnections();server.close();for(const p of pending.values())clearTimeout(p.timer);}





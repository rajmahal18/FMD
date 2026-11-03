import assert from 'node:assert/strict';
export const wakeLockMock=`(()=>{
 const state=window.qaWake={requests:0,releases:0,locks:[],deny:false,late:localStorage.getItem('qa-wake-late')==='on'};
 if(localStorage.getItem('qa-wake-unsupported')==='on'){Object.defineProperty(navigator,'wakeLock',{configurable:true,value:undefined});return;}
 Object.defineProperty(navigator,'wakeLock',{configurable:true,value:{request:async()=>{state.requests++;if(state.deny)throw new DOMException('Denied','NotAllowedError');const lock=new EventTarget();lock.released=false;lock.release=async()=>{if(lock.released)return;lock.released=true;state.releases++;sessionStorage.setItem('qa-wake-releases',String(Number(sessionStorage.getItem('qa-wake-releases')||0)+1));lock.dispatchEvent(new Event('release'));};state.locks.push(lock);if(state.late)return new Promise(resolve=>state.resolve=()=>resolve(lock));return lock;}}});
})()`;

export async function verifyWakeLock({evaluate,visit,check,cmd,event,auditContrast}){
 const base='/events/'+event.id;
 const wait=async fn=>{for(let i=0;i<60;i++){if(await fn())return;await new Promise(r=>setTimeout(r,50));}throw Error('Wake-lock state timed out');};
 const toggle=async()=>{await evaluate("document.querySelector('.player-account').open=true;document.querySelector('.screen-awake-switch').click()");await new Promise(r=>setTimeout(r,100));};
 await evaluate("localStorage.setItem('spy-screen-awake','on')");await visit(base+'/field');await wait(()=>evaluate("qaWake.locks.some(l=>!l.released)"));
 assert.equal(await evaluate('qaWake.requests'),1,'Visible event page automatically requests a wake lock');
 await check('screen-awake-field',base+'/field');
 await evaluate("document.querySelector('.player-account').open=true");assert.deepEqual(await evaluate('('+auditContrast.toString()+')()'),[],'Account wake status must remain readable');
 await toggle();assert(await evaluate("qaWake.locks.every(l=>l.released)&&localStorage.getItem('spy-screen-awake')==='off'"));
 await visit(base+'/field');assert.equal(await evaluate('qaWake.requests'),0,'Off preference survives reload');
 await toggle();await wait(()=>evaluate('qaWake.requests===1'));
 await evaluate("Object.defineProperty(document,'visibilityState',{configurable:true,get:()=>window.qaVisibility||'visible'});window.qaVisibility='hidden';document.dispatchEvent(new Event('visibilitychange'))");await wait(()=>evaluate('qaWake.locks.every(l=>l.released)'));
 await evaluate("window.qaVisibility='visible';document.dispatchEvent(new Event('visibilitychange'))");await wait(()=>evaluate('qaWake.requests===2&&qaWake.locks.some(l=>!l.released)'));
 await evaluate("qaWake.locks.find(l=>!l.released).release()");await wait(()=>evaluate("document.querySelector('.screen-awake-switch strong').textContent==='Paused'"));
 await evaluate("document.querySelector('.screen-awake-retry').click()");await wait(()=>evaluate('qaWake.requests===3'));
 await toggle();await evaluate('qaWake.deny=true');await toggle();await wait(()=>evaluate("document.querySelector('.screen-awake-switch strong').textContent==='Blocked'"));assert(await evaluate('qaWake.locks.every(l=>l.released)'));
 await evaluate("qaWake.deny=false;document.querySelector('.screen-awake-retry').click()");await wait(()=>evaluate('qaWake.locks.some(l=>!l.released)'));
 const before=await evaluate("Number(sessionStorage.getItem('qa-wake-releases'))");await visit('/login');assert(await evaluate(`Number(sessionStorage.getItem('qa-wake-releases'))>${before}&&qaWake.requests===0`),'Leaving protected screens releases the lock');
 await evaluate("localStorage.setItem('qa-wake-late','on');localStorage.setItem('spy-screen-awake','on')");await visit(base+'/field');await wait(()=>evaluate('typeof qaWake.resolve===\'function\''));await toggle();await evaluate('qaWake.resolve()');await wait(()=>evaluate('qaWake.locks.every(l=>l.released)'));
 await evaluate("localStorage.removeItem('qa-wake-late');localStorage.setItem('qa-wake-unsupported','on');localStorage.setItem('spy-screen-awake','on')");await visit(base+'/field');await wait(()=>evaluate("document.querySelector('.screen-awake-switch').disabled"));assert(await evaluate("document.querySelector('.screen-awake-switch strong').textContent==='Unavailable'"));
 console.log('PASS: wake lock auto-request, persistent opt-out, visibility reacquisition, OS release/retry, denial, late-response cleanup, unsupported fallback and page exit.');
}

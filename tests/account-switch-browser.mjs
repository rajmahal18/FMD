import assert from 'node:assert/strict';
export async function accountSwitchBrowser({pg,event,evaluate,visit,check}){
 const base='/events/'+event.id,path=base+'/switch-account';
 const wait=async fn=>{for(let i=0;i<140;i++){if(await fn())return;await new Promise(r=>setTimeout(r,100));}throw Error('Account-switch browser flow timed out');};
 const pick=email=>evaluate(`(()=>{const row=[...document.querySelectorAll('.account-switch-row')].find(r=>r.textContent.includes(${JSON.stringify(email)}));if(!row)throw Error('Account row missing');row.click();})()`);
 await check('account-switch-list',path);
 await check('account-switch-review',path,"[...document.querySelectorAll('.account-switch-row')].find(r=>r.textContent.includes('facilitator@example.test')).click()");
 await evaluate("[...document.querySelectorAll('.judging-dialog button')].find(b=>b.textContent==='Switch to account').click()");
 await wait(()=>evaluate("location.pathname.endsWith('/judging')&&!!document.querySelector('.account-switch-banner')"));
 assert(await evaluate("document.querySelector('.account-switch-banner').textContent.includes('Real actions count')"));assert(!(await evaluate("!!document.querySelector('.organizer-navigation')")));
 await check('account-switched-judge',base+'/judging');
 await evaluate("(()=>{for(const input of document.querySelectorAll('.judging-score-sheet input[type=number]')){Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,'10');input.dispatchEvent(new Event('input',{bubbles:true}));}})()");
 await evaluate("[...document.querySelectorAll('.judging-score-sheet button')].find(b=>b.textContent==='Review score').click()");
 await evaluate("[...document.querySelectorAll('.judging-dialog button')].find(b=>b.textContent==='Confirm & submit score').click()");
 await wait(async()=>(await pg.query('SELECT count(*)::int AS n FROM "JudgingScore" WHERE "contestId"=$1',['judging-browser-gala'])).rows[0].n===1);
 assert.equal((await pg.query('SELECT "totalHundredths" FROM "JudgingScore" WHERE "contestId"=$1',['judging-browser-gala'])).rows[0].totalHundredths,4000);
 await evaluate("document.querySelector('.account-switch-banner form').requestSubmit()");await wait(()=>evaluate("location.pathname.endsWith('/switch-account')&&!document.querySelector('.account-switch-banner')"));
 await pick('agent@example.test');await evaluate("[...document.querySelectorAll('.judging-dialog button')].find(b=>b.textContent==='Switch to account').click()");
 await wait(()=>evaluate("!!document.querySelector('.account-switch-banner')&&!!document.querySelector('.participant-shell')"));
 await check('account-switched-participant',base);
 assert(!(await evaluate("!!document.querySelector('.player-account-menu a[href=\"/account/password\"]')")));
 await evaluate("document.querySelector('.account-switch-banner form').requestSubmit()");await wait(()=>evaluate("location.pathname.endsWith('/switch-account')&&!document.querySelector('.account-switch-banner')"));
 assert.equal((await pg.query('SELECT count(*)::int AS n FROM "Session" WHERE "parentSessionId" IS NOT NULL')).rows[0].n,0);
 console.log('PASS: account list/review, real switched judge submission, participant identity, prominent return control, original session restoration and mobile-safe layouts.');
}

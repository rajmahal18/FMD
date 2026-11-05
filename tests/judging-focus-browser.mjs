import assert from 'node:assert/strict';
export async function verifyJudgingFocus({evaluate,visit,pg,event,check}){
 const base='/events/'+event.id;
 const wait=async fn=>{for(let i=0;i<160;i++){if(await fn())return;await new Promise(r=>setTimeout(r,100));}throw Error('Judging navigation transition timed out');};
 const refresh=()=>evaluate("window.dispatchEvent(new Event('focus'))");
 const focused=()=>evaluate("!document.querySelector('.field-bottom-nav')&&document.querySelector('.player-brand').textContent==='Scoring'");
 assert(await focused(),'Open assigned scoring hides every field tab');
 await evaluate("document.querySelector('.player-topbar summary').click()");
 assert(await evaluate("(()=>{const menu=document.querySelector('.player-account-menu');return menu.textContent.includes('Judge')&&menu.textContent.includes('Password & access')&&!!menu.querySelector('form[action=\"/api/auth/logout\"]')&&![...menu.querySelectorAll('a')].some(a=>/\\/events\\/|\\/workspace/.test(a.getAttribute('href'))&& !a.getAttribute('href').endsWith('/inbox'));})()"),'Focused account menu keeps identity, password, awake and logout with only Inbox as a secondary destination');
 await evaluate("document.querySelector('.player-topbar summary').click()");
 await pg.query('UPDATE "JudgingContest" SET state=$1 WHERE id=$2',['CLOSED','judging-browser-gala']);await refresh();
 await wait(()=>evaluate("!!document.querySelector('.field-bottom-nav')"));
 await check('judging-focus-closed',base+'/field');
 assert(await evaluate("!!document.querySelector('.field-board-controller')"),'Normal station work returns after scoring closes');
 await pg.query('UPDATE "JudgingContest" SET state=$1 WHERE id=$2',['OPEN','judging-browser-gala']);await refresh();
 await wait(()=>evaluate(`location.pathname===${JSON.stringify(base+'/judging')}&&!document.querySelector('.field-bottom-nav')`));
 await wait(()=>evaluate("!!document.querySelector('.judging-score-sheet')"));
 await check('judging-focus-open',base+'/judging');
 await pg.query('UPDATE "JudgingContest" SET state=$1 WHERE id=$2',['OPEN','judging-browser-draft']);
 await pg.query('UPDATE "JudgingContest" SET state=$1 WHERE id=$2',['CLOSED','judging-browser-gala']);await refresh();
 await new Promise(r=>setTimeout(r,300));assert(await focused(),'Another open assigned contest keeps judging focused');
 await pg.query('UPDATE "JudgingContest" SET state=$1 WHERE id=$2',['DRAFT','judging-browser-draft']);
 await pg.query('UPDATE "JudgingContest" SET state=$1 WHERE id=$2',['OPEN','judging-browser-gala']);await refresh();
 await visit(base+'/people');await wait(()=>evaluate(`location.pathname===${JSON.stringify(base+'/judging')}`));
 assert(await focused(),'Old field links return to scoring while it is open');
 console.log('PASS: open/close judge focus, all field/activity links hidden, account access, automatic station-to-scoring transition, multiple assigned contests and old-link recovery.');
}

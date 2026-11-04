import assert from 'node:assert/strict';
import {auditContrast} from './browser-contrast.mjs';
export async function shareInBrowser({evaluate,eventId,key,facilitators='PUBLISHED',participants='PUBLISHED'}){
 await evaluate(`(async()=>{const url='/api/events/'+${JSON.stringify(eventId)}+'/result-sharing';const state=await (await fetch(url)).json(),item=state.items.find(i=>i.key===${JSON.stringify(key)}),body={key:item.key,sourceRevision:item.sourceRevision,sharingRevision:item.sharingRevision,runRevision:state.runRevision,facilitators:${JSON.stringify(facilitators)},participants:${JSON.stringify(participants)}};const review=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...body,operation:'preview'})}),preview=await review.json();if(!review.ok)throw Error(preview.error);const r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...body,operation:'confirm',token:preview.token,requestKey:crypto.randomUUID()})});if(!r.ok)throw Error((await r.json()).error);})()`);
}
export async function resultCenterBrowser({pg,event,evaluate,visit,check}){
 const base='/events/'+event.id,key='judging:judging-browser-gala',url=base+'/results?share='+encodeURIComponent(key);
 await check('result-center',base+'/results');
 await evaluate("document.querySelector('.organizer-account').open=true");assert(await evaluate("(()=>{const r=document.querySelector('.organizer-account .player-account-menu').getBoundingClientRect();return r.left>=0&&r.right<=innerWidth;})()"));assert.deepEqual(await evaluate('('+auditContrast.toString()+')()'),[],'Organizer account text must remain readable');await evaluate("document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}))");assert(await evaluate("!document.querySelector('.organizer-account').open"));
 assert(await evaluate("[...document.querySelectorAll('.organizer-section-links a')].filter(a=>a.textContent.trim()==='Results').length===1"));
 assert(!(await evaluate("[...document.querySelectorAll('.organizer-section-links a')].some(a=>/Overall results|Race results/.test(a.textContent))")));
 await check('result-sharing-settings',url);
 const setup=`(async()=>{const selects=document.querySelectorAll('.result-sharing-fields select');selects[0].value='LIVE';selects[0].dispatchEvent(new Event('change',{bubbles:true}));await new Promise(r=>setTimeout(r,50));[...document.querySelectorAll('.judging-dialog button')].find(b=>b.textContent==='Review sharing changes').click();for(let i=0;i<120;i++){if(document.querySelector('.result-sharing-summary'))return;await new Promise(r=>setTimeout(r,50));}throw Error('Sharing preview did not load');})()`;
 await check('result-sharing-review',url,setup);
 assert.equal((await pg.query('SELECT "participantVisibility" FROM "JudgingContest" WHERE id=$1',['judging-browser-gala'])).rows[0].participantVisibility,'HIDDEN','Review must not expose scores');
 assert(await evaluate("document.querySelector('.judging-dialog').textContent.includes('Participants will see submitted scores immediately')"));
 // Back preserves choices. Cancellation does not apply them.
 await evaluate("[...document.querySelectorAll('.judging-dialog button')].find(b=>b.textContent==='Back to audience settings').click()");assert(await evaluate("document.querySelector('.result-sharing-fields select').value==='LIVE'"));
 await evaluate("document.querySelector('.judging-dialog [aria-label=\"Close details\"]').click()");
 assert.equal((await pg.query('SELECT "participantVisibility" FROM "JudgingContest" WHERE id=$1',['judging-browser-gala'])).rows[0].participantVisibility,'HIDDEN');
 await visit(url);
 await evaluate("(()=>{const select=document.querySelectorAll('.result-sharing-fields select')[1];select.value='LIVE';select.dispatchEvent(new Event('change',{bubbles:true}));})()");
 await evaluate("[...document.querySelectorAll('.judging-dialog button')].find(b=>b.textContent==='Review sharing changes').click()");
 for(let i=0;i<120;i++){if(await evaluate("!!document.querySelector('.result-sharing-summary')"))break;await new Promise(r=>setTimeout(r,50));}
 await evaluate("[...document.querySelectorAll('.judging-dialog button')].find(b=>b.textContent==='Confirm sharing changes').click()");
 for(let i=0;i<120;i++){if((await pg.query('SELECT "facilitatorVisibility" FROM "JudgingContest" WHERE id=$1',['judging-browser-gala'])).rows[0].facilitatorVisibility==='LIVE')break;await new Promise(r=>setTimeout(r,50));}
 const result=(await pg.query('SELECT "facilitatorVisibility","participantVisibility" FROM "JudgingContest" WHERE id=$1',['judging-browser-gala'])).rows[0];assert.equal(result.facilitatorVisibility,'LIVE');assert.equal(result.participantVisibility,'HIDDEN');
 console.log('PASS: unified Results entry, mobile sharing settings/review, audience-specific confirmation, preserved choices and cancellation without exposure.');
}

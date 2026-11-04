import {shareInBrowser} from './result-center-browser.mjs';
import assert from 'node:assert/strict';
export async function judgedOverallBrowser({role,pg,event,evaluate,visit,check}){
 const base='/events/'+event.id;
 const click=label=>evaluate(`[...document.querySelectorAll('button')].find(b=>b.textContent==='${label}').click()`);
 const wait=async fn=>{for(let i=0;i<160;i++){if(await fn())return;await new Promise(r=>setTimeout(r,100));}throw Error('Timed out waiting for automatic overall results');};
 if(role==='organizer'){
  await check('judged-overall-settings',base+'/ranking-settings');assert(await evaluate("!!document.querySelector('select option[value=JUDGING]')"));
  await check('judged-overall-pending',base+'/overall');assert(await evaluate("document.querySelector('.overall-judging-source').textContent.includes('Waiting for approved')"));assert.equal(await evaluate("document.querySelectorAll('.overall-inputs select').length"),0,'No manual placements for linked judging');
  const source=(await pg.query('SELECT config FROM "JudgingContest" WHERE id=$1',['overall-auto-judging'])).rows[0].config;
  const rows=source.candidateIds.map((id,i)=>({id,name:'Team '+(i+1),average:92-i*2,maximum:100,submitted:1,judges:1,rank:i+1}));
  await pg.query('UPDATE "JudgingContest" SET state=$2,"publishedAt"=NOW(),"publishedResults"=$3,revision=revision+1 WHERE id=$1',['overall-auto-judging','PUBLISHED',JSON.stringify({name:'Banner judging',rows,criteria:source.criteria,publishedAt:new Date().toISOString()})]);
  await wait(()=>evaluate("document.querySelectorAll('.overall-judge-rows li').length===5"));
  await check('judged-overall-auto-ranks',base+'/overall',"document.querySelectorAll('.overall-standing').forEach(d=>d.open=true)");
  assert.deepEqual(await evaluate("[...document.querySelectorAll('.overall-standing summary>strong')].map(e=>Number(e.textContent.split('.')[0]))"),[1,2,3,4,5]);
  assert.deepEqual(await evaluate("[...document.querySelectorAll('.overall-standing summary>span')].map(e=>e.textContent)"),['92%','90%','88%','86%','84%']);
  await visit(base+'/overall');await evaluate("document.querySelector('.overall-entry-details').open=true");await click('Approve combined results');await evaluate("document.querySelector('.action-feedback-modal[open] .action-feedback-actions button:last-child').click()");await wait(async()=>!!(await pg.query('SELECT finalized FROM "OverallRanking" WHERE "eventId"=$1',[event.id])).rows[0].finalized);
  await shareInBrowser({evaluate,eventId:event.id,key:'judging:overall-auto-judging'});await shareInBrowser({evaluate,eventId:event.id,key:'overall'});
 }else{
  await check('judged-overall-published-'+role,base+'/overall');assert.equal(await evaluate("document.querySelectorAll('.overall-standing').length"),5);assert(await evaluate("document.body.textContent.includes('Average 92/100')"));
  if(role==='facilitator'){
   await pg.query('UPDATE "JudgingContest" SET state=$2,"publishedAt"=NULL,"publishedResults"=NULL,revision=revision+1 WHERE id=$1',['overall-auto-judging','CLOSED']);
   await check('judged-overall-withdrawn',base+'/overall');assert.equal(await evaluate("document.querySelectorAll('.overall-standing').length"),0);
  }
 }
 console.log('PASS: '+role+' published judge averages, automatic top-five ranking/refresh and safe overall publication.');
}

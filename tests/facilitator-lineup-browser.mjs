import assert from 'node:assert/strict';
export async function facilitatorLineupBrowser({role,pg,event,timerTeam,evaluate,visit,check}){
 const base='/events/'+event.id,station='demo-cipher-room',path=base+'/field?stationId='+station;
 const wait=async fn=>{for(let i=0;i<160;i++){if(await fn())return;await new Promise(r=>setTimeout(r,100));}throw Error('Facilitator lineup browser timed out');};
 const row=async()=>(await pg.query('SELECT * FROM "StationVisit" WHERE "teamId"=$1 AND "stationId"=$2',[timerTeam,station])).rows[0];
 const click=label=>evaluate(`[...document.querySelectorAll('button')].find(b=>(b.getAttribute('aria-label')||b.textContent.trim())===${JSON.stringify(label)}).click()`);
 if(role==='agent'){
  await visit(base+'/check-in?code=ABCDEFGH');await wait(()=>evaluate("!!document.querySelector('.arrival-review')"));assert(!(await evaluate("!!document.querySelector('.player-picker')")),'Captain has no lineup picker');
  await click('Record arrival');await wait(()=>evaluate("!!document.querySelector('.action-feedback-modal[open]')"));await wait(async()=>!!await row());
  assert.equal((await row()).state,'ARRIVED');assert.equal((await row()).startedAt,null);
  await check('lineup-captain-waiting',base);assert(await evaluate("document.body.textContent.includes('Waiting for facilitator')"));assert(!(await evaluate("!!document.querySelector('.player-picker')")));
 }else{
  await check('lineup-faci-roster',path);assert.equal(await evaluate("document.querySelectorAll('.facilitator-lineup .player-option').length"),19);
  const selection=`(async()=>{const clear=[...document.querySelectorAll('.facilitator-lineup button')].find(b=>b.textContent==='Clear sit-outs');if(clear&&!clear.disabled){clear.click();await new Promise(r=>setTimeout(r,40));}for(let i=0;i<4;i++){document.querySelectorAll('.facilitator-lineup .player-option input')[i].click();await new Promise(r=>setTimeout(r,30));}})()`;
  await check('lineup-faci-four-sit-outs',path,selection);
  assert(await evaluate("document.querySelector('.player-selection-bar').textContent.includes('15 / 15 playing')"));assert.equal(await evaluate("document.querySelectorAll('.facilitator-lineup input[type=checkbox]:checked').length"),4);assert.equal(await evaluate("document.querySelectorAll('.lineup-playing-preview p').length"),15);
  await click('Confirm lineup & start timer');await wait(()=>evaluate("!!document.querySelector('.action-feedback-modal[open]')"));assert(await evaluate("document.querySelector('.action-feedback-modal').textContent.includes('15 playing')"));await wait(async()=>(await row())?.state==='ACTIVE');
  const visitRow=await row();assert(visitRow.startedAt);const ids=(await pg.query('SELECT "membershipId" FROM "StationVisitPlayer" WHERE "visitId"=$1',[visitRow.id])).rows.map(r=>r.membershipId);assert.equal(ids.length,15);
  const roster=(await pg.query('SELECT m.id FROM "EventMembership" m JOIN "User" u ON u.id=m."userId" WHERE m."teamId"=$1 AND m.active=true AND u.active=true AND m.role=$2 ORDER BY u.name',[timerTeam,'PARTICIPANT'])).rows.map(r=>r.id);assert(roster.slice(0,4).every(id=>!ids.includes(id)));
  await check('lineup-faci-confirmed',path);assert(!(await evaluate("!!document.querySelector('.facilitator-lineup')")),'Started lineup becomes read-only');
 }
 console.log('PASS: '+role+' arrival-only captain / facilitator 19-minus-4 selection, real timer start, locked lineup and responsive layouts.');
}

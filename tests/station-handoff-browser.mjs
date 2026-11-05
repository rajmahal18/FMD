import assert from 'node:assert/strict';
export async function stationHandoffBrowser({role,cookie,pg,event,timerTeam,evaluate,visit,check,origin,appOrigin,password}){
 const base='/events/'+event.id,station='demo-cipher-room';
 const wait=async fn=>{for(let i=0;i<180;i++){if(await fn())return;await new Promise(r=>setTimeout(r,100));}throw Error('Station handoff timed out');};
 const row=async()=>(await pg.query('SELECT * FROM "StationVisit" WHERE "teamId"=$1 AND "stationId"=$2',[timerTeam,station])).rows[0];
 const sum=async()=>(await pg.query('SELECT COALESCE(SUM(seconds),0)::int AS n FROM "TimePenaltyEntry" WHERE "visitId"=$1 AND "voidedAt" IS NULL',[(await row()).id])).rows[0].n;
 const click=label=>evaluate(`[...document.querySelectorAll('button')].find(b=>(b.getAttribute('aria-label')||b.textContent.trim())===${JSON.stringify(label)}).click()`);
 if(role==='facilitator'){
  await visit(base+'/program');assert(await evaluate("location.pathname.endsWith('/program')"));
  const login=await fetch(appOrigin+'/api/auth/login',{method:'POST',headers:{origin,'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({email:'agent@example.test',password}),redirect:'manual'});
  const captain=login.headers.get('set-cookie').split(';')[0];
  const arrival=await fetch(appOrigin+base.replace('/events/','/api/events/')+'/race',{method:'POST',headers:{origin,cookie:captain,'content-type':'application/json'},body:JSON.stringify({operation:'checkIn',credential:'ABCDEFGH',runRevision:0,requestKey:crypto.randomUUID()})});assert.equal(arrival.status,200);
  await evaluate("window.dispatchEvent(new Event('focus'))");
  await wait(()=>evaluate("location.pathname.endsWith('/field')&&location.search.includes('visitId=')&&!!document.querySelector('.station-timer')"));
  assert((await row()).startedAt);assert.equal((await row()).state,'ARRIVED');
  assert(await evaluate("document.querySelector('.field-header h2').textContent==='Cipher Room'"));
  await check('handoff-arrival-controls',base+'/field?stationId='+station+'&visitId='+(await row()).id);
  assert.equal(await evaluate("document.querySelectorAll('.penalty-phase').length"),2);
  await click('Confirm lineup & begin play');await wait(async()=>(await row()).state==='ACTIVE');
  await visit(base+'/field?stationId='+station);await click('+30 sec - Unfinished task');await wait(async()=>await sum()===30);
  const field=await (await fetch(appOrigin+'/api/events/'+event.id+'/field?stationId='+station,{headers:{cookie}})).json();assert(Date.now()-Date.parse(field.visits[0].startedAt)<600000,'After-limit test penalty does not wait ten minutes');
  await visit(base+'/field?stationId='+station);await click('+10 sec - Wrong step');await wait(async()=>await sum()===40);
  await visit(base+'/field?stationId='+station);await click('Finish challenge');await wait(async()=>(await row()).state==='AWAITING_CONFIRMATION');
  await visit(base+'/field?stationId='+station);assert.equal(await evaluate("document.querySelectorAll('.penalty-phase').length"),1,'Only after-limit buttons remain after Finish');
  await click('+30 sec - Unfinished task');await wait(async()=>await sum()===70);
  await check('handoff-after-activity',base+'/field?stationId='+station);
  await click('Review station time');await click('Confirm result & release squad');await wait(async()=>(await row()).state==='COMPLETED');
  const records=(await pg.query('SELECT phase FROM "TimePenaltyEntry" WHERE "visitId"=$1',[(await row()).id])).rows;assert.equal(records.filter(r=>r.phase==='AFTER_LIMIT').length,2);
 }else{
  assert.equal((await fetch(appOrigin+'/api/events/'+event.id+'/field-arrivals',{headers:{cookie}})).status,403);
  const response=await fetch(appOrigin+'/api/events/'+event.id+'/mission',{headers:{cookie}}),mission=await response.json();
  assert.equal(mission.teamTimeSeconds,undefined);const v=mission.visits.find(v=>v.stationId===station);
  for(const key of ['durationSeconds','timePenaltySeconds','finishedAt','lineupSubmittedAt','arrivalApprovedAt'])assert.equal(v[key],undefined,key+' must stay private');assert.equal(v.startedAt,null);
  await check('handoff-participant-completed',base);assert(!(await evaluate("!!document.querySelector('.station-timer')")));
  await check('handoff-participant-station-result',base,"document.querySelector('.mission-support details').open=true;document.querySelector('.station-tile').click()");
  assert(await evaluate("!document.querySelector('.station-detail-modal').textContent.includes('penalties')&&!document.querySelector('.station-detail-modal').textContent.includes('Timing unavailable')"));
 }
 console.log('PASS: '+role+' automatic assigned-station arrival focus, running clock, early/finished after-limit penalties and participant completed-time privacy.');
}

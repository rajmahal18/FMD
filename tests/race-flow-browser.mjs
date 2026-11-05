import assert from 'node:assert/strict';
const savedCookies={};
export async function raceFlowBrowser({role,cookie,pg,event,timerTeam,evaluate,visit,check,cmd,origin,appOrigin,policy}){
 savedCookies[role]=cookie;
 const wait=async(fn)=>{for(let i=0;i<80;i++){if(await fn())return;await new Promise(r=>setTimeout(r,100));}throw Error('Timed out waiting for race-flow browser state');};
 const visits=async()=>(await pg.query('SELECT * FROM "StationVisit" WHERE "teamId"=$1 AND "stationId"=$2',[timerTeam,'demo-cipher-room'])).rows;
 const click=async label=>{await evaluate("document.querySelector('.player-picker')?.scrollIntoView({block:'start'})");await wait(()=>evaluate(`[...document.querySelectorAll('button')].some(b=>(b.getAttribute('aria-label')||b.textContent)==='${label}')`));return evaluate(`[...document.querySelectorAll('button')].find(b=>(b.getAttribute('aria-label')||b.textContent)==='${label}').click()`);};
 const restore=async value=>{await cmd('Network.clearBrowserCookies');const i=value.indexOf('=');await cmd('Network.setCookie',{name:value.slice(0,i),value:value.slice(i+1),url:origin,httpOnly:true,secure:true,path:'/'});};
 const race=async(operation,values,who)=>{const response=await fetch(`${appOrigin}/api/events/${event.id}/race`,{method:'POST',headers:{origin,cookie:savedCookies[who],'content-type':'application/json'},body:JSON.stringify({operation,requestKey:crypto.randomUUID(),...values})});const body=await response.json();assert.equal(response.status,200,JSON.stringify(body));return body;};
 if(role==='organizer'){
  await check('flow-settings-'+policy,`/events/${event.id}/setup`,"document.querySelector('#race-flow').open=true");
  await check('flow-hq-locked-'+policy,`/events/${event.id}`);
  assert(await evaluate("[...document.querySelectorAll('button')].find(b=>b.textContent==='Start shared HQ countdown').disabled"));
 }else if(role==='agent'){
  await visit(`/events/${event.id}/check-in?code=23456789`);
  if(policy!=='SCAN_APPROVAL_TIMED'){
   await wait(()=>evaluate("!!document.querySelector('.arrival-review')"));
   assert.equal(await evaluate("!!document.querySelector('.player-picker')"),false);
   await click('Record arrival');
  }
  await wait(async()=>(await visits()).length===1);
  const v=(await visits())[0];assert.equal(v.state,'ARRIVED');assert.equal(!!v.startedAt,policy==='SCAN_APPROVAL_TIMED');
  await check('flow-waiting-'+policy,`/events/${event.id}`);
  assert.equal(await evaluate("!!document.querySelector('.player-picker')"),false,'Approval waiting has no premature lineup controls');
  assert.equal(await evaluate("!!document.querySelector('.mission-directions p')"),false,'No premature participant instructions');
 }else{
  await check('flow-approval-'+policy,`/events/${event.id}/field`);
  const before=(await visits())[0];
  await wait(()=>evaluate("!!document.querySelector('.facilitator-lineup')"));
  await evaluate("(async()=>{const inputs=document.querySelectorAll('.facilitator-lineup input[type=checkbox]');for(let i=0;i<inputs.length-2;i++){inputs[i].click();await new Promise(r=>setTimeout(r,30));}})()");
  await click(policy==='SCAN_APPROVAL_TIMED'?'Confirm lineup & begin play':'Confirm lineup & start timer');
  await wait(async()=>(await visits())[0].state==='ACTIVE');
  if(before.startedAt)assert.equal(String((await visits())[0].startedAt),String(before.startedAt),'Lineup confirmation preserves the running clock');
  await check('flow-approved-'+policy,`/events/${event.id}/field`);
  await click('Finish challenge');await wait(async()=>(await visits())[0].state==='AWAITING_CONFIRMATION');
  const v=(await visits())[0];await race('confirmResult',{visitId:v.id,successful:true,expectedPenaltySeconds:0},'facilitator');
  await restore(savedCookies.organizer);await check('flow-hq-ready-'+policy,`/events/${event.id}`);
  await click('Start shared HQ countdown');await wait(()=>evaluate("!!document.querySelector('.action-feedback-modal[open] .action-feedback-actions button:last-child')"));
  await evaluate("document.querySelector('.action-feedback-modal[open] .action-feedback-actions button:last-child').click()");
  await wait(async()=>!!(await pg.query('SELECT "finalStartedAt" FROM "Event" WHERE id=$1',[event.id])).rows[0].finalStartedAt);
  await check('flow-hq-countdown-'+policy,`/events/${event.id}`);
  await restore(savedCookies.agent);await check('flow-participant-countdown-'+policy,`/events/${event.id}`);
  await restore(cookie);await check('flow-final-controls-'+policy,`/events/${event.id}/field?stationId=flow-final-station`);
  assert(await evaluate("!!document.querySelector('.final-countdown')"));
  await cmd('Emulation.setDeviceMetricsOverride',{width:320,height:740,deviceScaleFactor:1,mobile:true});await visit(`/events/${event.id}/field?stationId=flow-final-station`);
  assert(await evaluate("(()=>{const button=[...document.querySelectorAll('button')].find(b=>b.getAttribute('aria-label')==='Finish challenge'),nav=document.querySelector('.field-bottom-nav');return button&&button.getBoundingClientRect().bottom<=nav.getBoundingClientRect().top&&document.querySelector('.final-countdown').getBoundingClientRect().top>=0;})()"),'Final countdown and Finish fit on a 320x740 phone');
 }
 if(role==='facilitator'){
  await click('Finish challenge');await wait(async()=>(await pg.query('SELECT state FROM "StationVisit" WHERE "teamId"=$1 AND "stationId"=$2',[timerTeam,'flow-final-station'])).rows[0].state==='AWAITING_CONFIRMATION');
  await check('flow-final-review-'+policy,`/events/${event.id}/field?stationId=flow-final-station`,"(async()=>{const select=document.querySelector('.result-review select');Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set.call(select,'SUCCESS');select.dispatchEvent(new Event('change',{bubbles:true}));await new Promise(r=>setTimeout(r,100));[...document.querySelectorAll('button')].find(b=>b.textContent==='Review Final Station result').click();})()");
  await click('Confirm Final Station result');await wait(async()=>(await pg.query('SELECT COUNT(*)::int AS n FROM "StationOutcome" WHERE "teamId"=$1 AND "stationId"=$2 AND "basePoints"=100',[timerTeam,'flow-final-station'])).rows[0].n===1);
  await restore(savedCookies.agent);await check('flow-final-result-'+policy,`/events/${event.id}`);
  assert(await evaluate("document.querySelector('.final-station-status').textContent.includes('100 points')"),'Participant sees confirmed Final Station points');
 }
 console.log('PASS: '+role+' arrival-flow browser '+policy);
}

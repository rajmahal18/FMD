import assert from 'node:assert/strict';
export async function teamProgressBrowser({pg,event,evaluate,visit,check,cookie,origin,appOrigin}){
 const base='/events/'+event.id,field=base+'/field?stationId=demo-cipher-room';
 const wait=async fn=>{for(let i=0;i<120;i++){if(await fn())return;await new Promise(r=>setTimeout(r,100));}throw Error('Team progress timed out');};
 await visit(field);await new Promise(r=>setTimeout(r,500));
 await evaluate("document.querySelector('.field-bottom-nav a[href$=\"#team-progress\"]').click()");
 await wait(()=>evaluate("!!document.querySelector('#team-progress:not([hidden])')"));
 const response=await fetch(appOrigin+'/api/events/'+event.id+'/field?stationId=demo-cipher-room',{headers:{cookie}}),data=await response.json();
 assert(await evaluate("!!document.querySelector('.player-account-menu a[href$=\"/people\"]')"),'Full roster stays available from Account');
 assert.equal(data.teamProgress.length,5);assert.deepEqual(data.teamProgress.map(t=>t.status).sort(),['DONE','NOT_VISITED','PLAYING','REVIEW','WAITING']);
 await check('handler-team-progress',field+'#team-progress');
 assert.equal(await evaluate("document.querySelectorAll('#team-progress .station-tile').length"),5);assert(await evaluate("document.querySelector('.team-progress-count').textContent==='1 / 5 done'"));
 await check('handler-completed-team',field+'#team-progress',"[...document.querySelectorAll('#team-progress .station-tile')].find(b=>b.textContent.includes('Alpha')).click()");
 assert(await evaluate("document.querySelector('.station-detail-modal').textContent.includes('Visit completed and result confirmed.')"));
 await visit(field+'#team-progress');await evaluate("[...document.querySelectorAll('#team-progress .station-tile')].find(b=>b.textContent.includes('Delta')).click()");
 await evaluate("[...document.querySelectorAll('.station-detail-modal button')].find(b=>b.textContent==='Open team controls').click()");
 await wait(()=>evaluate("!!document.querySelector('.station-team:not([hidden]) .station-timer')&&!!document.querySelector('[aria-label=\"Station work\"]:not([hidden])')"));
 assert(await evaluate("document.querySelector('.station-team:not([hidden]) h3').textContent==='Delta'"));
 const confirmed=await fetch(appOrigin+'/api/events/'+event.id+'/race',{method:'POST',headers:{origin,cookie,'content-type':'application/json'},body:JSON.stringify({operation:'confirmResult',visitId:'progress-review-visit',successful:true,expectedPenaltySeconds:0,runRevision:0,requestKey:crypto.randomUUID()})});assert.equal(confirmed.status,200);
 await wait(()=>evaluate("document.querySelector('.team-progress-count').textContent==='2 / 5 done'"));
 await check('handler-team-progress-updated',field+'#team-progress');assert(await evaluate("document.querySelector('.team-progress-count').textContent==='2 / 5 done'"));
 await visit(field+'#field-history');assert(await evaluate("!!document.querySelector('#field-history')"),'Confirmed result history stays available');
 await pg.query('UPDATE "StationVisit" SET state=$1 WHERE id IN ($2,$3)',['CANCELLED','timer-browser-visit','progress-wait-visit']);
 await check('handler-idle-team-progress',field);
 assert(await evaluate("!!document.querySelector('#team-progress:not([hidden])')&&!!document.querySelector('[aria-label=\"Station work\"][hidden]')"),'Idle station opens directly to the team overview');
 console.log('PASS: five team status tiles, expected-team filtering, done count, team detail modal, controls navigation, real result confirmation updates and preserved history at mobile/desktop widths.');
}

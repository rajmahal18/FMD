import assert from 'node:assert/strict';
export async function stationTimingBrowser({role,pg,event,evaluate,visit,check,cmd}){
 const path=`/events/${event.id}/field?stationId=demo-cipher-room`,id='timer-browser-visit';
 const row=async()=>(await pg.query('SELECT * FROM "StationVisit" WHERE id=$1',[id])).rows[0];
 const wait=async fn=>{for(let i=0;i<180;i++){if(await fn())return;await new Promise(r=>setTimeout(r,100));}throw Error('Station timing browser flow timed out');};
 if(role==='agent'){
  await pg.query('UPDATE "StationVisit" SET "releaseAt"=$1 WHERE id=$2',[new Date(Date.now()+6000).toISOString(),id]);
  await cmd('Emulation.setDeviceMetricsOverride',{width:320,height:900,deviceScaleFactor:1,mobile:true});
  await visit(`/events/${event.id}`);
  await wait(()=>evaluate("!!document.querySelector('.station-release')"));
  assert(await evaluate("document.querySelector('#current-mission').dataset.status==='RELEASING'"));
  assert(!(await evaluate("!!document.querySelector('.station-timer')")),'Completed participant times stay private');
  assert(await evaluate('document.documentElement.scrollWidth<=innerWidth'));
  const shot=await cmd('Page.captureScreenshot',{format:'png',captureBeyondViewport:true});const {default:fs}=await import('node:fs');fs.writeFileSync('.tmp/stability-evidence/station-release-participant-320.png',Buffer.from(shot.data,'base64'));
  await wait(()=>evaluate("document.querySelector('#current-mission').dataset.status==='COMPLETE'"));
  console.log('PASS: participant mobile release countdown, automatic next-state refresh and completed-time privacy.');return;
 }
 const buttons=[{id:'after',label:'Unfinished task',seconds:30,phase:'AFTER_LIMIT'}];
 await pg.query('UPDATE "Station" SET "timeLimitMinutes"=11,"timePenaltyButtons"=$1 WHERE id=$2',[JSON.stringify(buttons),'demo-cipher-room']);
 let end=new Date(Date.now()+20000),start=new Date(end.getTime()-60000);
 await pg.query('UPDATE "StationVisit" SET "startedAt"=$1,"timerSnapshotAt"=$1,"timerDeadlineAt"=$2 WHERE id=$3',[start.toISOString(),end.toISOString(),id]);
 await check('station-timing-running',path);
 assert(await evaluate("document.querySelector('.station-timer').textContent.includes('Limit: 1 min')"),'Running visit must keep its saved limit, not the edited station limit');
 end=new Date(Date.now()+2500);start=new Date(end.getTime()-60000);
 await pg.query('UPDATE "StationVisit" SET "startedAt"=$1,"timerDeadlineAt"=$2 WHERE id=$3',[start.toISOString(),end.toISOString(),id]);
 await visit(path);
 await cmd('Network.emulateNetworkConditions',{offline:true,latency:0,downloadThroughput:-1,uploadThroughput:-1});
 await wait(()=>evaluate("document.querySelector('.station-timer')?.getAttribute('data-running')==='false'"));
 assert(await evaluate("document.querySelector('.challenge-clock').textContent.includes('1:00')"),'Offline clock must clamp at the saved deadline');
 await cmd('Network.emulateNetworkConditions',{offline:false,latency:0,downloadThroughput:-1,uploadThroughput:-1});await evaluate("window.dispatchEvent(new Event('online'))");
 await wait(async()=>(await row()).state==='AWAITING_CONFIRMATION');
 await check('station-timing-review',path);
 assert.equal((await pg.query('SELECT count(*)::int n FROM "StationOutcome" WHERE "visitId"=$1',[id])).rows[0].n,0);
 await evaluate("document.querySelector('.time-penalty-actions button').click()");
 await wait(async()=>(await pg.query('SELECT count(*)::int n FROM "TimePenaltyEntry" WHERE "visitId"=$1',[id])).rows[0].n===1);
 await visit(path);
 await evaluate("[...document.querySelectorAll('button')].find(b=>b.textContent==='Review station time').click()");
 await evaluate("[...document.querySelectorAll('button')].find(b=>b.textContent==='Confirm result & release squad').click()");
 await wait(async()=>(await row()).state==='COMPLETED');
 await evaluate("document.querySelector('.action-feedback-modal[open] .action-feedback-actions button')?.click()");
 await wait(()=>evaluate("!!document.querySelector('.station-release')"));
 assert(await evaluate("document.querySelector('.station-release').textContent.includes('Scores and penalties are locked')"));
 const shot=await cmd('Page.captureScreenshot',{format:'png',captureBeyondViewport:true});
 const {default:fs}=await import('node:fs');fs.writeFileSync('.tmp/stability-evidence/station-release-countdown.png',Buffer.from(shot.data,'base64'));
 await wait(()=>evaluate("!document.querySelector('.station-release')"));
 const outcome=(await pg.query('SELECT "durationSeconds","timePenaltySeconds" FROM "StationOutcome" WHERE "visitId"=$1',[id])).rows[0];assert.equal(outcome.durationSeconds,60);assert.equal(outcome.timePenaltySeconds,30);
 await check('station-timing-released',path);
 console.log('PASS: mobile/desktop saved-limit display, offline automatic cutoff, reconnect, after-limit review, explicit approval and automatic five-second release without another click.');
}

import assert from 'node:assert/strict';
export async function setupStationScoringBrowser({pg,event,timerTeam}){
 const stationIds=['demo-cipher-room',...Array.from({length:6},(_,i)=>'score-browser-station-'+i)];
 const actor=(await pg.query('SELECT "userId" FROM "EventMembership" WHERE "eventId"=$1 AND role=$2',[event.id,'FACILITATOR'])).rows[0].userId;
 await pg.query('DELETE FROM "StationVisit" WHERE id=$1',['timer-browser-visit']);
 for(const [i,id] of stationIds.entries())if(i)await pg.query('INSERT INTO "Station" (id,"eventId",name,location,briefing,configured) VALUES ($1,$2,$3,$4,$5,true)',[id,event.id,'Regular Station '+(i+1),'Test field','Physical challenge']);
 await pg.query('UPDATE "RoutePlan" SET "stationIds"=$1 WHERE id=$2',[JSON.stringify(stationIds),'timer-browser-route']);
 await pg.query('UPDATE "TeamRouteAssignment" SET "stationIds"=$1 WHERE "teamId"=$2',[JSON.stringify(stationIds),timerTeam]);
 const teams=[timerTeam,...['b','c','d','e'].map(id=>'score-browser-team-'+id)];
 for(const [i,team] of teams.entries()){
  if(i){await pg.query('INSERT INTO "Team" (id,"eventId",name) VALUES ($1,$2,$3)',[team,event.id,'Team '+String.fromCharCode(65+i)]);await pg.query('INSERT INTO "TeamRouteAssignment" (id,"teamId","routeId","routeRevision",mode,"stationIds") VALUES ($1,$2,$3,1,$4,$5)',['score-assignment-'+i,team,'timer-browser-route','FIXED',JSON.stringify(stationIds)]);}
  for(const [j,stationId] of stationIds.entries()){
   const visit=`score-visit-${i}-${j}`,outcome=`score-outcome-${i}-${j}`;
   await pg.query('INSERT INTO "StationVisit" (id,"eventId","teamId","stationId",state,"startedAt","finishedAt","confirmedAt","updatedAt") VALUES ($1,$2,$3,$4,$5,$6,$7,NOW(),NOW())',[visit,event.id,team,stationId,'COMPLETED','2026-11-05T00:00:00Z',new Date(Date.UTC(2026,10,5,0,0,(i+1)*10)).toISOString()]);
   await pg.query('INSERT INTO "StationOutcome" (id,"eventId","teamId","stationId","visitId","actorId",successful,"basePoints","durationSeconds","resultHash","confirmationJson") VALUES ($1,$2,$3,$4,$5,$6,true,100,$7,$8,$9)',[outcome,event.id,team,stationId,visit,actor,(i+1)*10,'browser-score','{}']);
   await pg.query('INSERT INTO "ScoreLedgerEntry" (id,"eventId","teamId","stationId","outcomeId",kind,amount) VALUES ($1,$2,$3,$4,$5,$6,100)',['score-ledger-'+i+'-'+j,event.id,team,stationId,outcome,'STATION']);
  }
 }
 const config={raceRule:'STATION_PLACEMENTS',raceScoring:{credits:[100,90,80,70,60],regularWeight:80,finalWeight:20,successScore:100,failedScore:0,stationIds},events:[{id:'race',name:'Amazing Race',source:'SPY',weight:45,credits:[100,90,80,70,60],ranks:{}},{id:'other',name:'Other activity',source:'MANUAL',weight:55,credits:[100,90,80,70,60],ranks:Object.fromEntries(teams.map((id,i)=>[id,i+1]))}]};
 await pg.query('UPDATE "OverallRanking" SET config=$1 WHERE "eventId"=$2',[JSON.stringify(config),event.id]);
}
export async function stationScoringBrowser({pg,event,timerTeam,evaluate,visit,check}){
 const path='/events/'+event.id+'/results?section=race';
 const wait=async fn=>{for(let i=0;i<120;i++){if(await fn())return;await new Promise(r=>setTimeout(r,100));}throw Error('Final Station browser timed out');};
 const open=async(name,choice)=>{
  await evaluate(`[...document.querySelectorAll('.race-final-panel .station-tile')].find(b=>b.textContent.includes(${JSON.stringify(name)})).click()`);
  await evaluate(`(()=>{const select=document.querySelector('.race-final-entry select');Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set.call(select,${JSON.stringify(choice)});select.dispatchEvent(new Event('change',{bubbles:true}));})()`);
  await new Promise(r=>setTimeout(r,80));await evaluate("[...document.querySelectorAll('.race-final-entry button')].find(b=>b.textContent==='Review Final Station result').click()");
 };
 const confirm=async()=>{await evaluate("[...document.querySelectorAll('.race-final-entry button')].find(b=>b.textContent==='Confirm Final Station result').click()");await wait(()=>evaluate("!document.querySelector('.station-detail-modal[open]')"));await evaluate("document.querySelector('.action-feedback-modal[open] .action-feedback-actions button')?.click()");};
 await visit(path);await wait(()=>evaluate("document.querySelectorAll('.race-final-panel .station-tile').length===5"));
 await check('race-final-pending-tiles',path);
 await open('Delta','SUCCESS');
 assert(await evaluate("document.querySelector('.race-final-entry').textContent.includes('20 points')"));
 await check('race-final-review',path,"(async()=>{[...document.querySelectorAll('.race-final-panel .station-tile')].find(b=>b.textContent.includes('Delta')).click();for(let i=0;i<40&&!document.querySelector('.race-final-entry select');i++)await new Promise(r=>setTimeout(r,50));const select=document.querySelector('.race-final-entry select');Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set.call(select,'SUCCESS');select.dispatchEvent(new Event('change',{bubbles:true}));await new Promise(r=>setTimeout(r,80));[...document.querySelectorAll('.race-final-entry button')].find(b=>b.textContent==='Review Final Station result').click();})()");
 await confirm();await wait(async()=>(await pg.query('SELECT successful FROM "RaceFinalResult" WHERE "eventId"=$1 AND "teamId"=$2',[event.id,timerTeam])).rows[0]?.successful===true);
 await visit(path);await wait(()=>evaluate("document.querySelectorAll('.race-final-panel .station-tile').length===5"));await open('Team B','FAILED');await confirm();
 await wait(async()=>(await pg.query('SELECT successful FROM "RaceFinalResult" WHERE "eventId"=$1 AND "teamId"=$2',[event.id,'score-browser-team-b'])).rows[0]?.successful===false);
 await visit(path);await wait(()=>evaluate("document.querySelectorAll('.race-final-panel .station-tile').length===5"));await open('Team B','SUCCESS');await confirm();
 await wait(async()=>(await pg.query('SELECT version FROM "RaceFinalResult" WHERE "eventId"=$1 AND "teamId"=$2',[event.id,'score-browser-team-b'])).rows[0]?.version===2);
 await check('race-final-saved-tiles',path);
 const text=await evaluate("document.body.textContent");assert(text.includes('630 / 700')&&text.includes('72 pts')&&text.includes('Success (20 pts)'));
 await check('race-station-breakdown',path,"document.querySelector('.race-station-breakdown').open=true;document.querySelector('.race-station-breakdown>details').open=true");
 assert(await evaluate("document.querySelector('.race-station-breakdown').textContent.includes('Regular Station 2')"));
 console.log('PASS: actual organizer Final Station tiles, pending/success/failed states, reviewed mobile submissions, versioned edit, seven-station 700-point breakdown and 80/20 score display.');
}

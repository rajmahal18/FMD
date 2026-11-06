import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
let organizerCookie;
export async function finalChallengeBrowser({role,pg,event,evaluate,visit,check,cmd,cookie,origin,appOrigin}){
 const base=`/events/${event.id}`,api=`/api/events/${event.id}/final-challenge`,settings=base+'/final-challenge',display=settings+'/display';
 const wait=async fn=>{for(let i=0;i<150;i++){if(await fn())return;await new Promise(r=>setTimeout(r,100));}throw Error('Final Challenge browser timed out');};
 if(role==='organizer'){
  organizerCookie=cookie;
  const owner=(await pg.query('SELECT "userId" FROM "EventMembership" WHERE "eventId"=$1 AND role=$2',[event.id,'ORGANIZER'])).rows[0].userId;
  const first=(await pg.query('SELECT id FROM "Team" WHERE "eventId"=$1 LIMIT 1',[event.id])).rows[0].id;
  const names=['Blue Huntrix','Vanguard Elite','Scarlet Swag','Task Force V','Green Phantom'],teams=[first,...[1,2,3,4].map(i=>'defusal-browser-team-'+i)],stations=['demo-cipher-room',...[1,2,3,4,5,6].map(i=>'defusal-browser-station-'+i)];
  await pg.query('UPDATE "Team" SET name=$1 WHERE id=$2',[names[0],first]);
  await pg.query('UPDATE "StationVisit" SET state=$1,"confirmedAt"=$2 WHERE id=$3',['COMPLETED','2026-11-01T00:00:00Z','timer-browser-visit']);
  for(let j=1;j<7;j++)await pg.query('INSERT INTO "Station" (id,"eventId",name,location,briefing,configured) VALUES ($1,$2,$3,$4,$5,true)',[stations[j],event.id,'Regular station '+j,'Test','Physical game']);
  await pg.query('UPDATE "RoutePlan" SET "stationIds"=$1 WHERE id=$2',[JSON.stringify(stations),'timer-browser-route']);
  await pg.query('UPDATE "TeamRouteAssignment" SET "stationIds"=$1 WHERE "teamId"=$2',[JSON.stringify(stations),first]);
  for(let i=1;i<5;i++){await pg.query('INSERT INTO "Team" (id,"eventId",name) VALUES ($1,$2,$3)',[teams[i],event.id,names[i]]);await pg.query('INSERT INTO "TeamRouteAssignment" (id,"teamId","routeId","routeRevision",mode,"stationIds") VALUES ($1,$2,$3,1,$4,$5)',['defusal-browser-route-'+i,teams[i],'timer-browser-route','FIXED',JSON.stringify(stations)]);}
  for(let i=0;i<5;i++)for(let j=0;j<7;j++){
   const v=i===0&&j===0?'timer-browser-visit':`defusal-browser-visit-${i}-${j}`;
   if(i||j)await pg.query('INSERT INTO "StationVisit" (id,"eventId","teamId","stationId",state,"confirmedAt","updatedAt") VALUES ($1,$2,$3,$4,$5,$6,$6)',[v,event.id,teams[i],stations[j],'COMPLETED','2026-11-01T00:00:00Z']);
   await pg.query('INSERT INTO "StationOutcome" (id,"eventId","teamId","stationId","visitId","actorId",successful,"basePoints","durationSeconds","resultHash","confirmationJson") VALUES ($1,$2,$3,$4,$5,$6,true,100,60,$7,$8)',['outcome-'+v,event.id,teams[i],stations[j],v,owner,'fixture','{}']);
   await pg.query('INSERT INTO "ScoreLedgerEntry" (id,"eventId","teamId","stationId","outcomeId",kind,amount) VALUES ($1,$2,$3,$4,$5,$6,100)',['ledger-'+v,event.id,teams[i],stations[j],'outcome-'+v,'STATION']);
  }
  await pg.query('UPDATE "OverallRanking" SET config=$1 WHERE "eventId"=$2',[JSON.stringify({raceRule:'STATION_PLACEMENTS',raceScoring:{credits:[100,90,80,70,60],regularWeight:80,finalWeight:20,successScore:100,failedScore:50,stationIds:stations},events:[]}),event.id]);
  await check('defusal-private-settings',settings);await wait(()=>evaluate("document.querySelectorAll('.defusal-pin-list input').length===5"));
  await evaluate("(()=>{const n=document.querySelector('.defusal-admin input[type=number]');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(n,'1');n.dispatchEvent(new Event('input',{bubbles:true}));for(const input of document.querySelectorAll('.defusal-pin-list input')){Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,'012345');input.dispatchEvent(new Event('input',{bubbles:true}));}document.querySelector('.defusal-admin input[type=checkbox]').click();})()");
  await evaluate("document.querySelector('.defusal-admin form').requestSubmit()");
  await wait(async()=>(await pg.query('SELECT enabled FROM "FinalChallenge" WHERE "eventId"=$1',[event.id])).rows[0]?.enabled===true);
  await check('defusal-display-waiting',display);
  assert.equal(await evaluate("document.querySelectorAll('.threat-tile').length"),5);
  assert(!(await evaluate("!!document.querySelector('.defusal-display input,.defusal-display button:not([data-presentation-control=fullscreen])')")),'Projector must have only presentation controls and no PIN inputs');
  const sizes=[];
  for(const [width,height] of [[1280,720],[1920,1080],[3840,2160]]){
   await cmd('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});
   const layout=await evaluate("(()=>{const main=document.querySelector('.defusal-display'),tiles=[...main.querySelectorAll('.threat-tile')],title=tiles[0].querySelector('h2');return {width:innerWidth,height:innerHeight,scrollWidth:document.documentElement.scrollWidth,scrollHeight:document.documentElement.scrollHeight,titleSize:parseFloat(getComputedStyle(title).fontSize),tileWidths:tiles.map(t=>t.getBoundingClientRect().width),tilesFit:tiles.every(t=>{const r=t.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight+.5&&r.left>=0&&r.right<=innerWidth+.5&&t.scrollHeight<=t.clientHeight+1})}})()");
   assert(layout.scrollWidth<=width&&layout.scrollHeight<=height,'Projector must fit the viewport without scrolling');assert(layout.tilesFit,'All five squad overlays must fit');assert(Math.max(...layout.tileWidths)-Math.min(...layout.tileWidths)<2,'All squad tiles have equal width');sizes.push(layout.titleSize);
   const image=await cmd('Page.captureScreenshot',{format:'png',captureBeyondViewport:true});fs.writeFileSync(path.resolve('.tmp/stability-evidence/defusal-projector-'+width+'.png'),Buffer.from(image.data,'base64'));
  }
  assert(sizes[2]>sizes[1]&&sizes[1]>sizes[0],'Projection typography must scale through 4K');
  const control=await evaluate("(()=>{const r=document.querySelector('.display-fullscreen').getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()");
  await cmd('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',clickCount:1,...control});await cmd('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,...control});
  await wait(()=>evaluate("document.fullscreenElement===document.querySelector('.defusal-display')"));
  await wait(()=>evaluate("document.querySelector('.defusal-display').dataset.controls==='hidden'"));
  assert.equal(await evaluate("getComputedStyle(document.querySelector('.display-controls')).pointerEvents"),'none');
  await cmd('Input.dispatchMouseEvent',{type:'mouseMoved',x:20,y:20});await wait(()=>evaluate("document.querySelector('.defusal-display').dataset.controls==='visible'"));
  await evaluate('document.exitFullscreen()');await wait(()=>evaluate("!document.fullscreenElement&&document.querySelector('.display-fullscreen').getAttribute('aria-pressed')==='false'"));
  console.log('PASS: equal five-squad projector layout at 720p/1080p/4K, zero viewport/overlay clipping, scaled text, actual fullscreen entry/exit and automatic control hiding.');
 }else{
  await visit(base);await wait(()=>evaluate("!!document.querySelector('.captain-defusal')"));
  assert(!(await evaluate("!!document.querySelector('.captain-defusal input')")),'Code entry stays disabled before HQ starts');
  const data=await (await fetch(appOrigin+api,{headers:{cookie:organizerCookie}})).json();
  const start=await fetch(appOrigin+api,{method:'POST',headers:{cookie:organizerCookie,origin,'content-type':'application/json'},body:JSON.stringify({operation:'start',revision:data.revision,runRevision:data.runRevision,requestKey:crypto.randomUUID()})});assert.equal(start.status,200);
  await wait(()=>evaluate("!!document.querySelector('.captain-defusal input')"));
  await check('defusal-captain-pin',base);
  assert.equal(await evaluate("document.querySelector('.captain-defusal input').inputMode"),'numeric');
  assert(await evaluate("document.querySelector('.threat-tile video').src.endsWith('/red-alert.mp4')"));
  const fill=value=>evaluate(`(()=>{const input=document.querySelector('.captain-defusal input');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,${JSON.stringify(value)});input.dispatchEvent(new Event('input',{bubbles:true}));})()`);
  await fill('999999');await evaluate("document.querySelector('.captain-defusal form').requestSubmit()");await wait(()=>evaluate("document.querySelector('.captain-defusal').textContent.includes('Incorrect PIN')"));
  await new Promise(r=>setTimeout(r,1100));await fill('ab01x2345!6');assert.equal(await evaluate("document.querySelector('.captain-defusal input').value"),'012345');
  await evaluate("document.querySelector('.captain-defusal form').requestSubmit()");
  await wait(()=>evaluate("!!document.querySelector('.threat-defused')"));
  await wait(()=>evaluate("document.querySelector('.threat-defused video')?.videoWidth>0"));
  await check('defusal-captain-success',base);assert(!(await evaluate("!!document.querySelector('.captain-defusal input')")));
  const split=organizerCookie.indexOf('=');await cmd('Network.setCookie',{name:organizerCookie.slice(0,split),value:organizerCookie.slice(split+1),url:origin,httpOnly:true,secure:true,path:'/'});
  await pg.query('UPDATE "FinalChallenge" SET "deadlineAt"=$1 WHERE "eventId"=$2',[new Date(Date.now()-1000).toISOString(),event.id]);
  await check('defusal-display-expired',display);
  await wait(()=>evaluate("document.querySelectorAll('.threat-expired').length===4&&document.querySelectorAll('.threat-defused').length===1"));
  await wait(()=>evaluate("[...document.querySelectorAll('.threat-expired video')].some(v=>v.videoWidth>0)"));
  assert(!(await evaluate("!!document.querySelector('.defusal-display input,.defusal-display button:not([data-presentation-control=fullscreen])')")));
  assert.equal((await pg.query('SELECT count(*)::int n FROM "RaceFinalResult" WHERE "eventId"=$1',[event.id])).rows[0].n,5);
  console.log('PASS: real organizer configuration; captain automatic waiting/PIN/success screens; digits-only input; wrong retry; all five video overlays; valid red/neutralized/explosion playback; private display; mobile/desktop overflow and automatic expiry.');
 }
}

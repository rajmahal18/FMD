import assert from 'node:assert/strict';

export async function verifyRaceFlows({pg,prepareRace,command,race,cookies,aliceCookie,get}){
 const row=async(team,station)=>(await pg.query('SELECT * FROM "StationVisit" WHERE "teamId"=$1 AND "stationId"=$2',[team,station])).rows[0];
 const code=async station=>(await pg.query('SELECT "arrivalCode" FROM "Station" WHERE id=$1',[station])).rows[0].arrivalCode;
 const mission=async e=>(await get(`/api/events/${e}/mission`,cookies.agent)).json();
 for(const policy of ['PRESELECT_APPROVAL','SCAN_APPROVAL_TIMED','ARRIVAL_LINEUP_APPROVAL']){
  const g=await prepareRace(`Policy ${policy}`);
  for(const stationId of [g.s1,g.s2])await command('issueStationCode',{eventId:g.e,stationId});
  await pg.query('UPDATE "Station" SET "playersRequired"=1 WHERE "eventId"=$1',[g.e]);
  assert.equal((await command('updateRaceFlow',{eventId:g.e,arrivalPolicy:policy,previousPolicy:'CAPTAIN_CONFIRM',previousFinalStationId:''})).status,200);
  {const start=await race(g.e,'startEvent');assert.equal(start.status,200,JSON.stringify(start));}
  if(policy==='PRESELECT_APPROVAL'){
   assert.equal((await race(g.e,'saveLineup',{stationId:g.s1,playerIds:[g.mb]},cookies.agent)).status,400);
   assert.equal((await race(g.e,'saveLineup',{stationId:g.s1,playerIds:[g.ma]},cookies.agent)).status,200);
   assert.equal((await mission(g.e)).plannedLineups[g.s1][0],g.ma);
   assert.equal(await row(g.a,g.s1),undefined,'Advance submission must not count as arrival or start timing');
  }else assert.equal((await race(g.e,'saveLineup',{stationId:g.s1,playerIds:[g.ma]},cookies.agent)).status,409);
  const scanned=await race(g.e,'checkIn',{credential:await code(g.s1),...(policy==='ARRIVAL_LINEUP_APPROVAL'?{playerIds:[g.ma]}:{})},cookies.agent);
  assert.equal(scanned.status,200,JSON.stringify(scanned));assert.equal(scanned.state,'ARRIVED');
  const visit=await row(g.a,g.s1);assert(visit.arrivalAt);assert.equal(!!visit.startedAt,policy==='SCAN_APPROVAL_TIMED');
  assert.equal((await mission(g.e)).stations.find(s=>s.id===g.s1).briefing,'','Instructions remain hidden before play approval');
  assert.equal((await race(g.e,'startChallenge',{visitId:visit.id},cookies.facilitator)).status,409,'Facilitator cannot bypass approval');
  assert.equal((await race(g.e,'finishChallenge',{visitId:visit.id},cookies.facilitator)).status,409);
  if(policy==='SCAN_APPROVAL_TIMED'){
   const earlier=new Date(Date.now()-30000);await pg.query('UPDATE "StationVisit" SET "startedAt"=$2 WHERE id=$1',[visit.id,earlier.toISOString()]);const recordedStart=String((await row(g.a,g.s1)).startedAt);
   assert.equal((await race(g.e,'startChallenge',{visitId:visit.id,playerIds:[g.ma]},cookies.agent)).status,409);
   assert.equal((await race(g.e,'approveArrival',{visitId:visit.id},cookies.agent)).status,403);
   const key=crypto.randomUUID();assert.equal((await race(g.e,'approveArrival',{visitId:visit.id},cookies.facilitator,key)).status,200);
   assert.equal((await race(g.e,'approveArrival',{visitId:visit.id},cookies.facilitator,key)).replayed,true);
   assert.equal((await race(g.e,'approveArrival',{visitId:visit.id},cookies.facilitator)).status,409);
   assert.equal((await race(g.e,'startChallenge',{visitId:visit.id,playerIds:[g.ma]},cookies.agent)).status,200);
   assert.equal(String((await row(g.a,g.s1)).startedAt),recordedStart,'Lineup submission must not reset scan timing');
  }else{
   assert.equal((await race(g.e,'approveLineup',{visitId:visit.id},cookies.agent)).status,403);
   assert.equal((await race(g.e,'approveArrival',{visitId:visit.id},cookies.facilitator)).status,409);
   const key=crypto.randomUUID();assert.equal((await race(g.e,'approveLineup',{visitId:visit.id},cookies.facilitator,key)).status,200);
   assert.equal((await race(g.e,'approveLineup',{visitId:visit.id},cookies.facilitator,key)).replayed,true);
  }
  assert.equal((await row(g.a,g.s1)).state,'ACTIVE');
  assert.equal((await mission(g.e)).stations.find(s=>s.id===g.s1).briefing,'Meet the cipher handler.');
  const queued=await race(g.e,'checkIn',{credential:await code(g.s1),...(policy==='SCAN_APPROVAL_TIMED'?{}:{playerIds:[g.mb]})},aliceCookie);
  assert.equal(queued.state,'QUEUED');assert.equal((await row(g.b,g.s1)).startedAt,null,'Queue waiting is excluded');
  assert.equal((await race(g.e,'finishChallenge',{visitId:visit.id},cookies.facilitator)).status,200);
  assert.equal((await race(g.e,'confirmResult',{visitId:visit.id,successful:true},cookies.facilitator)).status,200);
  const admitted=await row(g.b,g.s1);assert.equal(admitted.state,'ARRIVED');assert.equal(!!admitted.startedAt,policy==='SCAN_APPROVAL_TIMED');
 }
 const g=await prepareRace('Shared HQ finale');
 for(const stationId of [g.s1,g.s2])await command('issueStationCode',{eventId:g.e,stationId});
 const config={eventId:g.e,arrivalPolicy:'ARRIVAL_LINEUP_APPROVAL',finalStationId:g.s2,previousPolicy:'CAPTAIN_CONFIRM',previousFinalStationId:''};
 assert.equal((await command('updateRaceFlow',config)).status,200);
 assert.equal((await command('updateRaceFlow',config)).status,409,'Stale settings cannot overwrite');
 {const start=await race(g.e,'startEvent');assert.equal(start.status,200,JSON.stringify(start));}
 assert.equal((await race(g.e,'startFinalStation',{},cookies.agent)).status,403);
 assert.equal((await race(g.e,'startFinalStation')).status,409,'No early shared start');
 assert.equal((await race(g.e,'checkIn',{credential:await code(g.s2)},aliceCookie)).status,409,'Final QR cannot bypass HQ gate');
 for(const [team,member,cookie] of [[g.a,g.ma,cookies.agent],[g.b,g.mb,aliceCookie]]){
  assert.equal((await race(g.e,'checkIn',{credential:await code(g.s1),playerIds:[member]},cookie)).status,200);
  const visit=await row(team,g.s1);assert.equal((await race(g.e,'approveLineup',{visitId:visit.id},cookies.facilitator)).status,200);
  await race(g.e,'finishChallenge',{visitId:visit.id},cookies.facilitator);
  assert.equal((await race(g.e,'confirmResult',{visitId:visit.id,successful:true},cookies.facilitator)).status,200);
  if(team===g.a)assert.equal((await race(g.e,'startFinalStation')).status,409,'One completed team does not unlock finale');
 }
 const before=await mission(g.e);assert(before.finalStation.ready);assert(!before.view.progress.unlocked.includes(g.s2));
 const key=crypto.randomUUID();assert.equal((await race(g.e,'startFinalStation',{},cookies.organizer,key)).status,200);
 assert.equal((await race(g.e,'startFinalStation',{},cookies.organizer,key)).replayed,true);
 assert.equal((await race(g.e,'startFinalStation')).status,409);
 const a=await row(g.a,g.s2),b=await row(g.b,g.s2);assert.equal(new Date(a.startedAt).getTime(),new Date(b.startedAt).getTime());
 assert.equal((await pg.query('SELECT COUNT(*)::int AS n FROM "StationVisitPlayer" WHERE "visitId" IN ($1,$2)',[a.id,b.id])).rows[0].n,2);
 await race(g.e,'finishChallenge',{visitId:a.id},cookies.facilitator);
 assert.equal((await race(g.e,'confirmResult',{visitId:a.id,successful:true,points:500},cookies.facilitator)).status,400);
 const success=await race(g.e,'confirmResult',{visitId:a.id,successful:true},cookies.facilitator);assert.equal(success.resultPoints,100,JSON.stringify(success));
 await pg.query('UPDATE "Event" SET "finalStartedAt"=$2,"finalDeadlineAt"=$3 WHERE id=$1',[g.e,new Date(Date.now()-120000).toISOString(),new Date(Date.now()-60000).toISOString()]);
 await race(g.e,'finishChallenge',{visitId:b.id},cookies.facilitator);
 assert.equal((await race(g.e,'confirmResult',{visitId:b.id,successful:true},cookies.facilitator)).status,409);
 const failed=await race(g.e,'confirmResult',{visitId:b.id,successful:false},cookies.facilitator);assert.equal(failed.resultPoints,50,JSON.stringify(failed));
 assert.equal((await mission(g.e)).view.status,'COMPLETE');
 await assert.rejects(()=>pg.query('UPDATE "StationOutcome" SET "isFinal"=false WHERE "visitId"=$1',[b.id]),'Regular failure cannot receive final-only 50-point credit');
 await pg.query('UPDATE "Event" SET "hideStationDetails"=true WHERE id=$1',[g.e]);const hidden=await mission(g.e);assert.equal(hidden.finalStation,null);assert.deepEqual(hidden.plannedLineups,{});assert.deepEqual(hidden.stations,[]);
 console.log('PASS: arrival policies, advance lineups, approval permissions/order, immutable scan timing, queue exclusion, shared all-team HQ gate/countdown/replay, fixed final 100/50 and deadline enforcement.');
}

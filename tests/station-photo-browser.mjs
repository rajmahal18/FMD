import assert from 'node:assert/strict';
export async function stationPhotoBrowser({role,pg,event,evaluate,visit,check,cookie,origin,appOrigin,password}){
 const stationId='demo-cipher-room',base=`/api/events/${event.id}`,endpoint=base+`/stations/${stationId}/photo`,settings=`/events/${event.id}/stations`;
 const wait=async fn=>{for(let i=0;i<100;i++){if(await fn())return;await new Promise(r=>setTimeout(r,100));}throw Error('Station photo update timed out');};
 const savedKey=async()=>(await pg.query('SELECT "photoKey" FROM "Station" WHERE id=$1',[stationId])).rows[0].photoKey;
 if(role==='organizer'){
  const setup=`(async()=>{const c=document.createElement('canvas');c.width=600;c.height=300;const ctx=c.getContext('2d');ctx.fillStyle='#12405c';ctx.fillRect(0,0,600,300);ctx.fillStyle='#e9bd64';ctx.fillRect(450,50,100,200);const blob=await new Promise(r=>c.toBlob(r,'image/png'));const dt=new DataTransfer();dt.items.add(new File([blob],'station.png',{type:'image/png'}));const input=document.querySelector('.station-photo-editor input[type=file]');input.files=dt.files;input.dispatchEvent(new Event('change',{bubbles:true}));for(let i=0;i<50&&!document.querySelector('.station-photo-preview');i++)await new Promise(r=>setTimeout(r,50));document.querySelector('.station-photo-editor').scrollIntoView({block:'center'});})()`;
  await check('station-photo-upload',settings,setup);
  assert(await evaluate("document.querySelector('.station-photo-preview').naturalWidth===600"));
  await evaluate("[...document.querySelectorAll('.station-photo-editor button')].find(b=>b.textContent==='Save photo').click()");
  await wait(savedKey);const key=await savedKey();await wait(()=>evaluate("!document.querySelector('.station-photo-preview')"));
  await check('station-photo-saved',settings,"document.querySelector('.station-photo-editor').scrollIntoView({block:'center'})");
  const photo=await fetch(appOrigin+endpoint+'?v='+key,{headers:{cookie}});assert.equal(photo.status,200);assert.equal(photo.headers.get('content-type'),'image/webp');
  const bytes=await photo.arrayBuffer(),post=(data=bytes,version=key,session=cookie,reqOrigin=origin,path=endpoint)=>fetch(appOrigin+path,{method:'POST',headers:{origin:reqOrigin,cookie:session,'x-photo-version':version},body:data});
  assert.equal((await fetch(appOrigin+endpoint)).status,401);
  assert.equal((await post('not an image')).status,400);
  assert.equal((await post(new Uint8Array(5*1024*1024+1))).status,413);
  assert.equal((await post(bytes,'')).status,409);
  assert.equal((await post(bytes,key,cookie,'https://other.invalid')).status,403);
  assert.equal((await post(bytes,key,cookie,origin,endpoint.replace(stationId,'missing'))).status,404);
  for(const actor of ['agent','facilitator']){
   const login=await fetch(appOrigin+'/api/auth/login',{method:'POST',headers:{origin,'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({email:actor+'@example.test',password}),redirect:'manual'}),session=login.headers.get('set-cookie').split(';')[0];
   assert.equal((await fetch(appOrigin+endpoint,{headers:{cookie:session}})).status,200);
   assert.equal((await post(bytes,key,session)).status,403);
   if(actor==='agent'){
    await pg.query('UPDATE "Event" SET "hideStationDetails"=true WHERE id=$1',[event.id]);
    assert.equal((await fetch(appOrigin+endpoint,{headers:{cookie:session}})).status,404);
    const mission=await (await fetch(appOrigin+base+'/mission',{headers:{cookie:session}})).json();assert.deepEqual(mission.stations,[]);
    await pg.query('UPDATE "Event" SET "hideStationDetails"=false WHERE id=$1',[event.id]);
   }
  }
  await pg.query('UPDATE "Event" SET "archivedAt"=now() WHERE id=$1',[event.id]);assert.equal((await post()).status,409);await pg.query('UPDATE "Event" SET "archivedAt"=NULL WHERE id=$1',[event.id]);
  await pg.query('INSERT INTO "Station" (id,"eventId",name,location,briefing) VALUES ($1,$2,$3,$4,$5)',['photo-private-station',event.id,'Not on this route','Test','Physical game']);
  const outside=endpoint.replace(stationId,'photo-private-station');assert.equal((await post(bytes,'',cookie,origin,outside)).status,200);
  const agentLogin=await fetch(appOrigin+'/api/auth/login',{method:'POST',headers:{origin,'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({email:'agent@example.test',password}),redirect:'manual'}),agentCookie=agentLogin.headers.get('set-cookie').split(';')[0];
  assert.equal((await fetch(appOrigin+outside,{headers:{cookie:agentCookie}})).status,404);
  const member=(await pg.query('SELECT id FROM "EventMembership" WHERE "eventId"=$1 AND "userId"=(SELECT id FROM "User" WHERE email=$2)',[event.id,'agent@example.test'])).rows[0];
  const switched=await fetch(appOrigin+'/api/auth/switch-account',{method:'POST',headers:{origin,cookie,'content-type':'application/json'},body:JSON.stringify({eventId:event.id,membershipId:member.id})});assert.equal(switched.status,200);
  const switchedCookie=switched.headers.getSetCookie().find(c=>c.startsWith('__Host-spy-session=')).split(';')[0];assert.equal((await fetch(appOrigin+endpoint,{headers:{cookie:switchedCookie}})).status,200);
  assert.equal((await post(bytes,key)).status,200);assert.notEqual(await savedKey(),key);assert.equal((await fetch(appOrigin+endpoint+'?v='+key,{headers:{cookie}})).status,404);
 }else{
  const path=role==='agent'?`/events/${event.id}`:`/events/${event.id}/field`;
  await check('station-photo-'+role,path,role==='facilitator'?"[...document.querySelectorAll('.field-header details')].find(d=>d.querySelector('summary')?.textContent==='Location photo').open=true":undefined);
  assert(await evaluate("[...document.querySelectorAll('.station-location-photo img')].some(i=>i.complete&&i.naturalWidth===600&&i.naturalHeight===300)"));
  if(role==='agent'){
   await evaluate("document.querySelector('.mission-support details').open=true");
   await wait(()=>evaluate("!!document.querySelector('.station-tiles button')"));await evaluate("document.querySelector('.station-tiles button').click()");
   await wait(()=>evaluate("!!document.querySelector('.station-detail-modal[open] .station-location-photo img')"));
  }else{
   const key=await savedKey();
   const organizer=await fetch(appOrigin+'/api/auth/login',{method:'POST',headers:{origin,'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({email:'organizer@example.test',password}),redirect:'manual'}),session=organizer.headers.get('set-cookie').split(';')[0];
   assert.equal((await fetch(appOrigin+endpoint,{method:'DELETE',headers:{cookie:session,origin,'x-photo-version':key}})).status,200);
   assert.equal(await savedKey(),null);assert.equal((await fetch(appOrigin+endpoint,{headers:{cookie}})).status,404);
   console.log('PASS: station photo upload/preview/replace/remove; full landscape in participant destination/details and faci; 320–1440px layouts; permissions, hidden stations, assigned routes, stale versions, image validation and account switching.');
  }
 }
}

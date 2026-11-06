import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {shareResult} from './result-sharing-helpers.mjs';
let organizerCookie;
export async function meetingVotingBrowser({role,cookie,pg,event,evaluate,visit,check,origin,appOrigin}){
 const base=`/events/${event.id}`,api=`/api/events/${event.id}`,contact=base+'/contact',voting=base+'/voting';
 const wait=async test=>{for(let i=0;i<150;i++){if(await test())return;await new Promise(r=>setTimeout(r,100));}throw Error('Meeting voting browser timed out');};
 const post=async body=>{const r=await fetch(appOrigin+api+'/voting',{method:'POST',headers:{cookie:organizerCookie,origin,'content-type':'application/json'},body:JSON.stringify({...body,requestKey:crypto.randomUUID()})});const result=await r.json();assert.equal(r.status,200,JSON.stringify(result));return result;};
 if(role==='organizer'){
  organizerCookie=cookie;
  const first=(await pg.query('SELECT m."teamId" FROM "EventMembership" m JOIN "User" u ON u.id=m."userId" WHERE m."eventId"=$1 AND u.email=$2',[event.id,'agent@example.test'])).rows[0].teamId;
  await pg.query('UPDATE "User" SET sex=$1 WHERE email=$2',['M','agent@example.test']);
  await pg.query('UPDATE "Event" SET state=$1 WHERE id=$2',['FINALIZED',event.id]);
  for(const [id,sex,code] of [['meeting-male','M','91827364'],['meeting-female','F','91827365'],['meeting-female-two','F','91827366']]){
   await pg.query('INSERT INTO "User" (id,email,name,sex,"passwordHash") SELECT $1,$2,$3,$4,"passwordHash" FROM "User" WHERE email=$5',[id,id+'@example.test',id+' with a long agent name',sex,'agent@example.test']);
   await pg.query('INSERT INTO "EventMembership" (id,"eventId","userId",role,"teamId") VALUES ($1,$2,$1,$3,$4)',[id,event.id,'PARTICIPANT',first]);
   const hash=v=>createHash('sha256').update(v).digest('hex');
   await pg.query('INSERT INTO "ContactCredential" (id,"eventId","issuerMembershipId","tokenHash","codeHash","expiresAt") VALUES ($1,$2,$3,$4,$5,$6)',['credential-'+id,event.id,id,hash(id),hash(`contact-code:${event.id}:${code}`),new Date(Date.now()+3600000).toISOString()]);
  }
  await pg.query('INSERT INTO "ContactPolicy" (id,"eventId",mode,"sameTeamAllowed","outgoingLimit","mutualConfirmation","reciprocityAllowed",visibility,"tieRule",enabled,"opensAt","closesAt") VALUES ($1,$2,$3,true,40,true,true,$4,$5,true,$6,$7)',['meeting-policy',event.id,'INTERACTION','PUBLIC','SHARED',new Date(Date.now()-60000).toISOString(),new Date(Date.now()+3600000).toISOString()]);
  const prepare="(async()=>{[...document.querySelectorAll('button')].find(b=>b.textContent==='Create voting event').click();await new Promise(r=>setTimeout(r,50));const select=document.querySelector('.voting-editor select');Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set.call(select,'MET_AGENTS');select.dispatchEvent(new Event('change',{bubbles:true}));})()";
  await check('meeting-vote-setup',base+'/voting-settings',prepare);
  assert.equal(await evaluate("document.querySelector('.voting-editor input[maxlength]').value"),'Most Congenial - Male & Female');
  assert(!(await evaluate("!!document.querySelector('.voting-candidate-setup')")));
  await evaluate("(()=>{const inputs=document.querySelectorAll('.voting-editor input[type=datetime-local]');for(let i=0;i<2;i++){const d=new Date(Date.now()+(i?3600000:-60000));Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(inputs[i],new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,16));inputs[i].dispatchEvent(new Event('input',{bubbles:true}));inputs[i].dispatchEvent(new Event('change',{bubbles:true}));}})()");
  await evaluate("document.querySelector('.voting-editor button[type=submit]').click()");
  assert(await evaluate("document.body.textContent.includes('Saving activates mutual Agents I met')"));
  await evaluate("[...document.querySelectorAll('button')].find(b=>b.textContent==='Save voting event').click()");
  await wait(async()=>(await pg.query('SELECT count(*)::int n FROM "VotingEvent" WHERE "eventId"=$1',[event.id])).rows[0].n===1);
  const poll=(await pg.query('SELECT id,revision FROM "VotingEvent" WHERE "eventId"=$1',[event.id])).rows[0];
  assert.equal((await pg.query('SELECT "mutualConfirmation" FROM "ContactPolicy" WHERE "eventId"=$1',[event.id])).rows[0].mutualConfirmation,false);
  await post({operation:'setEnabled',id:poll.id,revision:poll.revision,enabled:true});
 }else{
  await check('meeting-vote-empty-list',contact,"[...document.querySelectorAll('.contact-mode-tabs button')].find(b=>b.textContent.startsWith('Agents I met')).click()");
  assert(await evaluate("document.querySelector('.met-agent-list').textContent.includes('No vote is cast')"));
  for(const code of ['91827364','91827365']){
   await visit(contact+'?code='+code);
   await evaluate("[...document.querySelectorAll('button')].find(b=>b.textContent==='Verify agent').click()");
   await wait(()=>evaluate("[...document.querySelectorAll('button')].some(b=>b.textContent==='Add to Agents I met')"));
   await evaluate("[...document.querySelectorAll('button')].find(b=>b.textContent==='Add to Agents I met').click()");
   await wait(async()=>(await pg.query('SELECT count(*)::int n FROM "ContactRecord" WHERE "eventId"=$1',[event.id])).rows[0].n===(code==='91827364'?1:2));
  }
  assert.equal((await pg.query('SELECT count(*)::int n FROM "VotingBallot" WHERE "eventId"=$1',[event.id])).rows[0].n,0);
  await pg.query('UPDATE "ContactPolicy" SET enabled=false WHERE "eventId"=$1',[event.id]);
  await check('meeting-vote-closed-scanning-list',contact);assert.equal(await evaluate("document.querySelectorAll('.met-agent-list .list-row').length"),2);
  await check('meeting-vote-personal-ballot',voting);assert.equal(await evaluate("document.querySelectorAll('.voting-category-male input').length"),1);assert.equal(await evaluate("document.querySelectorAll('.voting-category-female input').length"),1);
  await evaluate("(async()=>{document.querySelector('.voting-category-male input').click();await new Promise(r=>setTimeout(r,30));[...document.querySelectorAll('button')].find(b=>b.textContent==='Next: choose Female')?.click();await new Promise(r=>setTimeout(r,30));document.querySelector('.voting-category-female input').click();await new Promise(r=>setTimeout(r,30));document.querySelector('.category-ballot button[type=submit]').click();})()");
  await evaluate("[...document.querySelectorAll('button')].find(b=>b.textContent==='Submit final ballot').click()");
  await wait(async()=>(await pg.query('SELECT count(*)::int n FROM "VotingBallot" WHERE "eventId"=$1',[event.id])).rows[0].n===1);
  await check('meeting-vote-receipt',voting);assert.equal(await evaluate("document.querySelectorAll('.voting-receipt .category-choices>div').length"),2);
  const poll=(await pg.query('SELECT id,revision FROM "VotingEvent" WHERE "eventId"=$1',[event.id])).rows[0];
  await post({operation:'setEnabled',id:poll.id,revision:poll.revision,enabled:false});await post({operation:'publish',id:poll.id,revision:poll.revision+1});
  await shareResult({origin:appOrigin,requestOrigin:origin,eventId:event.id,cookie:organizerCookie,key:'voting:'+poll.id});
  await check('meeting-vote-shared-results',voting);assert.equal(await evaluate("document.querySelectorAll('.voting-result-category').length"),2);
  assert.equal((await pg.query('SELECT state FROM "Event" WHERE id=$1',[event.id])).rows[0].state,'FINALIZED');
 }
 console.log('PASS: '+role+' mutual meeting setup, post-race scanning, private list, scan-without-votes, met-only Male/Female ballot, receipt/results and responsive layouts.');
}

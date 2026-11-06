import assert from 'node:assert/strict';
export async function easyVotingBrowser({role,pg,event,evaluate,visit,check}){
 const url=`/events/${event.id}/voting`,wait=async test=>{for(let i=0;i<100;i++){if(await test())return;await new Promise(r=>setTimeout(r,100));}throw Error('Easy voting browser timed out');};
 const click=label=>evaluate(`[...document.querySelectorAll('button')].filter(b=>b.getClientRects().length).find(b=>b.textContent===${JSON.stringify(label)})?.click()`);
 if(role==='organizer'){
  const members=(await pg.query('SELECT m.id,m.role FROM "EventMembership" m WHERE m."eventId"=$1',[event.id])).rows,agent=members.find(m=>m.role==='PARTICIPANT').id,faci=members.find(m=>m.role==='FACILITATOR').id;
  for(const id of ['easy-male','easy-female','easy-female-two']){await pg.query('INSERT INTO "User" (id,email,name,sex,"passwordHash") SELECT $1,$2,$3,$4,"passwordHash" FROM "User" WHERE email=$5',[id,id+'@example.test',id+' with a long candidate name',id==='easy-male'?'M':'F','agent@example.test']);await pg.query('INSERT INTO "EventMembership" (id,"eventId","userId",role) VALUES ($1,$2,$1,$3)',[id,event.id,'PARTICIPANT']);}
  const config={voterMode:'PARTICIPANTS',voterRoles:[],voterTeamIds:[],voterMembershipIds:[],candidateIds:[agent,'easy-male','easy-female','easy-female-two'],maxChoices:1,allowSelf:false,allowSameTeam:true};
  for(const [id,name,c,enabled] of [['easy-single','Showstealer',config,true],['easy-category','Agents of the Night',{...config,maxChoices:2,categories:[{id:'MALE',name:'Male',candidateIds:[agent,'easy-male']},{id:'FEMALE',name:'Female',candidateIds:['easy-female','easy-female-two']}]},true],['easy-closed','Not open award',config,false],['easy-handler','Handler award',{...config,voterMode:'PEOPLE',voterMembershipIds:[faci]},true]])await pg.query('INSERT INTO "VotingEvent" (id,"eventId",name,config,"opensAt","closesAt",enabled) VALUES ($1,$2,$3,$4,$5,$6,$7)',[id,event.id,name,JSON.stringify(c),new Date(Date.now()-60000).toISOString(),new Date(Date.now()+3600000).toISOString(),enabled]);
  await check('easy-vote-organizer-controls',url);assert(await evaluate("[...document.querySelectorAll('button')].some(b=>b.textContent==='Close voting')"));return;
 }
 if(role==='facilitator'){
  await check('easy-vote-handler-only',url);assert.equal(await evaluate("document.querySelectorAll('.award-option').length"),1);assert(await evaluate("document.querySelector('.easy-voting-panel:not([hidden]) h2').textContent==='Handler award'"));assert(!(await evaluate("!!document.querySelector('.voting-management')")));
  await evaluate("document.querySelector('.easy-voting-panel:not([hidden]) .voting-candidate input').click()");await click('Review ballot');await click('Submit final ballot');
  await wait(()=>evaluate("!!document.querySelector('.voting-receipt')"));assert(await evaluate("document.querySelector('.voting-receipt').textContent.includes('You are done')"));return;
 }
 await check('easy-vote-award-menu',url);assert.equal(await evaluate("document.querySelectorAll('.award-option').length"),3);assert(!(await evaluate("!!document.querySelector('.record-tabs')")));
 await evaluate("[...document.querySelectorAll('.award-option')].find(b=>b.textContent.includes('Not open award')).click()");assert(!(await evaluate("[...document.querySelectorAll('.voting-ballot')].some(f=>f.getClientRects().length)")));await click('Back to all awards');
 await evaluate("[...document.querySelectorAll('.award-option')].find(b=>b.textContent.includes('Agents of the Night')).click()");
 assert.equal(await evaluate("[...document.querySelectorAll('.voting-category')].filter(s=>s.getClientRects().length).length"),1);assert(await evaluate("document.querySelector('.voting-category-male').getClientRects().length>0"));
 await evaluate("document.querySelector('.voting-category-male input').click()");await click('Next: choose Female');assert(await evaluate("document.querySelector('.voting-category-female').getClientRects().length>0"));
 await evaluate("document.querySelector('.voting-category-female input').click()");await click('Back to all awards');
 await evaluate("[...document.querySelectorAll('.award-option')].find(b=>b.textContent.includes('Showstealer')).click()");await evaluate("document.querySelector('.easy-voting-panel:not([hidden]) .voting-candidate input').click()");await click('Back to all awards');
 await evaluate("[...document.querySelectorAll('.award-option')].find(b=>b.textContent.includes('Agents of the Night')).click()");
 assert.equal(await evaluate("document.querySelectorAll('.category-ballot input:checked').length"),2);await click('Review both votes');assert.equal(await evaluate("document.querySelectorAll('.voting-ballot-review .category-choices>div').length"),2);await click('Edit choices');await click('Review both votes');
 await evaluate("(()=>{const original=window.fetch.bind(window);let drop=true;window.fetch=async(...args)=>{const response=await original(...args);if(drop&&String(args[0]).endsWith('/voting')&&args[1]?.method==='POST'){drop=false;throw Error('Test response interrupted');}return response;};})()");
 await click('Submit final ballot');await wait(()=>evaluate("!!document.querySelector('.voting-pending')"));
 assert.equal((await pg.query('SELECT count(*)::int n FROM "VotingBallot" WHERE "votingEventId"=$1',['easy-category'])).rows[0].n,1);
 await click('Check submission');await wait(()=>evaluate("!document.querySelector('.voting-pending')&&!!document.querySelector('.voting-receipt')"));
 assert.equal((await pg.query('SELECT count(*)::int n FROM "VotingBallot" WHERE "votingEventId"=$1',['easy-category'])).rows[0].n,1);
 await check('easy-vote-submitted-receipt',url,"[...document.querySelectorAll('.award-option')].find(b=>b.textContent.includes('Agents of the Night')).click()");
 console.log('PASS: clear award menu and closed state; assigned facilitator only; Male/Female steps; selections retained between awards; review/edit; interrupted response retry without duplicate ballot; confirmed receipt and responsive layouts.');
}

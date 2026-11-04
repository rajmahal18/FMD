import assert from 'node:assert/strict';
let organizerCookie;
export async function categoryVotingBrowser({role,cookie,pg,event,evaluate,visit,check,appOrigin,origin}){
 const setup='/events/'+event.id+'/voting-settings',url='/events/'+event.id+'/voting';
 const wait=async test=>{for(let i=0;i<100;i++){if(await test())return;await new Promise(r=>setTimeout(r,100));}throw Error('Category voting browser action timed out');};
 const post=async body=>{const r=await fetch(appOrigin+'/api/events/'+event.id+'/voting',{method:'POST',headers:{cookie:organizerCookie,origin,'content-type':'application/json'},body:JSON.stringify({...body,requestKey:crypto.randomUUID()})});assert.equal(r.status,200,await r.text());};
 if(role==='organizer'){
  organizerCookie=cookie;
  await pg.query('UPDATE "User" SET sex=$1 WHERE email=$2',['M','agent@example.test']);
  for(const id of ['male-one','male-two','female-one','female-two']){await pg.query('INSERT INTO "User" (id,email,name,sex,"passwordHash") SELECT $1,$2,$3,$4,"passwordHash" FROM "User" WHERE email=$5',[id,id+'@example.test',id.replaceAll('-',' ')+' with a long candidate name',id.startsWith('female')?'F':'M','agent@example.test']);await pg.query('INSERT INTO "EventMembership" (id,"eventId","userId",role) VALUES ($1,$2,$1,$3)',[id,event.id,'PARTICIPANT']);}
  const prepare="(async()=>{[...document.querySelectorAll('button')].find(b=>b.textContent==='Create voting event').click();await new Promise(r=>setTimeout(r,50));const select=document.querySelector('.voting-editor select');Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set.call(select,'MALE_FEMALE');select.dispatchEvent(new Event('change',{bubbles:true}));await new Promise(r=>setTimeout(r,50));[...document.querySelectorAll('button')].find(b=>b.textContent==='Select all participants').click();})()";
  await check('category-voting-setup',setup,prepare);
  assert.equal(await evaluate("document.querySelector('.voting-editor input[maxlength]').value"),'Agents of the Night');
  assert.equal(await evaluate("document.querySelectorAll('.candidate-category-label select').length"),5);
  await evaluate("(()=>{const inputs=document.querySelectorAll('.voting-editor input[type=datetime-local]');for(let i=0;i<2;i++){const d=new Date(Date.now()+(i?3600000:-60000)),value=new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,16);Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(inputs[i],value);inputs[i].dispatchEvent(new Event('input',{bubbles:true}));inputs[i].dispatchEvent(new Event('change',{bubbles:true}));}})()");
  await evaluate("document.querySelector('.voting-editor button[type=submit]').click()");
  assert(await evaluate("document.body.textContent.includes('Review voting configuration')"));
  assert.equal(await evaluate("document.querySelectorAll('.voting-category-review details').length"),2);
  await evaluate("[...document.querySelectorAll('button')].find(b=>b.textContent==='Save voting event').click()");
  await wait(async()=>(await pg.query('SELECT id FROM "VotingEvent" WHERE "eventId"=$1',[event.id])).rows.length===1);
  const poll=(await pg.query('SELECT id,revision FROM "VotingEvent" WHERE "eventId"=$1',[event.id])).rows[0];
  await post({operation:'setEnabled',id:poll.id,revision:poll.revision,enabled:true});
 }else{
  await check('category-voting-ballot',url);
  assert.equal(await evaluate("document.querySelectorAll('.voting-category').length"),2);
  await evaluate("document.querySelector('.voting-category-male input').click()");
  assert(await evaluate("document.querySelector('.category-ballot button[type=submit]').disabled"));
  await check('category-voting-review',url,"document.querySelector('.voting-category-male input').click();document.querySelector('.voting-category-female input').click();document.querySelector('.category-ballot button[type=submit]').click()");
  assert.equal(await evaluate("document.querySelectorAll('.category-choices>div').length"),2);
  await evaluate("[...document.querySelectorAll('button')].find(b=>b.textContent==='Submit final ballot').click()");
  const id=(await pg.query('SELECT id FROM "VotingEvent" WHERE "eventId"=$1',[event.id])).rows[0].id;
  await wait(async()=>(await pg.query('SELECT count(*)::int AS n FROM "VotingBallot" WHERE "votingEventId"=$1',[id])).rows[0].n===1);
  await check('category-voting-receipt',url);assert.equal(await evaluate("document.querySelectorAll('.voting-receipt .category-choices>div').length"),2);assert(!(await evaluate("!!document.querySelector('.voting-results')")));
  await post({operation:'setEnabled',id,revision:2,enabled:false});await post({operation:'publish',id,revision:3});
  await check('category-voting-published',url);assert.equal(await evaluate("document.querySelectorAll('.voting-result-category').length"),2);assert.equal(await evaluate("document.querySelectorAll('.voting-results li .voting-rank').length"),5);
 }
 console.log('PASS: '+role+' category voting setup/ballot/review, single atomic submission, private receipt, separate published results and mobile layouts.');
}

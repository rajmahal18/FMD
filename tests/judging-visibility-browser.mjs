import assert from 'node:assert/strict';
export async function judgingVisibilityBrowser({role,pg,event,evaluate,visit,check}){
 const base='/events/'+event.id,results=base+'/judging?view=results';
 const wait=async fn=>{for(let i=0;i<220;i++){if(await fn())return;await new Promise(r=>setTimeout(r,100));}throw Error('Automatic standings update timed out');};
 if(role==='organizer'){
  const judge=(await pg.query('SELECT m.id FROM "EventMembership" m JOIN "User" u ON u.id=m."userId" WHERE m."eventId"=$1 AND u.email=$2',[event.id,'facilitator@example.test'])).rows[0].id;
  await pg.query('INSERT INTO "User" (id,email,name,"passwordHash") SELECT $1,$2,$3,"passwordHash" FROM "User" WHERE email=$4',['visibility-browser-judge2','visibility-judge2@example.test','Private second judge','facilitator@example.test']);
  await pg.query('INSERT INTO "EventMembership" (id,"eventId","userId",role) VALUES ($1,$2,$1,$3)',['visibility-browser-judge2',event.id,'FACILITATOR']);
  await pg.query('INSERT INTO "Team" (id,"eventId",name) VALUES ($1,$2,$3)',['visibility-browser-team2',event.id,'Second squad with a long name']);
  const teams=(await pg.query('SELECT id FROM "Team" WHERE "eventId"=$1 ORDER BY id LIMIT 2',[event.id])).rows.map(r=>r.id);
  const config={target:'TEAM',candidateIds:teams,criteria:[{id:'impact',name:'Impact',description:'',maximum:100}]};
  await pg.query('INSERT INTO "JudgingContest" (id,"eventId",name,config,state,"facilitatorVisibility","participantVisibility") VALUES ($1,$2,$3,$4,$5,$6,$7)',['visibility-browser',event.id,'Gala showcase standings',JSON.stringify(config),'OPEN','LIVE','HIDDEN']);
  for(const memberId of [judge,'visibility-browser-judge2'])await pg.query('INSERT INTO "JudgingAssignment" ("eventId","contestId","membershipId") VALUES ($1,$2,$3)',[event.id,'visibility-browser',memberId]);
  for(let i=0;i<teams.length;i++)await pg.query('INSERT INTO "JudgingScore" (id,"eventId","contestId","judgeMembershipId","candidateId",scores,"totalHundredths","submittedAt","updatedAt") VALUES ($1,$2,$3,$4,$5,$6,$7,NOW(),NOW())',['partial-'+i,event.id,'visibility-browser',judge,teams[i],JSON.stringify({impact:80-i*20}),(80-i*20)*100]);
  await pg.query('UPDATE "OverallRanking" SET config=$1,finalized=NULL WHERE "eventId"=$2',[JSON.stringify({raceRule:'POINTS',events:[{id:'gala',name:'Gala',source:'JUDGING',contestId:'visibility-browser',weight:100,credits:[100,90],ranks:{}}]}),event.id]);
  await check('judging-visibility-controls',base+'/judging',"document.querySelector('.judging-visibility').open=true");
  await evaluate("(()=>{const section=[...document.querySelectorAll('.judging-visibility section')].find(s=>s.querySelector('h4').textContent==='Participants');section.querySelectorAll('input')[0].click();section.querySelectorAll('input')[1].click();[...document.querySelectorAll('button')].find(b=>b.textContent==='Save results visibility').click();})()");
  await wait(async()=>(await pg.query('SELECT "participantVisibility" FROM "JudgingContest" WHERE id=$1',['visibility-browser'])).rows[0].participantVisibility==='LIVE');
  assert.equal((await pg.query('SELECT revision FROM "JudgingContest" WHERE id=$1',['visibility-browser'])).rows[0].revision,1);
  await check('judging-live-overall',base+'/overall',"[...document.querySelectorAll('[role=tab]')].find(t=>t.textContent==='Team standings').click()");
  assert(await evaluate("document.querySelector('#overall-standings').textContent.includes('80%')"));
  await visit(base+'/ranking-settings');
  await evaluate("(()=>{const input=document.querySelector('.overall-event input[maxlength]');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,'Unsaved gala label');input.dispatchEvent(new Event('input',{bubbles:true}));[...document.querySelectorAll('[role=tab]')].find(t=>t.textContent==='Team standings').click();})()");
  for(let i=0;i<teams.length;i++)await pg.query('INSERT INTO "JudgingScore" (id,"eventId","contestId","judgeMembershipId","candidateId",scores,"totalHundredths","submittedAt","updatedAt") VALUES ($1,$2,$3,$4,$5,$6,$7,NOW(),NOW())',['complete-'+i,event.id,'visibility-browser','visibility-browser-judge2',teams[i],JSON.stringify({impact:90-i*20}),(90-i*20)*100]);
  await wait(()=>evaluate("document.querySelector('#overall-standings').textContent.includes('85%')"));
  assert(await evaluate("document.querySelector('.overall-event input[maxlength]').value==='Unsaved gala label'"),'Live score refresh must preserve unsaved configuration');
  await visit(base+'/overall');
  assert(await evaluate("[...document.querySelectorAll('button')].find(b=>b.textContent==='Finalize overall results').disabled"));
  await check('judging-complete-unpublished',base+'/judging');assert(await evaluate("document.querySelector('.judging-results h3').textContent==='Complete standings'"));
  // Verify organizer judging itself polls without a manual refresh.
  await pg.query('UPDATE "JudgingScore" SET "totalHundredths"=10000,scores=$1 WHERE id=$2',[JSON.stringify({impact:100}),'complete-0']);
  await wait(()=>evaluate("[...document.querySelectorAll('.judging-average')].some(e=>e.textContent.includes('90.00'))"));
 }else if(role==='facilitator'){
  await check('judging-facilitator-work',base+'/judging');assert(await evaluate("!!document.querySelector('.judging-score-sheet')&&!document.querySelector('.judging-shared-results').open"));
  await check('judging-facilitator-standings',results);assert(!(await evaluate("!!document.querySelector('.judging-score-sheet')")));
  await evaluate("document.querySelector('.judging-result-row').click()");assert(!(await evaluate("!!document.querySelector('.judging-breakdown')")));await evaluate("document.querySelector('.judging-dialog button').click()");
  await visit(base);await evaluate("document.querySelector('.player-account').open=true");assert(await evaluate("!!document.querySelector('.player-account-menu a[href$=\"/judging?view=results\"]')"));
 }else{
  await check('judging-participant-visible',results);assert(await evaluate("!!document.querySelector('.judging-result-row')"));assert(!(await evaluate("!!document.querySelector('.judging-visibility,.judging-score-sheet')")));
  await pg.query('UPDATE "JudgingContest" SET "participantVisibility"=$1,"visibilityRevision"="visibilityRevision"+1 WHERE id=$2',['HIDDEN','visibility-browser']);
  await wait(()=>evaluate("!document.querySelector('.judging-result-row')"));assert(await evaluate("document.body.textContent.includes('No judging results are shared with you yet.')"));
  await check('judging-participant-hidden',results);
 }
 console.log('PASS: '+role+' result visibility UI, submitted-score auto refresh, secondary facilitator standings and mobile layouts.');
}

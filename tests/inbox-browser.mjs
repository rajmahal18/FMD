import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
export async function inboxBrowser({role,pg,event,evaluate,visit,check,cmd}){
 const base=`/events/${event.id}/inbox`;
 if(role==='organizer'){
  await pg.query('INSERT INTO "InboxMessage" (id,"eventId","recipientId","senderName",subject,body) SELECT $1,$2,m.id,$3,$4,$5 FROM "EventMembership" m JOIN "User" u ON u.id=m."userId" WHERE m."eventId"=$2 AND u.email=$6 ON CONFLICT DO NOTHING',['inbox-browser-offer',event.id,'Event organizer','Double Agent offer with a long subject for mobile','Will you accept this offer?\n\nThis is a private message.','agent@example.test']);
  const member=(await pg.query('SELECT id,"teamId" FROM "EventMembership" WHERE "eventId"=$1 AND role=$2 LIMIT 1',[event.id,'PARTICIPANT'])).rows[0];
  await pg.query('INSERT INTO "Team" (id,"eventId",name) VALUES ($1,$2,$3)',['inbox-browser-team',event.id,'Second team with a long name']);
  for(const [id,name,teamId] of [['inbox-browser-second','Second selected participant','inbox-browser-team'],['inbox-browser-replacement','Replacement participant',member.teamId]]){
   await pg.query('INSERT INTO "User" (id,name,email,"passwordHash") SELECT $1,$2,$3,"passwordHash" FROM "User" WHERE email=$4',[id,name,id+'@example.test','agent@example.test']);
   await pg.query('INSERT INTO "EventMembership" (id,"eventId","userId",role,"teamId") VALUES ($1,$2,$1,$3,$4)',[id,event.id,'PARTICIPANT',teamId]);
  }
  await check('inbox-organizer-list',base);
  await check('inbox-organizer-detail',base+'?message=inbox-browser-offer');
  await check('inbox-organizer-compose',base,"document.querySelector('.inbox-compose').open=true");
  assert(await evaluate("!!document.querySelector('.inbox-recipient-picker input[type=checkbox]')"));
  assert(await evaluate("[...document.querySelectorAll('.inbox-recipient-option')].every(row=>{const box=row.querySelector('input').getBoundingClientRect(),name=row.querySelector('span').getBoundingClientRect();return name.left>=box.right&&row.getBoundingClientRect().height>=44})"),'Recipient names and checkboxes must align in one touch row');
  const wait=async test=>{for(let i=0;i<120;i++){if(await test())return;await new Promise(r=>setTimeout(r,100));}throw Error('Inbox browser action timed out');};
  const choose=label=>evaluate("[...document.querySelectorAll('.inbox-recipient-option')].find(e=>e.textContent.trim()==="+JSON.stringify(label)+").querySelector('input').click()");
  const agentName=(await pg.query('SELECT name FROM "User" WHERE email=$1',['agent@example.test'])).rows[0].name;
  await choose(agentName);await choose('Replacement participant');assert.equal(await evaluate("document.querySelectorAll('.inbox-recipient-option input:checked').length"),1);await choose(agentName);await choose('Second selected participant');
  assert.equal(await evaluate("document.querySelectorAll('.inbox-recipient-option input:checked').length"),2);
  await evaluate("(()=>{const input=document.querySelector('.inbox-compose input[type=search]');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,'Second');input.dispatchEvent(new Event('input',{bubbles:true}));})()");
  assert(await evaluate("document.querySelector('.inbox-recipient-heading').textContent.includes('2 selected')"));
  await evaluate("(()=>{const input=document.querySelector('.inbox-compose input[type=search]');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,'');input.dispatchEvent(new Event('input',{bubbles:true}));const body=document.querySelector('.inbox-compose textarea');Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set.call(body,'App briefer attached. Please confirm your offer.');body.dispatchEvent(new Event('input',{bubbles:true}));})()");
  const filePath=path.resolve('.tmp/stability-evidence/inbox-app-briefer.pdf');fs.writeFileSync(filePath,'%PDF-1.7\nApp briefer\n%%EOF');
  const doc=await cmd('DOM.getDocument'),fileNode=await cmd('DOM.querySelector',{nodeId:doc.root.nodeId,selector:'.inbox-compose input[type=file]'});await cmd('DOM.setFileInputFiles',{nodeId:fileNode.nodeId,files:[filePath]});
  await wait(()=>evaluate("document.querySelector('.inbox-upload-list')?.textContent.includes('Ready')"));
  const realBefore=(await pg.query('SELECT count(*)::int n FROM "InboxMessage" WHERE "eventId"=$1 AND "isTest"=false',[event.id])).rows[0].n;
  await evaluate("[...document.querySelectorAll('.inbox-compose button')].find(b=>b.textContent==='Send test to myself').click()");
  await wait(()=>evaluate("document.querySelector('.inbox-detail .notice')?.textContent.includes('Test offer')"));
  const testOffer=(await pg.query('SELECT id FROM "InboxMessage" WHERE "eventId"=$1 AND "isTest"=true',[event.id])).rows[0];
  assert(testOffer);assert.equal((await pg.query('SELECT count(*)::int n FROM "InboxMessage" WHERE "eventId"=$1 AND "isTest"=false',[event.id])).rows[0].n,realBefore);
  assert.equal(await evaluate("document.querySelectorAll('.inbox-recipient-option input:checked').length"),2);
  assert.equal(await evaluate("document.querySelector('.inbox-compose textarea').value"),'App briefer attached. Please confirm your offer.');
  assert(await evaluate("document.querySelector('.inbox-detail .inbox-attachments').textContent.includes('inbox-app-briefer.pdf')"));
  for(const width of [320,390,768,1440]){await cmd('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width<768});assert(await evaluate('document.documentElement.scrollWidth<=innerWidth'));const shot=await cmd('Page.captureScreenshot',{format:'png',captureBeyondViewport:true});fs.writeFileSync(path.resolve('.tmp/stability-evidence/inbox-self-test-'+width+'.png'),Buffer.from(shot.data,'base64'));}
  await evaluate("[...document.querySelectorAll('.inbox-offer-action button')].find(b=>b.textContent==='Yes, accept').click()");
  assert.equal((await pg.query('SELECT response FROM "InboxMessage" WHERE id=$1',[testOffer.id])).rows[0].response,null);
  await evaluate("[...document.querySelectorAll('.inbox-offer-action button')].find(b=>b.textContent==='Confirm acceptance').click()");
  await wait(async()=>(await pg.query('SELECT response FROM "InboxMessage" WHERE id=$1',[testOffer.id])).rows[0].response==='YES');
  await wait(()=>evaluate("!document.querySelector('.inbox-pending')"));
  await evaluate("document.querySelector('.inbox-compose form').requestSubmit()");assert(await evaluate("document.querySelector('.inbox-review').textContent.includes('2 recipients')"));
  for(const width of [320,390,768,1440]){await cmd('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width<768});assert(await evaluate('document.documentElement.scrollWidth<=innerWidth'));const shot=await cmd('Page.captureScreenshot',{format:'png',captureBeyondViewport:true});fs.writeFileSync(path.resolve('.tmp/stability-evidence/inbox-bulk-review-'+width+'.png'),Buffer.from(shot.data,'base64'));}
  await evaluate("[...document.querySelectorAll('.inbox-review button')].find(b=>b.textContent==='Send to 2 participants').click()");
  await wait(async()=>(await pg.query('SELECT count(*)::int AS n FROM "InboxMessage" WHERE "eventId"=$1 AND subject=$2 AND "isTest"=false',[event.id,'Double Agent offer'])).rows[0].n===2);
  assert.equal((await pg.query('SELECT count(*)::int AS n FROM "InboxAttachment" WHERE "eventId"=$1',[event.id])).rows[0].n,1);
  await wait(()=>evaluate("!document.querySelector('.inbox-pending')"));
  await wait(()=>evaluate("[...document.querySelectorAll('.inbox-recipient-tabs button')].some(b=>b.textContent==='Facilitators'&&!b.matches(':disabled'))"));
  await evaluate("document.querySelector('.inbox-compose').open=true;[...document.querySelectorAll('.inbox-recipient-tabs button')].find(b=>b.textContent==='Facilitators').click()");
  const faciName=(await pg.query('SELECT name FROM "User" WHERE email=$1',['facilitator@example.test'])).rows[0].name;
  await wait(()=>evaluate("[...document.querySelectorAll('.inbox-recipient-option')].some(e=>e.textContent.trim()==="+JSON.stringify(faciName)+")"));
  await choose(faciName);
  await evaluate("(()=>{const body=document.querySelector('.inbox-compose textarea');Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set.call(body,'Facilitator offer: please confirm your answer.');body.dispatchEvent(new Event('input',{bubbles:true}));const subject=document.querySelector('.inbox-compose input[maxlength=\"120\"]');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(subject,'Facilitator preview');subject.dispatchEvent(new Event('input',{bubbles:true}));})()");
  const currentDoc=await cmd('DOM.getDocument'),newFileNode=await cmd('DOM.querySelector',{nodeId:currentDoc.root.nodeId,selector:'.inbox-compose input[type=file]'});await cmd('DOM.setFileInputFiles',{nodeId:newFileNode.nodeId,files:[filePath]});
  await wait(()=>evaluate("document.querySelector('.inbox-upload-list')?.textContent.includes('Ready')"));
  assert.equal(await evaluate("document.querySelectorAll('.inbox-recipient-option input:checked').length"),1);
  await evaluate("document.querySelector('.inbox-compose form').requestSubmit()");
  assert(await evaluate("document.querySelector('.inbox-recipient-review').textContent.includes('Facilitator')"));
  for(const width of [320,390,768,1440]){await cmd('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width<768});assert(await evaluate('document.documentElement.scrollWidth<=innerWidth'));const shot=await cmd('Page.captureScreenshot',{format:'png',captureBeyondViewport:true});fs.writeFileSync(path.resolve('.tmp/stability-evidence/inbox-faci-review-'+width+'.png'),Buffer.from(shot.data,'base64'));}
  await evaluate("[...document.querySelectorAll('.inbox-review button')].find(b=>b.textContent==='Send to 1 recipient').click()");
  await wait(async()=>(await pg.query('SELECT count(*)::int n FROM "InboxMessage" WHERE "eventId"=$1 AND subject=$2',[event.id,'Facilitator preview'])).rows[0].n===1);
 }else if(role==='agent'){
  await check('inbox-participant-list',base);
  assert(!(await evaluate("!!document.querySelector('.inbox-compose')")));
  await check('inbox-participant-offer',base+'?message=inbox-browser-offer');
  const attached=(await pg.query('SELECT m.id FROM "InboxMessage" m JOIN "EventMembership" e ON e.id=m."recipientId" JOIN "User" u ON u.id=e."userId" WHERE m."eventId"=$1 AND m.subject=$2 AND u.email=$3',[event.id,'Double Agent offer','agent@example.test'])).rows[0];
  await check('inbox-participant-attachment',base+'?message='+attached.id);assert(await evaluate("document.querySelector('.inbox-attachments a').textContent.includes('inbox-app-briefer.pdf')"));
  await check('inbox-participant-confirm',base+'?message=inbox-browser-offer&choice=YES');
  assert.equal((await pg.query('SELECT response FROM "InboxMessage" WHERE id=$1',['inbox-browser-offer'])).rows[0].response,null);
  await evaluate("[...document.querySelectorAll('button')].find(b=>b.textContent==='Confirm acceptance').click()");
  for(let i=0;i<80;i++){if((await pg.query('SELECT response FROM "InboxMessage" WHERE id=$1',['inbox-browser-offer'])).rows[0].response==='YES')break;await new Promise(r=>setTimeout(r,100));}
  assert.equal((await pg.query('SELECT response FROM "InboxMessage" WHERE id=$1',['inbox-browser-offer'])).rows[0].response,'YES');
  await check('inbox-participant-accepted',base+'?message=inbox-browser-offer');
  assert(!(await evaluate("!!document.querySelector('.inbox-offer-action')")));
  await visit('/events/'+event.id);assert(await evaluate("!!document.querySelector('.inbox-entry')"));
 }else{
  const wait=async fn=>{for(let i=0;i<100;i++){if(await fn())return;await new Promise(r=>setTimeout(r,100));}throw Error('Facilitator inbox timed out');};
  const judge=(await pg.query('SELECT id FROM "EventMembership" WHERE "eventId"=$1 AND role=$2',[event.id,'FACILITATOR'])).rows[0];
  const candidate=(await pg.query('SELECT id FROM "Team" WHERE "eventId"=$1 LIMIT 1',[event.id])).rows[0];
  await pg.query('INSERT INTO "JudgingContest" (id,"eventId",name,config,state) VALUES ($1,$2,$3,$4,$5)',['inbox-faci-open',event.id,'Inbox judge test',JSON.stringify({target:'TEAM',candidateIds:[candidate.id],criteria:[{id:'quality',name:'Quality',maximum:100,description:''}]}),'OPEN']);
  await pg.query('INSERT INTO "JudgingAssignment" ("eventId","contestId","membershipId") VALUES ($1,$2,$3)',[event.id,'inbox-faci-open',judge.id]);
  await visit('/events/'+event.id+'/judging');
  await wait(()=>evaluate("document.querySelector('.player-brand').textContent==='Scoring'"));
  await evaluate("document.querySelector('.player-topbar summary').click()");
  await evaluate("document.querySelector('.player-account-menu a[href$=\"/inbox\"]').click()");
  await wait(()=>evaluate("location.pathname.endsWith('/inbox')&&!!document.querySelector('.inbox-message-list')"));
  const offer=(await pg.query('SELECT id FROM "InboxMessage" WHERE "eventId"=$1 AND subject=$2',[event.id,'Facilitator preview'])).rows[0];
  await check('inbox-faci-offer',base+'?message='+offer.id);
  assert(!(await evaluate("!!document.querySelector('.inbox-compose')")));
  assert(!(await evaluate("!!document.querySelector('.field-bottom-nav')")),'Other field tabs remain hidden during judging');
  assert(await evaluate("location.pathname.endsWith('/inbox')"),'Inbox must not be redirected to scoring');
  assert(await evaluate("document.querySelector('.inbox-attachments').textContent.includes('inbox-app-briefer.pdf')"));
  assert.equal(await evaluate("fetch(document.querySelector('.inbox-attachments a').href).then(r=>r.status)"),200);
  await evaluate("[...document.querySelectorAll('.inbox-offer-action button')].find(b=>b.textContent==='Yes, accept').click()");
  await evaluate("[...document.querySelectorAll('.inbox-offer-action button')].find(b=>b.textContent==='Confirm acceptance').click()");
  await wait(async()=>(await pg.query('SELECT response FROM "InboxMessage" WHERE id=$1',[offer.id])).rows[0].response==='YES');
  await check('inbox-faci-accepted',base+'?message='+offer.id);
  assert(!(await evaluate("!!document.querySelector('.inbox-offer-action')")));
 }
 console.log('PASS: '+role+' inbox list/detail, confirmation, privacy and 320/390/768/1440 layouts.');
}

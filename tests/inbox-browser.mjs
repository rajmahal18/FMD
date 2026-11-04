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
  await evaluate("document.querySelector('.inbox-compose form').requestSubmit()");assert(await evaluate("document.querySelector('.inbox-review').textContent.includes('2 recipients')"));
  for(const width of [320,390,768,1440]){await cmd('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width<768});assert(await evaluate('document.documentElement.scrollWidth<=innerWidth'));const shot=await cmd('Page.captureScreenshot',{format:'png',captureBeyondViewport:true});fs.writeFileSync(path.resolve('.tmp/stability-evidence/inbox-bulk-review-'+width+'.png'),Buffer.from(shot.data,'base64'));}
  await evaluate("[...document.querySelectorAll('.inbox-review button')].find(b=>b.textContent==='Send to 2 participants').click()");
  await wait(async()=>(await pg.query('SELECT count(*)::int AS n FROM "InboxMessage" WHERE "eventId"=$1 AND subject=$2',[event.id,'Double Agent offer'])).rows[0].n===2);
  assert.equal((await pg.query('SELECT count(*)::int AS n FROM "InboxAttachment" WHERE "eventId"=$1',[event.id])).rows[0].n,1);
  await wait(()=>evaluate("!document.querySelector('.inbox-pending')"));
 }else{
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
 }
 console.log('PASS: '+role+' inbox list/detail, confirmation, privacy and 320/390/768/1440 layouts.');
}

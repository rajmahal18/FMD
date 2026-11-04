import assert from 'node:assert/strict';
export async function inboxBrowser({role,pg,event,evaluate,visit,check}){
 const base=`/events/${event.id}/inbox`;
 if(role==='organizer'){
  await pg.query('INSERT INTO "InboxMessage" (id,"eventId","recipientId","senderName",subject,body) SELECT $1,$2,m.id,$3,$4,$5 FROM "EventMembership" m JOIN "User" u ON u.id=m."userId" WHERE m."eventId"=$2 AND u.email=$6 ON CONFLICT DO NOTHING',['inbox-browser-offer',event.id,'Event organizer','Double Agent offer with a long subject for mobile','Will you accept this offer?\n\nThis is a private message.','agent@example.test']);
  await check('inbox-organizer-list',base);
  await check('inbox-organizer-detail',base+'?message=inbox-browser-offer');
  await check('inbox-organizer-compose',base,"document.querySelector('.inbox-compose').open=true");
  assert(await evaluate("!!document.querySelector('.inbox-compose select')"));
 }else{
  await check('inbox-participant-list',base);
  assert(!(await evaluate("!!document.querySelector('.inbox-compose')")));
  await check('inbox-participant-offer',base+'?message=inbox-browser-offer');
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

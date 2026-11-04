import assert from 'node:assert/strict';
let pollId;
export async function squadHandlersBrowser({role,pg,event,timerTeam,evaluate,visit,check}){
 const base='/events/'+event.id;
 const wait=async fn=>{for(let i=0;i<80;i++){if(await fn())return;await new Promise(r=>setTimeout(r,100));}throw Error('Squad handler browser state timed out');};
 const click=label=>evaluate(`[...document.querySelectorAll('button')].find(b=>b.textContent==='${label}').click()`);
 if(role==='organizer'){
  const open="document.querySelector('.squad-handler-assignment details').open=true";
  await check('squad-handler-assignment',base+'/people',open);
  const membership=(await pg.query('SELECT id FROM "EventMembership" WHERE "eventId"=$1 AND role=$2',[event.id,'FACILITATOR'])).rows[0].id;
  await evaluate(`(()=>{const form=document.querySelector('.squad-handler-assignment form');form.querySelector('select').value='${membership}';form.requestSubmit();})()`);
  await wait(async()=>(await pg.query('SELECT COUNT(*)::int AS n FROM "SquadHandler" WHERE "teamId"=$1',[timerTeam])).rows[0].n===1);
  await check('squad-handler-assigned',base+'/people');
  await check('squad-handler-voting-editor',base+'/voting-settings',"[...document.querySelectorAll('button')].find(b=>b.textContent==='Create voting event').click()");
  await evaluate("document.querySelector('.voting-editor input[maxlength]').focus()");
  await evaluate("(()=>{const input=document.querySelector('.voting-editor input[maxlength]');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,'Squad Handler Appreciation');input.dispatchEvent(new Event('input',{bubbles:true}));const dates=document.querySelectorAll('.voting-editor input[type=datetime-local]');dates.forEach((input,i)=>{const d=new Date(Date.now()+(i?3600000:-60000));const value=new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,16);Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,value);input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));});})()");
  await click('Select all participants');const before=await evaluate("document.querySelectorAll('.voting-candidate-setup input[type=checkbox]:checked').length");
  await click('Include squad handlers');assert.equal(await evaluate("document.querySelectorAll('.voting-candidate-setup input[type=checkbox]:checked').length"),before+1,'Including handlers preserves selected participants');
  await evaluate("(()=>{const select=document.querySelector('.voting-editor select:has(option[value=SQUAD_HANDLERS])');select.value='SQUAD_HANDLERS';select.dispatchEvent(new Event('change',{bubbles:true}));})()");await new Promise(r=>setTimeout(r,100));assert(await evaluate("document.querySelector('.voting-eligibility').textContent.includes('1 active')"));
  await evaluate("(()=>{const select=document.querySelector('.voting-editor select:has(option[value=SQUAD_HANDLERS])');select.value='PARTICIPANTS';select.dispatchEvent(new Event('change',{bubbles:true}));document.querySelector('.voting-editor button[type=submit]').click();})()");await click('Save voting event');
  await wait(async()=>{const poll=(await pg.query('SELECT id FROM "VotingEvent" WHERE "eventId"=$1',[event.id])).rows[0];if(poll)pollId=poll.id;return !!poll;});
  await visit(base+'/voting');await click('Enable voting');await evaluate("document.querySelector('.action-feedback-modal[open] .action-feedback-actions button:last-child').click()");await wait(async()=>(await pg.query('SELECT enabled FROM "VotingEvent" WHERE id=$1',[pollId])).rows[0].enabled);
 }else if(role==='agent'){
  await check('squad-handler-team-identity',base,"[...document.querySelectorAll('.controller-tabs [role=tab]')].find(t=>t.textContent.includes('Team')).click()");assert(await evaluate("!!document.querySelector('.team-handler-identity .person-name')||document.querySelector('.team-handler-identity').textContent.includes('Demo Facilitator')"));
  await check('squad-handler-candidate',base+'/voting');assert(await evaluate("document.querySelector('.voting-candidate').textContent.includes('Squad handler')"));
  await evaluate("document.querySelector('.voting-candidate input').click();document.querySelector('.voting-ballot button[type=submit]').click()");await click('Submit final ballot');await wait(async()=>(await pg.query('SELECT COUNT(*)::int AS n FROM "VotingBallot" WHERE "votingEventId"=$1',[pollId])).rows[0].n===1);
  await check('squad-handler-vote-receipt',base+'/voting');assert(await evaluate("document.body.textContent.includes('Your ballot is recorded')"));
 }else{
  await check('squad-handler-staff-roster',base+'/people');assert(await evaluate("!!document.querySelector('.squad-handler-assignment')&&!document.querySelector('.squad-handler-assignment form')"),'Facilitator roster exposes identity without organizer controls');
 }
 console.log('PASS: '+role+' squad handler assignment, identity and voting browser flow.');
}

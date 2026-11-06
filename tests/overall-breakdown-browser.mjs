import assert from 'node:assert/strict';
import {shareResult} from './result-sharing-helpers.mjs';
let organizerCookie;
export async function overallBreakdownBrowser({role,cookie,pg,event,evaluate,visit,check,origin,appOrigin}){
 const url=`/events/${event.id}/overall/breakdown`,api=`/api/events/${event.id}`;
 const wait=async test=>{for(let i=0;i<120;i++){if(await test())return;await new Promise(r=>setTimeout(r,100));}throw Error('Breakdown browser timed out');};
 const shared=(key,facilitators='PUBLISHED',participants='PUBLISHED')=>shareResult({origin:appOrigin,requestOrigin:origin,eventId:event.id,cookie:organizerCookie,key,facilitators,participants});
 if(role==='organizer'){
  organizerCookie=cookie;
  const owner=(await pg.query('SELECT "userId" FROM "EventMembership" WHERE "eventId"=$1 AND role=$2',[event.id,'ORGANIZER'])).rows[0].userId,judge=(await pg.query('SELECT id FROM "EventMembership" WHERE "eventId"=$1 AND role=$2',[event.id,'FACILITATOR'])).rows[0].id;
  const first=(await pg.query('SELECT id FROM "Team" WHERE "eventId"=$1 LIMIT 1',[event.id])).rows[0].id;
  const teams=[first,...[1,2,3,4].map(i=>'sheet-squad-'+i)],names=['Blue Huntrix','Vanguard Elite','Scarlet Swag','Task Force V','Green Phantom'];
  await pg.query('UPDATE "Team" SET name=$1 WHERE id=$2',[names[0],first]);
  for(let i=1;i<5;i++)await pg.query('INSERT INTO "Team" (id,"eventId",name) VALUES ($1,$2,$3)',[teams[i],event.id,names[i]]);
  const judges=[judge,'sheet-browser-judge2','sheet-browser-judge3'];
  for(let i=1;i<3;i++){await pg.query('INSERT INTO "User" (id,email,name,"passwordHash") SELECT $1,$2,$3,"passwordHash" FROM "User" WHERE email=$4',[judges[i],judges[i]+'@example.test','Judge '+(i+1)+' with a long display name','facilitator@example.test']);await pg.query('INSERT INTO "EventMembership" (id,"eventId","userId",role) VALUES ($1,$2,$1,$3)',[judges[i],event.id,'FACILITATOR']);}
  const contests=['sheet-gala','sheet-banner','sheet-chant'];
  for(const id of contests){const config={target:'TEAM',candidateIds:teams,criteria:[{id:'score',name:'Performance score',description:'',maximum:100}]};await pg.query('INSERT INTO "JudgingContest" (id,"eventId",name,config,state,"publishedAt","publishedResults") VALUES ($1,$2,$3,$4,$5,$6,$7)',[id,event.id,id,JSON.stringify(config),'PUBLISHED',new Date().toISOString(),JSON.stringify({rows:teams.map((teamId,i)=>({id:teamId,name:names[i],average:97-i*5,maximum:100,rank:i+1,submitted:3,judges:3})),criteria:config.criteria})]);
   for(const membership of judges)await pg.query('INSERT INTO "JudgingAssignment" ("eventId","contestId","membershipId") VALUES ($1,$2,$3)',[event.id,id,membership]);
   for(let i=0;i<5;i++)for(let j=0;j<3;j++)await pg.query('INSERT INTO "JudgingScore" (id,"eventId","contestId","judgeMembershipId","candidateId",scores,"totalHundredths","submittedAt","updatedAt") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$8)',[id+'-'+i+'-'+j,event.id,id,judges[j],teams[i],JSON.stringify({score:100-i*5-j*3}),(100-i*5-j*3)*100,new Date().toISOString()]);
  }
  await pg.query('UPDATE "Event" SET state=$1 WHERE id=$2',['FINALIZED',event.id]);
  await pg.query('INSERT INTO "ResultRevision" (id,"eventId",revision,"actorId",reason,"teamStandingsJson","summaryJson") VALUES ($1,$2,1,$3,$4,$5,$6)',['sheet-browser-race',event.id,owner,'Approved fixture',JSON.stringify(teams.map((id,i)=>({id,name:names[i],rank:i<2?1:i+1,value:95-Math.max(0,i-1)*5,rule:'STATION_PLACEMENTS'}))),'{}']);
  const config={raceRule:'STATION_PLACEMENTS',raceScoring:{credits:[100,90,80,70,60],regularWeight:80,finalWeight:20,successScore:100,failedScore:50,stationIds:['demo-cipher-room']},events:[{id:'race',name:'Spy Chase',source:'SPY',weight:45,credits:[100,90,80,70,60],ranks:{}},...contests.map((id,i)=>({id,name:['Gala Showcase','Squad Banner','Squad Chant'][i],source:'JUDGING',contestId:id,weight:i===0?45:5,credits:[100,90,80,70,60],ranks:{}}))]};
  await pg.query('INSERT INTO "OverallRanking" ("eventId",config) VALUES ($1,$2) ON CONFLICT ("eventId") DO UPDATE SET config=EXCLUDED.config,finalized=NULL',[event.id,JSON.stringify(config)]);
  await check('breakdown-organizer-preview',url);
  assert.equal(await evaluate("document.querySelectorAll('.breakdown-table tbody tr').length"),5);
  const geometry=await evaluate("(()=>{const s=document.querySelector('.breakdown-scroll'),f=s.querySelector('tbody th'),before=f.getBoundingClientRect().left;s.scrollLeft=700;const after=f.getBoundingClientRect().left;return {before,after,overflow:s.scrollWidth>s.clientWidth,pageFits:document.documentElement.scrollWidth<=innerWidth}})()");
  assert(geometry.overflow&&geometry.pageFits);assert(Math.abs(geometry.before-geometry.after)<1,'Squad column stays frozen during horizontal scrolling');
  await evaluate("(()=>{const select=document.querySelector('.breakdown-controls select');Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set.call(select,'overall-totals');select.dispatchEvent(new Event('change',{bubbles:true}));})()");
  await wait(()=>evaluate("(()=>{const s=document.querySelector('.breakdown-scroll');return s.scrollLeft+s.clientWidth>=s.scrollWidth-2})()"));
  const columns=await evaluate("document.querySelectorAll('.breakdown-table tbody tr:first-child td').length");await evaluate("document.querySelector('.breakdown-controls input').click()");assert.equal(await evaluate("document.querySelectorAll('.breakdown-table tbody tr:first-child td').length"),columns-9);await evaluate("document.querySelector('.breakdown-controls input').click()");
  const data=await (await fetch(appOrigin+api+'/overall?view=draft',{headers:{cookie}})).json();const response=await fetch(appOrigin+api+'/overall',{method:'POST',headers:{cookie,origin,'content-type':'application/json'},body:JSON.stringify({operation:'finalize',revision:data.revision,config:data.config,expectedJudgingRevisions:Object.fromEntries(data.judgingSources.map(s=>[s.id,s.revision]))})});assert.equal(response.status,200,await response.text());
  for(const key of ['race',...contests.map(id=>'judging:'+id),'overall'])await shared(key);
  await visit(`/events/${event.id}/results?share=overall-breakdown`);
  await wait(()=>evaluate("!!document.querySelector('.result-sharing-fields')"));
  await evaluate("(()=>{const select=document.querySelectorAll('.result-sharing-fields select')[1];Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set.call(select,'PUBLISHED');select.dispatchEvent(new Event('change',{bubbles:true}));})()");
  await evaluate("[...document.querySelectorAll('button')].find(b=>b.textContent==='Review sharing changes').click()");await wait(()=>evaluate("document.body.textContent.includes('each judge')"));
  await evaluate("[...document.querySelectorAll('button')].find(b=>b.textContent==='Confirm sharing changes').click()");
  await wait(async()=>(await pg.query('SELECT facilitators FROM "ResultSharing" WHERE "eventId"=$1 AND key=$2',[event.id,'overall-breakdown'])).rows[0]?.facilitators==='PUBLISHED');
 }else if(role==='facilitator'){
  await check('breakdown-facilitator-shared',url);assert(await evaluate("!!document.querySelector('.breakdown-table')"));assert(!(await evaluate("[...document.querySelectorAll('a')].some(a=>a.textContent==='Audience & sharing')")));
 }else{
  await check('breakdown-participant-hidden',url);assert(!(await evaluate("!!document.querySelector('.breakdown-table')")));
  await shared('overall-breakdown');await check('breakdown-participant-shared',url);assert.equal(await evaluate("document.querySelectorAll('.breakdown-table tbody tr').length"),5);
  await shared('overall-breakdown','PUBLISHED','HIDDEN');await evaluate("[...document.querySelectorAll('button')].find(b=>b.textContent==='Refresh scores').click()");await wait(()=>evaluate("!document.querySelector('.breakdown-table')"));
 }
 console.log('PASS: '+role+' detailed ranking sheet, responsive contained scrolling, frozen squad column, judge toggle, audited sharing and hidden-data removal.');
}

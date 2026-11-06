import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
export async function verifyFiveCongenial({pg,prepareRace,command,get,postJson,cookies}){
 const g=await prepareRace('Final five vote congeniality'),extra=[];
 const previous=(await pg.query('SELECT u.id,u.sex FROM "User" u JOIN "EventMembership" m ON m."userId"=u.id WHERE m.id IN ($1,$2)',[g.ma,g.mb])).rows;
 for(const [id,sex] of [[g.ma,'M'],[g.mb,'F']])await pg.query('UPDATE "User" SET sex=$1 WHERE id=(SELECT "userId" FROM "EventMembership" WHERE id=$2)',[sex,id]);
 for(let i=0;i<5;i++){const r=await command('addMember',{eventId:g.e,name:'Five vote candidate '+i,email:'five-candidate-'+i+'@example.test',role:'PARTICIPANT',teamId:g.a});assert.equal(r.status,200);extra.push(r.targetId);await pg.query('UPDATE "User" SET sex=$1,"mustChangePassword"=false WHERE id=(SELECT "userId" FROM "EventMembership" WHERE id=$2)',[i%2?'F':'M',r.targetId]);}
 const api=`/api/events/${g.e}`,post=(path,body,role='organizer')=>postJson(api+'/'+path,body,cookies[role]);
 const policy={operation:'configureContact',reason:'Final five-vote award configuration',mode:'INTERACTION',sameTeamAllowed:true,outgoingLimit:40,mutualConfirmation:false,reciprocityAllowed:true,visibility:'SELF',tieRule:'SHARED',enabled:true,opensAt:new Date(Date.now()-60000).toISOString(),closesAt:new Date(Date.now()+3600000).toISOString()};const preview=await post('contact-policy-preview',policy);assert.equal((await post('contact-policy',{...policy,previewToken:preview.token,requestKey:crypto.randomUUID()})).status,200);
 const members=[g.ma,g.mb,...extra],input={name:'Most Congenial',instructions:'Select up to 5 different met agents.',opensAt:policy.opensAt,closesAt:policy.closesAt,config:{congeniality:true,voterMode:'PARTICIPANTS',voterRoles:[],voterTeamIds:[],voterMembershipIds:[],candidateIds:members,maxChoices:5,allowSelf:false,allowSameTeam:true,resultCategories:[{id:'MALE',name:'Male',candidateIds:[g.ma,extra[0],extra[2],extra[4]]},{id:'FEMALE',name:'Female',candidateIds:[g.mb,extra[1],extra[3]]}]}};
 const created=await post('voting',{operation:'create',requestKey:crypto.randomUUID(),input});assert.equal(created.status,200);
 let poll=(await (await get(api+'/voting',cookies.organizer)).json()).polls[0];assert.equal(poll.config.maxChoices,5);assert.equal(poll.config.categories,undefined);assert.equal(poll.config.resultCategories.length,2);
 assert.equal((await post('voting',{operation:'setEnabled',id:created.id,revision:poll.revision,enabled:true,requestKey:crypto.randomUUID()})).status,200);
 const selected=[g.mb,...extra.slice(0,4)];
 const cast=choices=>post('voting',{operation:'cast',id:created.id,choices,requestKey:crypto.randomUUID()},'agent');
 for(const choices of [[],[g.ma],[selected[0],selected[0]],[...selected,extra[4]]])assert.equal((await cast(choices)).status,choices.length===0||choices.length>5||choices.length===2?400:409);
 const key=crypto.randomUUID(),body={operation:'cast',id:created.id,choices:selected,requestKey:key};assert.equal((await post('voting',body,'agent')).status,200);assert.equal((await post('voting',body,'agent')).replayed,true);
 assert.equal((await cast([selected[0]])).status,409);
 const count=(await pg.query('SELECT count(*)::int n FROM "VotingChoice" c JOIN "VotingBallot" b ON b.id=c."ballotId" WHERE b."votingEventId"=$1',[created.id])).rows[0].n;assert.equal(count,5);
 poll=(await (await get(api+'/voting',cookies.organizer)).json()).polls[0];assert.equal(poll.results.reduce((n,r)=>n+r.votes,0),5);assert(poll.results.some(r=>r.category==='MALE'&&r.rank===1));assert(poll.results.some(r=>r.category==='FEMALE'&&r.rank===1));
 assert.equal((await post('voting',{operation:'update',id:created.id,revision:poll.revision,input,requestKey:crypto.randomUUID()})).status,409);
 assert.equal((await (await get(api+'/contact-policy',cookies.organizer)).json()).policy.outgoingLimit,40);
 for(const p of previous)await pg.query('UPDATE "User" SET sex=$1 WHERE id=$2',[p.sex,p.id]);
 console.log('PASS: final five distinct unscanned participant choices, self/duplicate/sixth-choice rejection, one immutable ballot, retry idempotence, separate Male/Female winners and unchanged 40-contact policy.');
}

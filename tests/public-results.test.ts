import {test} from 'node:test';
import assert from 'node:assert/strict';
import {publicRecapData} from '../src/lib/public-results';
import {additionalAwards} from '../src/lib/event-awards';
import type {EventRecapData} from '../src/server/event-recap';

test('additional awards preserve supplied names and squads and reject invalid entries',()=>{
 const awards=[{award:'Successful Double Agents',name:'Naim A. Abdulkadir',teamName:'Task Force V'},{award:'Successful Double Agents',name:'Erica Jean S. Falcatan',teamName:'Green Phantom'}];
 assert.deepEqual(additionalAwards(awards),awards);
 assert.deepEqual(additionalAwards(undefined),[]);
 for(const input of [null,{},[{name:'Agent'}],[{award:'Award',name:'',teamName:'Squad'}]])assert.throws(()=>additionalAwards(input));
});
test('public projection strips unrecognized private fields at every response level',()=>{
 const secret={passwordHash:'private-hash',actorId:'private-actor',sessionToken:'private-session',ownChoices:['private-ballot']};
 const raw={eventId:'event',...secret,overall:{published:true,finalizedAt:'2026-11-10',activities:[{id:'activity',name:'Activity',weight:100,...secret}],rows:[{id:'team',name:'Team',rank:1,value:100,contributions:[{eventId:'activity',source:'MANUAL',rank:1,average:null,maximum:null,credit:100,contribution:100,...secret}],...secret}],...secret},additionalAwards:[],stationNames:{station:'Station'},breakdown:null,polls:[{id:'poll',name:'Award',ballots:3,results:[{id:'agent',name:'Agent',votes:3,rank:1,...secret}],...secret}],contests:[{id:'contest',name:'Contest',publishedAt:'2026-11-10',criteria:[{id:'criterion',name:'Quality',description:'',maximum:100,...secret}],rows:[{id:'team',name:'Team',rank:1,average:90,maximum:100,submitted:1,judges:1,...secret}],sheets:[{candidateId:'team',judge:'Judge',total:90,scores:{criterion:90,...secret},...secret}],...secret}],race:{revision:1,teams:[{id:'team',name:'Team',rank:1,value:90,...secret}],...secret}} as unknown as EventRecapData;
 const clean=publicRecapData(raw),json=JSON.stringify(clean);
 for(const value of Object.values(secret).flat())assert(!json.includes(value));
 assert(clean.overall.published);assert.equal(clean.polls[0].results[0].votes,3);assert.equal(clean.contests[0].sheets[0].scores.criterion,90);
});

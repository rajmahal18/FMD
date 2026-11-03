import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveOverallJudging,defaultOverall,overallComplete,overallStandings,validateOverall,weightStatus,type ComponentEvent} from '../src/lib/overall';
const teams=Array.from({length:6},(_,i)=>({id:`t${i+1}`,name:`Team ${i+1}`,color:'#72D5E3',points:600-i*100}));
const event=(patch:Partial<ComponentEvent>={}):ComponentEvent=>({id:'spy',name:'Spy Chase',weight:40,source:'SPY',credits:[100,90,80,70,60],ranks:{},...patch});

test('judged components use normalized actual averages instead of placement credits',()=>{
 const config={events:[event({source:'JUDGING',contestId:'gala',weight:45})]};
 const judging=[{id:'gala',name:'Gala',revision:5,published:true,rows:[{id:'t1',rank:1,average:92,maximum:100},{id:'t2',rank:2,average:88,maximum:100}]}];
 const rows=overallStandings(config,teams.slice(0,2),judging);
 assert.deepEqual(rows.map(r=>r.value),[41.4,39.6]);
 assert.equal(rows[0].contributions[0].credit,92);
 assert.equal(rows[0].contributions[0].average,92);
 assert.equal(overallStandings(config,teams.slice(0,2),[{...judging[0],published:false}])[0].contributions[0].rank,null);
});

test('judged ties preserve actual equal scores and differing contest maxima normalize fairly',()=>{
 const config={events:[event({source:'JUDGING',contestId:'banner',weight:100})]};
 const source={id:'banner',name:'Banner',revision:3,published:true,rows:[{id:'t1',rank:1,average:22,maximum:25},{id:'t2',rank:1,average:22,maximum:25}]};
 const rows=overallStandings(config,teams.slice(0,2),[source]);
 assert.deepEqual(rows.map(r=>[r.rank,r.value]),[[1,88],[1,88]]);
 const missing=overallStandings(config,teams,[source]);assert(!overallComplete(config,missing));
 assert.throws(()=>validateOverall({events:[event({source:'JUDGING'})]},teams.map(t=>t.id)));
 assert.throws(()=>validateOverall({events:[event({source:'JUDGING',contestId:'same'}),event({id:'other',source:'JUDGING',contestId:'same'})]},teams.map(t=>t.id)));
});

test('saved race ties average occupied credits and preserve third place',()=>{
 const rows=overallStandings({events:[event({weight:100})]},teams.slice(0,5).map((t,i)=>({...t,raceRank:[1,1,3,4,5][i]})));
 assert.deepEqual(rows.map(t=>t.contributions[0].credit),[95,95,80,70,60]);
 assert.deepEqual(rows.map(t=>t.rank),[1,1,3,4,5]);
});

test('three-way and non-first manual ties split all occupied slots',()=>{
 const first=overallStandings({events:[event({weight:100,source:'MANUAL',ranks:{t1:1,t2:1,t3:1,t4:4,t5:5}})]},teams.slice(0,5));
 assert.deepEqual(first.map(t=>t.value),[90,90,90,70,60]);
 const middle=overallStandings({events:[event({weight:45,source:'MANUAL',ranks:{t1:1,t2:2,t3:2,t4:4,t5:5}})]},teams.slice(0,5));
 assert.deepEqual(middle.map(t=>t.contributions[0].credit),[100,85,85,70,60]);
 assert.deepEqual(middle.map(t=>t.value),[45,38.25,38.25,31.5,27]);
});

test('tie averaging handles last-place fallback and excludes pending teams',()=>{
 const rows=overallStandings({events:[event({weight:100,credits:[100,90]})]},teams.slice(0,4).map((t,i)=>({...t,raceRank:[1,1,3,null][i]})));
 assert.deepEqual(rows.map(t=>t.contributions[0].credit),[95,95,90,null]);
});

test('fractional tie credits retain precision until the weighted total',()=>{
 const rows=overallStandings({events:[event({weight:45,credits:[100,90,75]})]},teams.slice(0,3).map(t=>({...t,raceRank:1})));
 assert(rows.every(t=>t.value===39.75));
});
test('new setup starts with an editable Amazing Race component and team-aware credits',()=>{assert.equal(defaultOverall(3).raceRule,'TIME');assert.equal(defaultOverall(3).events[0].name,'Amazing Race');assert.equal(defaultOverall(3).events[0].weight,40);assert.equal(defaultOverall(3).events[0].credits.length,3);});
test('saved race placements drive overall credit; unfinalized race remains incomplete',()=>{const config={events:[event({weight:100})]};const pending=overallStandings(config,teams.map(t=>({...t,raceRank:null})));assert(!overallComplete(config,pending));assert(pending.every(t=>t.contributions[0].rank===null));const final=overallStandings(config,teams.map((t,i)=>({...t,raceRank:6-i})));assert(overallComplete(config,final));assert.equal(final[0].id,'t6');});
test('partial manual placements or invalid total weight cannot produce complete standings',()=>{const config={events:[event({source:'MANUAL',weight:100,ranks:{t1:1}})]};assert(!overallComplete(config,overallStandings(config,teams)));assert(!overallComplete({events:[event()]},overallStandings({events:[event()]},teams)));});
test('configured credits produce expected overall percentages including lower-place fallback',()=>{assert.deepEqual(overallStandings({events:[event()]},teams).map(t=>t.value),[40,36,32,28,24,24]);});
test('weight feedback handles under, over and exact totals in decimal units',()=>{assert.equal(weightStatus([event()]).valid,false);assert.match(weightStatus([event()]).message,/another 60%/);assert.match(weightStatus([event({weight:60}),event({weight:50})]).message,/Reduce weights by 10%/);assert.equal(weightStatus([event({weight:33.33}),event({weight:33.33}),event({weight:33.34})]).valid,true);});
test('manual ranks, shared ties and weighted aggregation',()=>{const config={events:[event({weight:40}),event({id:'sports',source:'MANUAL',weight:60,ranks:{t1:2,t2:1,t3:2,t4:4,t5:5,t6:6}})]};validateOverall(config,teams.map(t=>t.id));const rows=overallStandings(config,teams);assert.equal(rows[0].id,'t2');assert.equal(rows[0].value,96);assert.equal(rows.find(t=>t.id==='t3')!.contributions[1].contribution,51);});
test('missing placements remain pending and equal point totals share ranks',()=>{const rows=overallStandings({events:[event(),event({id:'manual',source:'MANUAL'})]},teams.map(t=>({...t,points:100})));assert(rows.every(t=>t.contributions[0].rank===1));assert(rows.every(t=>t.contributions[1].rank===null));});
test('reject invalid percentages, upward credits, foreign teams and invalid tie sequences',()=>{for(const patch of ([{weight:NaN},{weight:100.001},{credits:[80,90]},{source:'MANUAL' as const,ranks:{other:1}},{source:'MANUAL' as const,ranks:{t1:1,t2:1,t3:2}}] as Partial<ComponentEvent>[]))assert.throws(()=>validateOverall({events:[event(patch)]},teams.map(t=>t.id)));assert.throws(()=>validateOverall({events:[event(),event({id:'duplicate'})]},teams.map(t=>t.id)));});



test('explicit staged judging links activate without changing unlinked legacy activities',()=>{
 const saved={raceRule:'TIME' as const,events:[event({source:'MANUAL',contestId:'gala',ranks:{t1:2}}),event({id:'legacy',source:'MANUAL',ranks:{t1:1}})]};
 const resolved=resolveOverallJudging(saved);assert.equal(resolved.events[0].source,'JUDGING');assert.deepEqual(resolved.events[0].ranks,{});assert.equal(resolved.events[1].source,'MANUAL');assert.equal(saved.events[0].source,'MANUAL');assert.equal(resolved.raceRule,'TIME');
});

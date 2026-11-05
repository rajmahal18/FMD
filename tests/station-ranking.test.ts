import test from 'node:test';
import assert from 'node:assert/strict';
import {rankStationRace} from '../src/lib/station-ranking';
import {overallStandings,type OverallConfig} from '../src/lib/overall';
const stationIds=Array.from({length:7},(_,i)=>'station-'+i),teams=['a','b','c','d','e'].map(id=>({id,name:id,stationIds,color:'#fff'}));
const outcomes=teams.flatMap((t,i)=>stationIds.map(stationId=>({stationId,teamId:t.id,durationSeconds:(i+1)*10,timePenaltySeconds:0})));
const finals=teams.map(t=>({teamId:t.id,successful:true}));
test('seven station placement totals normalize to 80 plus a 20-point final',()=>{
 const rows=rankStationRace(teams,outcomes,finals),b=rows.find(r=>r.id==='b')!;
 assert.equal(rows[0].breakdown.regularPoints,700);assert.equal(rows[0].value,100);
 assert.equal(b.breakdown.regularPoints,630);assert.equal(b.breakdown.regularContribution,72);assert.equal(b.value,92);
 const config:OverallConfig={raceRule:'STATION_PLACEMENTS',events:[{id:'race',name:'Race',source:'SPY',weight:45,credits:[100,90,80,70,60],ranks:{}}]};
 const combined=overallStandings(config,rows.map(r=>({...r,color:'#fff',points:0,raceRank:r.rank,raceScore:r.value})));
 assert.equal(combined.find(r=>r.id==='b')!.value,40.5,'Second place earns 90 credits times 45%, regardless of the raw 92 race score');
});
test('station placements win independently of the sum of elapsed times',()=>{
 const changed=outcomes.map(o=>o.teamId==='a'&&o.stationId===stationIds[6]?{...o,durationSeconds:1000}:o);
 const rows=rankStationRace(teams,changed,finals);assert.equal(rows[0].id,'a');assert.equal(rows[0].breakdown.regularPoints,660);
});
test('penalties affect only their station placement and ties average occupied credits',()=>{
 const changed=outcomes.map(o=>o.teamId==='a'&&o.stationId===stationIds[0]?{...o,timePenaltySeconds:10}:o);
 const rows=rankStationRace(teams,changed,finals),a=rows.find(r=>r.id==='a')!,b=rows.find(r=>r.id==='b')!;
 assert.equal(a.breakdown.stationScores[0].points,95);assert.equal(b.breakdown.stationScores[0].points,95);assert.equal(rows.find(r=>r.id==='c')!.breakdown.stationScores[0].rank,3);
});
test('failed final gets ten weighted points; missing final or incomplete station leaves ranks pending',()=>{
 const rows=rankStationRace(teams,outcomes,finals.map(f=>f.teamId==='a'?{...f,successful:false}:f));assert.equal(rows.find(r=>r.id==='a')!.value,90);assert.equal(rows.find(r=>r.id==='a')!.breakdown.finalContribution,10);assert.equal(rows[0].id,'b');
 assert(rankStationRace(teams,outcomes,[finals[0]]).every(r=>r.pending&&r.rank===0));
 assert(rankStationRace(teams,outcomes,[]).every(r=>r.pending&&r.rank===0));
 assert(rankStationRace(teams,outcomes.slice(1),finals).every(r=>r.pending&&r.rank===0));
 assert.equal(rankStationRace(teams,outcomes,finals).length,5);
});

test('Amazing Race tied first averages 100 and 90 before applying 45 percent',()=>{
 const config:OverallConfig={raceRule:'STATION_PLACEMENTS',events:[{id:'race',name:'Race',source:'SPY',weight:45,credits:[100,90,80,70,60],ranks:{}}]};
 const combined=overallStandings(config,teams.map((t,i)=>({...t,points:0,raceRank:[1,1,3,4,5][i],raceScore:[92,92,80,70,60][i]})));
 assert.deepEqual(combined.map(t=>t.value),[42.75,42.75,36,31.5,27]);
 assert.deepEqual(combined.map(t=>t.contributions[0].credit),[95,95,80,70,60]);
 assert.deepEqual(combined.map(t=>t.rank),[1,1,3,4,5]);
 const pending=overallStandings(config,teams.map(t=>({...t,points:0,raceRank:null,raceScore:100})));
 assert(pending.every(t=>t.contributions[0].credit===null));
});

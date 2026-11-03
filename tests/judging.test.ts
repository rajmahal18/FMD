import {test} from 'node:test';
import assert from 'node:assert/strict';
import {galaJudgingTemplates,validateJudgingConfig,validateJudgingScores,judgingStandings,judgingInputError,judgingInputState} from '../src/lib/judging';
const criteria=[{id:'impact',name:'Stage impact',description:'',maximum:10},{id:'harmony',name:'Harmony',description:'',maximum:15}];

test('live score validation explains maximum, minimum and precision without silently changing input',()=>{
 assert.match(judgingInputError('31',30)!,/more than 30/);
 assert.match(judgingInputError('-1',30)!,/less than 0/);
 assert.match(judgingInputError('1.234',30)!,/two decimal/);
 assert.match(judgingInputError('Infinity',30)!,/valid number/);
 assert.equal(judgingInputError('0',30),null);assert.equal(judgingInputError('29.99',30),null);
 assert.equal(judgingInputError('',30),null);assert.match(judgingInputError('',30,true)!,/Enter a score/);
});

test('partial and invalid score sheets never treat missing or out-of-range scores as valid totals',()=>{
 const partial=judgingInputState({impact:'0'},criteria);assert.equal(partial.count,1);assert(!partial.complete);assert(!partial.invalid);assert.equal(partial.total,0);
 const invalid=judgingInputState({impact:'11',harmony:'12.25'},criteria);assert(invalid.invalid);assert(!invalid.complete);assert.equal(invalid.total,12.25);assert.deepEqual(invalid.scores,{harmony:12.25});
 const valid=judgingInputState({impact:'9.25',harmony:'15'},criteria);assert(valid.complete);assert.equal(valid.total,24.25);assert.equal(validateJudgingScores(valid.scores,criteria,true).totalHundredths,2425);
});
test('gala templates preserve the supplied point weights and separate individual awards',()=>{
 assert.equal(galaJudgingTemplates.length,6);
 for(const template of galaJudgingTemplates)assert.equal(template.criteria.reduce((n,c)=>n+c.maximum,0),100);
 assert.equal(galaJudgingTemplates.filter(t=>t.target==='INDIVIDUAL').length,2);
 assert.deepEqual(galaJudgingTemplates.find(t=>t.id==='gala')!.criteria.map(c=>c.maximum),[30,30,20,20]);
});
test('judging rules reject duplicate entrants/criteria, nonpositive maxima and empty fields',()=>{
 const config={target:'TEAM',candidateIds:['a'],criteria};assert.equal(validateJudgingConfig(config).criteria.length,2);
 for(const change of [{candidateIds:['a','a']},{criteria:[criteria[0],criteria[0]]},{criteria:[{...criteria[0],maximum:0}]},{criteria:[{...criteria[0],maximum:1.001}]},{target:'OTHER'},{candidateIds:[]}])assert.throws(()=>validateJudgingConfig({...config,...change}));
});
test('per-criterion scoring accepts zero and decimals, requires completeness and never accepts out-of-range/extra values',()=>{
 assert.deepEqual(validateJudgingScores({impact:9,harmony:10},criteria,true),{scores:{impact:9,harmony:10},totalHundredths:1900});
 assert.equal(validateJudgingScores({impact:0,harmony:15},criteria,true).totalHundredths,1500);
 assert.equal(validateJudgingScores({impact:9.25},criteria,false).totalHundredths,925);
 for(const scores of [{impact:9},{impact:11,harmony:10},{impact:-1,harmony:10},{impact:1.001,harmony:10},{impact:NaN,harmony:10},{impact:null,harmony:10},{impact:0,harmony:0,extra:0}])assert.throws(()=>validateJudgingScores(scores,criteria,true));
});
test('equal-weight judging excludes drafts, marks incomplete results and shares exact ties',()=>{
 const entrants=[{id:'a',name:'Alpha',active:true},{id:'b',name:'Bravo',active:true}];
 const sheets=[{candidateId:'a',judgeMembershipId:'j1',totalHundredths:1900,submittedAt:'now'},{candidateId:'a',judgeMembershipId:'j2',totalHundredths:2500,submittedAt:'now'},{candidateId:'b',judgeMembershipId:'j1',totalHundredths:2500,submittedAt:'now'},{candidateId:'b',judgeMembershipId:'j2',totalHundredths:1900,submittedAt:'now'}];
 const rows=judgingStandings(entrants,['j1','j2'],criteria,sheets);assert.deepEqual(rows.map(r=>[r.average,r.rank]),[[22,1],[22,1]]);
 const partial=judgingStandings(entrants,['j1','j2'],criteria,[...sheets.slice(0,3),{...sheets[3],submittedAt:null}]);assert(partial.every(r=>r.rank===null));assert.equal(partial.find(r=>r.id==='b')!.submitted,1);
 const empty=judgingStandings(entrants,[],criteria,[]);assert(empty.every(r=>r.average===null&&r.rank===null));
});

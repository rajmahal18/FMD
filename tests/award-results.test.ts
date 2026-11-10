import {test} from 'node:test';
import assert from 'node:assert/strict';
import {handlerAwardResults,isAwardWinner} from '../src/lib/award-results';
import type {VotingConfig} from '../src/lib/voting';
const config:VotingConfig={squadAward:true,squadGroups:[{id:'squad',name:'Squad',candidateIds:['leader','choice']}],voterMode:'PARTICIPANTS',voterRoles:[],voterTeamIds:[],voterMembershipIds:[],candidateIds:['leader','choice'],maxChoices:1,allowSelf:false,allowSameTeam:true};
const rows=[{id:'leader',name:'Vote leader',rank:1,votes:8,squadId:'squad'},{id:'choice',name:'Handler choice',rank:2,votes:1,squadId:'squad'}];
test('handler winner differs from vote leader without changing vote counts or ranks',()=>{
 const published=handlerAwardResults(config,rows,[{teamId:'squad',choices:['choice']}]);
 assert.deepEqual(published.filter(isAwardWinner).map(r=>r.id),['choice']);
 assert.deepEqual(published.map(r=>[r.votes,r.rank]),[[8,1],[1,2]]);
 assert.deepEqual(rows.filter(isAwardWinner).map(r=>r.id),['leader']);
});
test('missing, duplicate, multiple and cross-squad handler choices cannot publish',()=>{
 for(const handlers of [[],[{teamId:'squad',choices:[]}],[{teamId:'squad',choices:['other']}],[{teamId:'squad',choices:['leader','choice']}],[{teamId:'squad',choices:['choice']},{teamId:'squad',choices:['leader']}],[{teamId:'other',choices:['choice']}]])assert.throws(()=>handlerAwardResults(config,rows,handlers));
 assert.throws(()=>handlerAwardResults({...config,squadAward:false},rows,[]));
});
test('ordinary tied first places remain joint winners and zero counts remain unranked',()=>{
 assert.deepEqual([{...rows[0],rank:1},{...rows[1],rank:1},{...rows[1],id:'zero',rank:null,votes:0}].filter(isAwardWinner).map(r=>r.id),['leader','choice']);
});

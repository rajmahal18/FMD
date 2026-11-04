import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseVotingInput,eligibleVoter,eligibleCandidate,validateBallot,votingStatus,completeCandidatePool,votingStandings,profileVotingCategory,type VotingConfig,type VotingPerson} from '../src/lib/voting';
const config:VotingConfig={voterMode:'PARTICIPANTS',voterRoles:[],voterTeamIds:[],voterMembershipIds:[],candidateIds:['one','two','faci'],maxChoices:1,allowSelf:false,allowSameTeam:true};
const one:VotingPerson={id:'one',name:'One',role:'PARTICIPANT',teamId:'red',teamName:'Red',active:true};
const two:VotingPerson={...one,id:'two',name:'Two',teamId:'blue'};
const faci:VotingPerson={...one,id:'faci',role:'FACILITATOR',teamId:null};

test('assigned squad handlers can be candidates or explicit voters without becoming participants',()=>{
 const handler={...faci,squadHandlerTeamId:'red',squadHandlerTeamName:'Red'};
 assert(eligibleCandidate(config,one,handler));
 assert(!eligibleCandidate({...config,allowSameTeam:false},one,handler));
 assert(eligibleCandidate({...config,allowSameTeam:false},two,handler));
 assert(!eligibleVoter(config,handler));
 assert(eligibleVoter({...config,voterMode:'SQUAD_HANDLERS'},handler));
 assert(!eligibleVoter({...config,voterMode:'SQUAD_HANDLERS'},faci));
 assert(!eligibleVoter({...config,voterMode:'SQUAD_HANDLERS'},{...handler,active:false}));
 assert(!eligibleVoter({...config,voterMode:'TEAMS',voterTeamIds:['red']},handler));
});
test('Male/Female ballot requires one choice from each category in one submission',()=>{
 const c:VotingConfig={...config,candidateIds:['m1','m2','f1','f2'],maxChoices:2,categories:[{id:'MALE',name:'Male',candidateIds:['m1','m2']},{id:'FEMALE',name:'Female',candidateIds:['f1','f2']}]};
 const people=c.candidateIds.map(id=>({...two,id}));
 assert.deepEqual(validateBallot(['m1','f1'],c,one,people),['f1','m1']);
 for(const choices of [[],['m1'],['f1'],['m1','m2'],['f1','f2'],['m1','f1','f2'],['m1','m1']])assert.throws(()=>validateBallot(choices,c,one,people));
 assert(completeCandidatePool(c,one,people));assert(!completeCandidatePool(c,one,people.filter(p=>p.id.startsWith('m'))));
 const input={name:'Agents of the Night',instructions:'',opensAt:'2026-10-20T10:00:00Z',closesAt:'2026-10-20T11:00:00Z',config:c};assert.equal(parseVotingInput(input).config.categories?.length,2);
 for(const categories of [[c.categories![0]],[c.categories![0],{...c.categories![1],candidateIds:[]}],[c.categories![0],{...c.categories![1],candidateIds:['m1','f1','f2']}],[{...c.categories![0],candidateIds:['m1']},c.categories![1]]])assert.throws(()=>parseVotingInput({...input,config:{...c,categories}}));
});
test('category results rank independently with shared ties, zero-vote rows and frozen category assignments',()=>{
 const c:VotingConfig={...config,candidateIds:['m1','m2','m3','f1','f2'],maxChoices:2,categories:[{id:'MALE',name:'Male',candidateIds:['m1','m2','m3']},{id:'FEMALE',name:'Female',candidateIds:['f1','f2']}]};
 const rows=votingStandings(c,c.candidateIds.map(id=>({...two,id,sex:'F'})),['m1','m2','f1','f1'].map(candidateMembershipId=>({candidateMembershipId})));
 assert.deepEqual(rows.map(r=>[r.id,r.category,r.rank]),[['m1','MALE',1],['m2','MALE',1],['m3','MALE',null],['f1','FEMALE',1],['f2','FEMALE',null]]);
 assert.equal(profileVotingCategory('M'),'MALE');assert.equal(profileVotingCategory('female'),'FEMALE');assert.equal(profileVotingCategory(null),null);assert.equal(profileVotingCategory('unknown'),null);
});
test('voter scopes support participants, roles, teams and explicit individuals',()=>{
 assert(eligibleVoter(config,one));assert(!eligibleVoter(config,faci));
 assert(eligibleVoter({...config,voterMode:'ROLES',voterRoles:['FACILITATOR']},faci));
 assert(!eligibleVoter({...config,voterMode:'TEAMS',voterTeamIds:['red']},two));
 assert(eligibleVoter({...config,voterMode:'PEOPLE',voterMembershipIds:['faci']},faci));
 assert(!eligibleVoter(config,{...one,active:false}));
});
test('candidate rules reject self, same team and inactive people without blocking unassigned candidates',()=>{
 assert(!eligibleCandidate(config,one,one));assert(eligibleCandidate(config,one,two));
 assert(!eligibleCandidate({...config,allowSameTeam:false},one,{...two,teamId:'red'}));
 assert(eligibleCandidate({...config,allowSameTeam:false},one,faci));
 assert(!eligibleCandidate(config,one,{...two,active:false}));
});
test('ballots require distinct eligible choices within the configured limit',()=>{
 assert.deepEqual(validateBallot(['two'],config,one,[one,two,faci]),['two']);
 for(const choices of [[],['one'],['two','two'],['two','faci'],['foreign']])assert.throws(()=>validateBallot(choices,config,one,[one,two,faci]));
 assert.throws(()=>validateBallot(['two'],config,faci,[one,two,faci]));
});
test('voting schedule uses inclusive opening and exclusive closing, independent of the race stage',()=>{
 const p={enabled:true,publishedAt:null,opensAt:'2026-10-20T10:00:00Z',closesAt:'2026-10-20T11:00:00Z'},event={archivedAt:null,state:'FINALIZED'};
 assert.equal(votingStatus(p,event,new Date(p.opensAt)),'Open');assert.equal(votingStatus(p,event,new Date(p.closesAt)),'Ended');
 assert.equal(votingStatus(p,{...event,state:'PAUSED'},new Date(p.opensAt)),'Paused');
 assert.equal(votingStatus(p,{...event,archivedAt:new Date()},new Date(p.opensAt)),'Archived');
 assert.equal(votingStatus({...p,enabled:false},event,new Date(p.opensAt)),'Closed');
});
test('voting configuration rejects impossible schedules and incomplete eligibility',()=>{
 const input={name:'Showstealer',instructions:'',opensAt:'2026-10-20T10:00:00Z',closesAt:'2026-10-20T11:00:00Z',config};assert.equal(parseVotingInput(input).name,'Showstealer');
 assert.throws(()=>parseVotingInput({...input,opensAt:'2026-02-31T10:00:00Z'}));
 assert.throws(()=>parseVotingInput({...input,closesAt:input.opensAt}));
 assert.throws(()=>parseVotingInput({...input,config:{...config,maxChoices:4}}));
 assert.throws(()=>parseVotingInput({...input,config:{...config,voterMode:'PEOPLE'}}));
 assert.throws(()=>parseVotingInput({...input,config:{...config,candidateIds:['one']}}));
});

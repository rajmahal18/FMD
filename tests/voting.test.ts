import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseVotingInput,eligibleVoter,eligibleCandidate,validateBallot,votingStatus,type VotingConfig,type VotingPerson} from '../src/lib/voting';
const config:VotingConfig={voterMode:'PARTICIPANTS',voterRoles:[],voterTeamIds:[],voterMembershipIds:[],candidateIds:['one','two','faci'],maxChoices:1,allowSelf:false,allowSameTeam:true};
const one:VotingPerson={id:'one',name:'One',role:'PARTICIPANT',teamId:'red',teamName:'Red',active:true};
const two:VotingPerson={...one,id:'two',name:'Two',teamId:'blue'};
const faci:VotingPerson={...one,id:'faci',role:'FACILITATOR',teamId:null};
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

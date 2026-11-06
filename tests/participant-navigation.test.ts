import {test} from 'node:test';
import assert from 'node:assert/strict';
import {participantVotingFocused} from '../src/lib/participant-navigation';
test('voting focus is opt-in and limited to the post-race stage',()=>{
 for(const state of ['ENDED','FINALIZED'])assert(participantVotingFocused({participantVotingOnly:true,state,archivedAt:null}));
 for(const state of ['PREPARING','READY','LIVE','PAUSED'])assert(!participantVotingFocused({participantVotingOnly:true,state}));
 assert(!participantVotingFocused({state:'FINALIZED'}));assert(!participantVotingFocused({participantVotingOnly:false,state:'FINALIZED'}));assert(!participantVotingFocused({participantVotingOnly:true,state:'FINALIZED',archivedAt:new Date()}));
});

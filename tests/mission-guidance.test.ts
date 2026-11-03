import {test} from 'node:test';
import assert from 'node:assert/strict';
import {missionInstruction} from '../src/lib/mission-guidance';

test('captains and ordinary members get the correct arrival responsibility',()=>{
 assert.match(missionInstruction('ARRIVED',true,undefined,''),/Choose the players/);
 assert.match(missionInstruction('ARRIVED',false,undefined,''),/captain is choosing/);
 assert.match(missionInstruction('HEAD_TO_STATION',false,undefined,''),/captain handles/);
});

test('selection, waiting and facilitator confirmation are never mistaken for completion',()=>{
 assert.match(missionInstruction('QUEUED',true,undefined,''),/timer has not started/);
 assert.match(missionInstruction('AWAITING_CONFIRMATION',true,true,''),/timer has stopped/);
 assert.match(missionInstruction('AWAITING_CONFIRMATION',false,true,''),/until the facilitator confirms/);
});

test('supporting members stay outside the playing area and blocked states retain their message',()=>{
 assert.match(missionInstruction('ACTIVE',false,false,''),/holding area/);
 assert.match(missionInstruction('ACTIVE',false,true,''),/Follow the station instructions/);
 assert.equal(missionInstruction('EVENT_PAUSED',true,true,'Wait for the organizer.'),'Wait for the organizer.');
 assert.equal(missionInstruction('COMPLETE',false,false,'Return to the meeting point.'),'Return to the meeting point.');
});

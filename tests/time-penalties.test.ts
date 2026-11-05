import test from 'node:test';
import assert from 'node:assert/strict';
import {adjustedSeconds,validatePenaltyButtons} from '../src/lib/time-penalties';
test('violation button configuration supports multiple independent time values',()=>{assert.deepEqual(validatePenaltyButtons([{id:'wrong-step',label:' Wrong step ',seconds:10},{id:'boundary',label:'Boundary violation',seconds:30}]).map(b=>[b.label,b.seconds]),[['Wrong step',10],['Boundary violation',30]]);});
test('timer penalties add to recorded elapsed time without inventing missing times',()=>{assert.equal(adjustedSeconds(120,40),160);assert.equal(adjustedSeconds(null,40),null);});
test('invalid or ambiguous penalty buttons are rejected',()=>{for(const seconds of [0,-10,1.5,3601,NaN])assert.throws(()=>validatePenaltyButtons([{id:'violation',label:'Violation',seconds}]));assert.throws(()=>validatePenaltyButtons([{id:'same',label:'A',seconds:10},{id:'same',label:'B',seconds:30}]));assert.throws(()=>validatePenaltyButtons([{id:'a',label:' ',seconds:10}]));});

test("penalty types preserve explicit after-limit and reject invalid phases",()=>{assert.equal(validatePenaltyButtons([{id:"after",label:"Unfinished task",seconds:50,phase:"AFTER_LIMIT"}])[0].phase,"AFTER_LIMIT");assert.throws(()=>validatePenaltyButtons([{id:"bad",label:"Bad",seconds:10,phase:"OTHER"}]));});

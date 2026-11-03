import {test} from 'node:test';
import assert from 'node:assert/strict';
import {participationFor,validatePlayerSelection,type ParticipationVisit} from '../src/lib/participation';

const visit=(id:string,state:string,ids:string[],confirmed=false):ParticipationVisit=>({stationId:id,state,startedAt:['ACTIVE','AWAITING_CONFIRMATION','COMPLETED'].includes(state)?'2026-11-03T01:00:00Z':null,confirmedAt:confirmed?'2026-11-03T01:01:00Z':null,station:{name:id},outcome:confirmed?{id:'result'}:null,players:ids.map(membershipId=>({membershipId}))});

test('played / explored counts individual confirmed play against team admissions',()=>{
 const visits=[visit('one','COMPLETED',['a'],true),visit('two','ACTIVE',['b']),visit('queue','QUEUED',['a']),visit('cancel','CANCELLED',['a'])];
 assert.deepEqual(participationFor('a',visits),{played:1,explored:2,history:[{stationId:'one',name:'one',status:'Played'},{stationId:'two',name:'two',status:'Not selected'}]});
 assert.equal(participationFor('b',visits).played,0);
 assert.equal(participationFor('b',visits).history[1].status,'Playing');
 assert.equal(participationFor('spectator',visits).played,0);
});

test('unconfirmed, cancelled and legacy visits never invent participation',()=>{
 assert.equal(participationFor('a',[visit('one','AWAITING_CONFIRMATION',['a'])]).played,0);
 assert.equal(participationFor('a',[visit('one','COMPLETED',['a'])]).played,0);
 assert.equal(participationFor('a',[visit('one','COMPLETED',[],true)]).history[0].status,'Not recorded');
 assert.equal(participationFor('a',[visit('one','CANCELLED',['a'],true)]).explored,0);
 assert.deepEqual(participationFor('a',[]),{played:0,explored:0,history:[]});
});

test('lineup requires the exact configured count, distinct eligible teammates',()=>{
 assert.deepEqual(validatePlayerSelection(['a','b'],2,['a','b','c']),['a','b']);
 for(const ids of [[],['a'],['a','b','c'],['a','a'],['a','foreign'],null,'a'])assert.throws(()=>validatePlayerSelection(ids,2,['a','b','c']));
 assert.deepEqual(validatePlayerSelection(['a'],null,['a']),['a']);
 assert.throws(()=>validatePlayerSelection([],null,['a']));
});

import {test} from "node:test";
import assert from "node:assert/strict";
import {routeOrder,routeProgress,admission,randomStartingAssignments} from "../src/lib/routes";
test("circular routes wrap once, fixed/free preserve the configured stops",()=>{assert.deepEqual(routeOrder("CIRCULAR",["a","b","c"],"b"),["b","c","a"]);assert.deepEqual(routeOrder("FIXED",["a","b"]),["a","b"]);assert.deepEqual(routeOrder("FREE",["a","b"]),["a","b"]);assert.throws(()=>routeOrder("CIRCULAR",["a"],"other"));assert.throws(()=>routeOrder("FIXED",["a","a"]));assert.throws(()=>routeOrder("FREE",[]));assert.throws(()=>routeOrder("FIXED",["a"],"a"));});
test("confirmed completion unlocks only the next required stop; availability never skips it",()=>{assert.deepEqual(routeProgress("FIXED",["a","b","c"],new Set(["a"])),{complete:false,completedCount:1,unlocked:["b"],paused:[],locked:["c"]});assert.deepEqual(routeProgress("FIXED",["a","b"],new Set(),new Set(["a"])).unlocked,[]);assert.deepEqual(routeProgress("FIXED",["a","b"],new Set(),new Set(["a"])).locked,["b"]);assert.equal(routeProgress("FIXED",["a"],new Set(["foreign"])).completedCount,0);assert.equal(routeProgress("FIXED",["a"],new Set(["a"])).complete,true);assert.deepEqual(routeProgress("FREE",["a","b","c"],new Set(["b"]),new Set(["c"])).unlocked,["a"]);});
test("capacity uses occupied places and FIFO; no queue means full, unlimited ignores queue",()=>{assert.equal(admission(1,true,1,[],"a"),"WAIT");assert.equal(admission(1,false,1,[],"a"),"FULL");assert.equal(admission(2,true,0,["a","b"],"b"),"WAIT");assert.equal(admission(2,true,0,["a","b"],"a"),"ADMIT");assert.equal(admission(null,true,10,["a"],"b"),"ADMIT");assert.throws(()=>admission(0,true,0,[],"a"));});

test("free roam optional first stop remains required until confirmed, including when paused",()=>{
 const ids=["a","b","c"];assert.deepEqual(routeOrder("FREE",ids,"b"),ids);assert.throws(()=>routeOrder("FREE",ids,"foreign"));
 assert.deepEqual(routeProgress("FREE",ids,new Set(),new Set(),"b").unlocked,["b"]);
 const paused=routeProgress("FREE",ids,new Set(),new Set(["b"]),"b");assert.deepEqual(paused.unlocked,[]);assert.deepEqual(paused.paused,["b"]);assert.deepEqual(paused.locked,["a","c"]);
 assert.deepEqual(routeProgress("FREE",ids,new Set(["b"]),new Set(),"b").unlocked,["a","c"]);
 assert.deepEqual(routeProgress("FREE",ids,new Set(),new Set(),null).unlocked,ids);
});

test("bulk randomized starts include each team once and spread starts evenly",()=>{
 for(const teamCount of [1,2,3,5,17,97])for(const stationCount of [1,2,3,7]){
  const teams=Array.from({length:teamCount},(_,i)=>'team'+i),stations=Array.from({length:stationCount},(_,i)=>'station'+i);const before=[...teams];
  for(const seed of [0,.2,.75,.999]){const assignments=randomStartingAssignments(teams,stations,()=>seed);assert.deepEqual(assignments.map(a=>a.teamId).sort(),[...teams].sort());assert(assignments.every(a=>stations.includes(a.startStationId)));const loads=stations.map(id=>assignments.filter(a=>a.startStationId===id).length);assert(Math.max(...loads)-Math.min(...loads)<=1);}
  assert.deepEqual(teams,before);
 }
 assert.throws(()=>randomStartingAssignments([],['s']));assert.throws(()=>randomStartingAssignments(['a','a'],['s']));assert.throws(()=>randomStartingAssignments(['a'],[]));
});

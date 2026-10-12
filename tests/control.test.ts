import {test} from 'node:test';
import assert from 'node:assert/strict';
import {correctionChain} from '../src/lib/control';
const correction=(revision:number,beforePoints:number,afterPoints:number)=>({revision,beforePoints,afterPoints,entries:[{kind:'REVERSAL',amount:-beforePoints},{kind:'REPLACEMENT',amount:afterPoints}]});
test('corrections reverse the current effective result rather than the original result',()=>{assert.equal(correctionChain(100,[correction(2,80,-5),correction(1,100,80)]),-5);assert.equal(correctionChain(200000,[correction(1,200000,-100000)]),-100000);});
test('broken correction revisions, reversal amounts or duplicate entries require review',()=>{assert.throws(()=>correctionChain(100,[correction(2,100,80)]));assert.throws(()=>correctionChain(100,[correction(1,90,80)]));assert.throws(()=>correctionChain(100,[{...correction(1,100,80),entries:[{kind:'REVERSAL',amount:-90},{kind:'REPLACEMENT',amount:80}]}]));assert.throws(()=>correctionChain(100,[{...correction(1,100,80),entries:[...correction(1,100,80).entries,{kind:'REPLACEMENT',amount:80}]}]));});

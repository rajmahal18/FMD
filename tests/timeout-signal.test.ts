import test from 'node:test';
import assert from 'node:assert/strict';
import {timeoutSignal} from '../src/lib/timeout-signal';
test('timeout signal falls back for browsers without AbortSignal.timeout',async()=>{
 const original=AbortSignal.timeout;
 try{
 Object.defineProperty(AbortSignal,'timeout',{value:undefined,configurable:true,writable:true});
 const signal=timeoutSignal(10);assert.equal(signal.aborted,false);
 await new Promise<void>(resolve=>signal.addEventListener('abort',()=>resolve(),{once:true}));assert.equal(signal.aborted,true);
 }finally{Object.defineProperty(AbortSignal,'timeout',{value:original,configurable:true,writable:true});}
});

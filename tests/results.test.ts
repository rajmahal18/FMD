import test from 'node:test';import assert from 'node:assert/strict';import {sharedRanks} from '../src/lib/results';
test('shared ranks use competition ranking for equal totals',()=>{assert.deepEqual(sharedRanks([{name:'A',value:20},{name:'B',value:20},{name:'C',value:10}]).map(x=>x.rank),[1,1,3]);});
test('ranking preserves supplied stable order inside a tie',()=>{const rows=sharedRanks([{id:'a',value:5},{id:'b',value:5},{id:'c',value:4}]);assert.deepEqual(rows.map(x=>x.id),['a','b','c']);});

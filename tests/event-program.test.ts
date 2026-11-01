import test from 'node:test';
import assert from 'node:assert/strict';
import {operationProgram} from '../prisma/operation-program';
import {initialProgramDay,parseEventProgram,programTime} from '../src/lib/event-program';

test('master program covers all three days and includes gala through afterglow',()=>{
 const program=parseEventProgram(operationProgram);
 assert.deepEqual(program.days.map(d=>d.date),['2026-11-04','2026-11-05','2026-11-06']);
 assert.equal(program.days[2].sections.at(-1)?.items.at(-1)?.end,'22:00');
 assert.equal(program.days[2].sections.at(-1)?.items.find(i=>i.id==='showcase')?.end,'18:15');
});
test('default program day uses event timezone, including the midnight boundary',()=>{
 assert.equal(initialProgramDay(operationProgram,'Asia/Manila',new Date('2026-11-04T16:01:00Z')),'2026-11-05');
 assert.equal(initialProgramDay(operationProgram,'Asia/Manila',new Date('2026-11-03T16:00:00Z')),'2026-11-04');
 assert.equal(initialProgramDay(operationProgram,'Asia/Manila',new Date('2026-11-06T00:00:00Z')),'2026-11-06');
 assert.equal(initialProgramDay(operationProgram,'Asia/Manila',new Date('2026-11-10T00:00:00Z')),'2026-11-04');
});
test('program rejects invalid dates, overlaps, duplicate identities and reversed times',()=>{
 for(const mutate of [
  (p:typeof operationProgram)=>{p.days[0].date='2026-02-30';},
  (p:typeof operationProgram)=>{p.days[0].sections[0].items[1].start='11:30';},
  (p:typeof operationProgram)=>{p.days[0].sections[0].items[1].id=p.days[0].sections[0].items[0].id;},
  (p:typeof operationProgram)=>{p.days[0].sections[0].items[0].end='08:00';}
 ]){const copy=structuredClone(operationProgram);mutate(copy);assert.throws(()=>parseEventProgram(copy));}
 assert.equal(programTime('12:00'),'12:00 PM');
 assert.equal(programTime('05:30'),'5:30 AM');
 assert.equal(programTime('22:00'),'10:00 PM');
});

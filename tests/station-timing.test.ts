import {test} from 'node:test';
import assert from 'node:assert/strict';
import {timerSnapshot,stoppedTime,releasePending,stationReleaseDelayMs} from '../src/lib/station-timing';
test('station deadlines preserve the configured duration and cap late finishes',()=>{
 const start=new Date('2026-11-05T00:00:00Z'),ten=timerSnapshot(start,10),eleven=timerSnapshot(start,11);
 assert.equal(ten.timerDeadlineAt?.toISOString(),'2026-11-05T00:10:00.000Z');
 assert.equal(eleven.timerDeadlineAt?.toISOString(),'2026-11-05T00:11:00.000Z');
 assert.equal(stoppedTime(new Date('2026-11-05T00:15:00Z'),ten.timerDeadlineAt).getTime(),ten.timerDeadlineAt!.getTime());
 assert.equal(stoppedTime(new Date('2026-11-05T00:03:00Z'),ten.timerDeadlineAt).toISOString(),'2026-11-05T00:03:00.000Z');
 assert.equal(timerSnapshot(start,null).timerDeadlineAt,null);
});
test('release waits exactly five seconds and expires without a browser action',()=>{
 const now=new Date('2026-11-05T00:00:00Z'),release=new Date(now.getTime()+stationReleaseDelayMs);
 assert(releasePending(release,now));assert(releasePending(release,release.getTime()-1));assert(!releasePending(release,release));assert(!releasePending(null,now));
});

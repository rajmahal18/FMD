import {test} from 'node:test';
import assert from 'node:assert/strict';
import {samplePreviewStation,previewMission,previewField,participantPreviewStates,facilitatorPreviewStates} from '../src/lib/screen-preview';
const now='2026-11-02T04:00:00.000Z';
test('participant previews use synthetic identities and cover mission states without real progress',()=>{
 for(const s of participantPreviewStates){const p=previewMission(samplePreviewStation,s.id,'TIME',now);assert.equal(p.eventId,'screen-preview');assert.equal(p.view.status,s.id);assert.equal(p.agent.id,'preview-agent');assert(p.stationIds.every(id=>id.startsWith('preview-')));assert(!JSON.stringify(p).includes('facilitatorInstructions'));}
 const hidden=previewMission(samplePreviewStation,'DETAILS_HIDDEN','TIME',now);assert.deepEqual(hidden.stations,[]);assert.deepEqual(hidden.visits,[]);assert.equal(hidden.route,null);
});
test('facilitator previews show active/result/queue/history using synthetic visits and retain scoring policy',()=>{
 for(const s of facilitatorPreviewStates){const p=previewField(samplePreviewStation,s.id,'TIME',now);assert.equal(p.eventId,'screen-preview');assert.equal(p.actorId,'preview-facilitator');assert.equal(p.station?.id,'preview-station');assert.equal(p.raceRule,'TIME');}
 const review=previewField(samplePreviewStation,'AWAITING_CONFIRMATION','TIME',now);assert(review.visits[0].startedAt);assert(review.visits[0].finishedAt);
 assert.equal(previewField(samplePreviewStation,'COMPLETED','POINTS',now).history.length,1);
 assert.equal(previewField(samplePreviewStation,'EMPTY','TIME',now).visits.length,0);
});

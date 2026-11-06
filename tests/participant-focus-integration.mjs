import assert from 'node:assert/strict';
export async function verifyParticipantFocus({pg,prepareRace,get,cookies}){
 const g=await prepareRace('Participant voting-only phase'),base=`/events/${g.e}`;
 await pg.query('UPDATE "Event" SET state=$1,"participantVotingOnly"=true WHERE id=$2',['FINALIZED',g.e]);
 const landing=await get(base,cookies.agent);assert.equal(landing.status,307);assert.equal(landing.headers.get('location'),base+'/voting');
 const html=await (await get(base+'/voting',cookies.agent)).text(),nav=html.match(/<nav class="player-bottom-nav"[\s\S]*?<\/nav>/)?.[0];assert(nav);assert.deepEqual([...nav.matchAll(/href="([^"]+)"/g)].map(m=>m[1]),[base+'/voting']);
 assert(!html.includes('>My profile<'));assert(!html.includes('>Event Program<'));
 const facilitator=await get(base,cookies.facilitator);assert.notEqual(facilitator.headers.get('location'),base+'/voting');assert((await facilitator.text()).includes('field-bottom-nav'));
 const organizer=await get(base,cookies.organizer);assert.equal(organizer.status,200);assert((await organizer.text()).includes('Mission Control'));
 await pg.query('UPDATE "Event" SET state=$1 WHERE id=$2',['LIVE',g.e]);assert.equal((await get(base,cookies.agent)).status,200);
 const live=await (await get(base+'/voting',cookies.agent)).text();assert.equal((live.match(/<nav class="player-bottom-nav"[\s\S]*?<\/nav>/)?.[0].match(/href=/g)??[]).length,5);
 await pg.query('UPDATE "Event" SET state=$1,"archivedAt"=NOW() WHERE id=$2',['FINALIZED',g.e]);assert.equal((await get(base,cookies.agent)).status,200);
 await pg.query('UPDATE "Event" SET "archivedAt"=NULL,"participantVotingOnly"=false WHERE id=$1',[g.e]);assert.equal((await get(base,cookies.agent)).status,200);
 console.log('PASS: event-scoped participant voting landing and single navigation link; hidden extra account routes; facilitator/organizer preserved; live/reset/archive/default navigation preserved.');
}

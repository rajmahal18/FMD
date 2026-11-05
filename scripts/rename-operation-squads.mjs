import 'dotenv/config';
import fs from 'node:fs';
import {randomUUID} from 'node:crypto';
import assert from 'node:assert/strict';
const mapping=JSON.parse(fs.readFileSync(new URL('../prisma/operation-squads.json',import.meta.url),'utf8'));
const literal=value=>"'"+value.replaceAll("'","''")+"'";
const eventSlug='operation-classified-fmd';
// Only display labels change. Event IDs, score values, approvals, visibility and audit history stay intact.
export const renameSql=`
CREATE OR REPLACE FUNCTION pg_temp.squad_labels(value jsonb, teams jsonb) RETURNS jsonb LANGUAGE plpgsql AS $labels$
DECLARE output jsonb; item record; next_value jsonb;
BEGIN
 IF jsonb_typeof(value)='array' THEN
  SELECT COALESCE(jsonb_agg(pg_temp.squad_labels(element,teams) ORDER BY position),'[]'::jsonb) INTO output FROM jsonb_array_elements(value) WITH ORDINALITY AS elements(element,position);
  RETURN output;
 ELSIF jsonb_typeof(value)='object' THEN
  output='{}'::jsonb;
  FOR item IN SELECT * FROM jsonb_each(value) LOOP
   next_value=pg_temp.squad_labels(item.value,teams);
   IF item.key='name' AND teams ? (value->>'id') THEN next_value=to_jsonb(teams->>(value->>'id')); END IF;
   IF item.key='teamName' AND ${literal(JSON.stringify(mapping))}::jsonb ? (value->>'teamName') THEN next_value=to_jsonb(${literal(JSON.stringify(mapping))}::jsonb->>(value->>'teamName')); END IF;
   output=output||jsonb_build_object(item.key,next_value);
  END LOOP;
  RETURN output;
 END IF;
 RETURN value;
END $labels$;
DO $rename$
DECLARE event_id text; squad record; target record; team_names jsonb='{}'::jsonb; changes jsonb='[]'::jsonb; changed_snapshots integer=0; affected integer;
BEGIN
 PERFORM set_config('lock_timeout','10000',true);
 PERFORM set_config('statement_timeout','30000',true);
 SELECT id INTO STRICT event_id FROM "Event" WHERE slug=${literal(eventSlug)} FOR UPDATE;
 PERFORM 1 FROM "Team" WHERE "eventId"=event_id FOR UPDATE;
 IF (SELECT count(*) FROM "Team" WHERE "eventId"=event_id)<>5 THEN RAISE EXCEPTION 'Expected exactly five existing squads'; END IF;
 FOR squad IN SELECT * FROM jsonb_each_text(${literal(JSON.stringify(mapping))}::jsonb) LOOP
  IF (SELECT count(*) FROM "Team" WHERE "eventId"=event_id AND name IN(squad.key,squad.value))<>1 THEN RAISE EXCEPTION 'Squad mapping is missing or ambiguous: %',squad.key; END IF;
  SELECT id,name INTO STRICT target FROM "Team" WHERE "eventId"=event_id AND name IN(squad.key,squad.value);
  team_names=team_names||jsonb_build_object(target.id,squad.value);
  IF target.name<>squad.value THEN
   changes=changes||jsonb_build_array(jsonb_build_object('id',target.id,'before',target.name,'after',squad.value));
   UPDATE "Team" SET name=squad.value WHERE id=target.id;
  END IF;
 END LOOP;
 UPDATE "ResultRevision" SET "teamStandingsJson"=pg_temp.squad_labels("teamStandingsJson",team_names),"awardStandingsJson"=pg_temp.squad_labels("awardStandingsJson",team_names)
 WHERE "eventId"=event_id AND ("teamStandingsJson" IS DISTINCT FROM pg_temp.squad_labels("teamStandingsJson",team_names) OR "awardStandingsJson" IS DISTINCT FROM pg_temp.squad_labels("awardStandingsJson",team_names));
 GET DIAGNOSTICS affected=ROW_COUNT;changed_snapshots=changed_snapshots+affected;
 UPDATE "OverallRanking" SET finalized=pg_temp.squad_labels(finalized,team_names) WHERE "eventId"=event_id AND finalized IS DISTINCT FROM pg_temp.squad_labels(finalized,team_names);
 GET DIAGNOSTICS affected=ROW_COUNT;changed_snapshots=changed_snapshots+affected;
 UPDATE "JudgingContest" SET "publishedResults"=pg_temp.squad_labels("publishedResults",team_names) WHERE "eventId"=event_id AND "publishedResults" IS DISTINCT FROM pg_temp.squad_labels("publishedResults",team_names);
 GET DIAGNOSTICS affected=ROW_COUNT;changed_snapshots=changed_snapshots+affected;
 UPDATE "VotingEvent" SET "publishedResults"=pg_temp.squad_labels("publishedResults",team_names) WHERE "eventId"=event_id AND "publishedResults" IS DISTINCT FROM pg_temp.squad_labels("publishedResults",team_names);
 GET DIAGNOSTICS affected=ROW_COUNT;changed_snapshots=changed_snapshots+affected;
 IF jsonb_array_length(changes)>0 OR changed_snapshots>0 THEN
  INSERT INTO "AuditEntry" (id,"eventId",action,"targetId","detailsJson") VALUES (${literal(randomUUID())},event_id,'SQUAD_NAMES_UPDATED',event_id,jsonb_build_object('source','Organizer-requested squad names','changes',changes,'updatedDisplaySnapshots',changed_snapshots,'scoresAndVisibilityUnchanged',true));
 END IF;
END $rename$;`;
const split=renameSql.indexOf('DO $rename$');
const atomicSql=`DO $outer$ BEGIN EXECUTE $setup$${renameSql.slice(0,split)}$setup$; EXECUTE $mutation$${renameSql.slice(split)}$mutation$; END $outer$;`;

if(process.argv.includes('--test')){
 const {PGlite}=await import('@electric-sql/pglite');const pg=await PGlite.create();
 try{
  for(const dir of fs.readdirSync('prisma/migrations').sort()){const f=`prisma/migrations/${dir}/migration.sql`;if(fs.existsSync(f))await pg.exec(fs.readFileSync(f,'utf8'));}
  await pg.query('INSERT INTO "Event" (id,slug,name,state) VALUES ($1,$2,$3,$4)',['squad-event',eventSlug,'Squads','FINALIZED']);
  await pg.query('INSERT INTO "User" (id,email,name,"passwordHash") VALUES ($1,$2,$3,$4)',['owner','owner@example.test','Owner','not-a-password']);
  for(const [i,name] of Object.keys(mapping).entries())await pg.query('INSERT INTO "Team" (id,"eventId",name) VALUES ($1,$2,$3)',['squad-'+i,'squad-event',name]);
  const rows=Object.keys(mapping).map((name,i)=>({id:'squad-'+i,name,rank:i+1,value:95-i*10,breakdown:{regularPoints:530-i*10,finalContribution:20}}));
  await pg.query('INSERT INTO "ResultRevision" (id,"eventId",revision,"actorId",reason,"teamStandingsJson","summaryJson") VALUES ($1,$2,1,$3,$4,$5,$6)',['race','squad-event','owner','Approved',JSON.stringify(rows),'{}']);
  const finalized={rows,sourceRevision:1,raceContributionMethod:'PLACEMENT'};
  await pg.query('INSERT INTO "OverallRanking" ("eventId",config,finalized) VALUES ($1,$2,$3)',['squad-event','{}',JSON.stringify(finalized)]);
  await pg.query('INSERT INTO "ResultSharing" ("eventId",key,"sourceRevision",participants,facilitators) VALUES ($1,$2,1,$3,$4)',['squad-event','race','HIDDEN','PUBLISHED']);
  const sharing=await pg.query('SELECT * FROM "ResultSharing"');
  const judging={name:'Banner',rows:rows.map(r=>({...r,average:r.value,maximum:100})),criteria:[{id:'a',name:'Criterion',maximum:100}],publishedAt:'2026-11-05T00:00:00Z'};
  await pg.query('INSERT INTO "JudgingContest" (id,"eventId",name,config,state,"publishedResults",revision,"participantVisibility") VALUES ($1,$2,$3,$4,$5,$6,7,$7)',['banner','squad-event','Banner','{}','PUBLISHED',JSON.stringify(judging),'HIDDEN']);
  const ballots=[{id:'person',name:'Actual Person',teamName:'Team 1',votes:12}];
  await pg.query('INSERT INTO "VotingEvent" (id,"eventId",name,config,"opensAt","closesAt","publishedResults") VALUES ($1,$2,$3,$4,now(),now()+make_interval(hours=>1),$5)',['voting','squad-event','Award','{}',JSON.stringify(ballots)]);
  await pg.exec(atomicSql);await pg.exec(atomicSql);
  const updated=(await pg.query('SELECT "teamStandingsJson" FROM "ResultRevision"')).rows[0].teamStandingsJson;
  assert.deepEqual(updated,rows.map((r,i)=>({...r,name:Object.values(mapping)[i]})));
  assert.deepEqual((await pg.query('SELECT finalized FROM "OverallRanking"')).rows[0].finalized,{...finalized,rows:updated});
  assert.deepEqual((await pg.query('SELECT * FROM "ResultSharing"')).rows,sharing.rows);
  const contest=(await pg.query('SELECT * FROM "JudgingContest"')).rows[0];
  assert.deepEqual(contest.publishedResults,{...judging,rows:judging.rows.map((r,i)=>({...r,name:Object.values(mapping)[i]}))});assert.equal(contest.revision,7);assert.equal(contest.participantVisibility,'HIDDEN');
  assert.deepEqual((await pg.query('SELECT "publishedResults" FROM "VotingEvent"')).rows[0].publishedResults,[{...ballots[0],teamName:'Blue Huntrix'}]);
  assert.equal((await pg.query('SELECT count(*)::int n FROM "AuditEntry"')).rows[0].n,1);
  assert.equal((await pg.query('SELECT state FROM "Event"')).rows[0].state,'FINALIZED');
  await pg.query('UPDATE "Team" SET name=$1 WHERE id=$2',['Unexpected name','squad-0']);
  await assert.rejects(()=>pg.exec(atomicSql));
  console.log('PASS: existing IDs retained, result/combined labels updated, all numeric scores/placements preserved, sharing/state unchanged, replay is a no-op, ambiguous mappings rejected.');
 }finally{await pg.close();}
}else if(process.argv.includes('--apply')){
 const url=process.env.DIRECT_URL||process.env.DATABASE_URL,target=new URL(url);
 if(!target.hostname.endsWith('.neon.tech')||!['postgresql:','postgres:'].includes(target.protocol))throw Error('Expected the configured Neon database');
 async function send(query,params=[]){const r=await fetch('https://'+target.hostname+'/sql',{method:'POST',headers:{'Content-Type':'application/json','Neon-Connection-String':url,'Neon-Raw-Text-Output':'true','Neon-Array-Mode':'false'},body:JSON.stringify({query,params}),signal:AbortSignal.timeout(45000)});const value=await r.json();if(!r.ok)throw Error(value.message??'Database request failed');return value;}
 // Neon single-query endpoint accepts one statement; wrap temporary function and mutation atomically in a DO block.
 await send(atomicSql);
 const result=await send('SELECT t.id,t.name FROM "Team" t JOIN "Event" e ON e.id=t."eventId" WHERE e.slug=$1 ORDER BY t.name',[eventSlug]);
 assert.deepEqual(result.rows.map(r=>r.name).sort(),Object.values(mapping).sort());
 console.log(JSON.stringify({updated:true,teams:result.rows.map(r=>r.name),existingIdsPreserved:true}));
}else throw Error('Use --test or --apply');

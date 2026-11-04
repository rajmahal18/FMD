import {PGlite} from '@electric-sql/pglite';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
const pg=await PGlite.create(),migration='20261104180000_explicit_result_sharing';
try{
 for(const dir of fs.readdirSync('prisma/migrations').sort()){if(dir===migration)break;const p=path.join('prisma/migrations',dir,'migration.sql');if(fs.existsSync(p))await pg.exec(fs.readFileSync(p,'utf8'));}
 await pg.exec(`INSERT INTO "User" (id,email,name,"passwordHash") VALUES ('migration-actor','migration@example.test','Organizer','test-only');
 INSERT INTO "Event" (id,slug,name,state) VALUES ('existing','existing','Existing event','FINALIZED'),('new','new','Unapproved event','PREPARING');
 INSERT INTO "ResultRevision" (id,"eventId",revision,"actorId",reason,"teamStandingsJson","summaryJson") VALUES ('revision-one','existing',1,'migration-actor','Previous approval','[]','{}'),('revision-two','existing',2,'migration-actor','Current approval','[]','{}');
 INSERT INTO "OverallRanking" ("eventId",revision,config,finalized) VALUES ('existing',7,'{"events":[]}','{"rows":[]}');
 INSERT INTO "VotingEvent" (id,"eventId",name,config,"opensAt","closesAt","publishedAt",revision) VALUES ('existing-vote','existing','Approved award','{}',NOW(),NOW()+INTERVAL '1 hour',NOW(),4);
 INSERT INTO "JudgingContest" (id,"eventId",name,config) VALUES ('old-judge','existing','Existing judge settings','{}');`);
 await pg.exec(fs.readFileSync(path.join('prisma/migrations',migration,'migration.sql'),'utf8'));
 const rows=(await pg.query('SELECT * FROM "ResultSharing" ORDER BY key')).rows;assert.equal(rows.length,3);assert(rows.every(r=>r.participants==='PUBLISHED'&&r.facilitators==='PUBLISHED'));assert.equal(rows.find(r=>r.key==='race').sourceRevision,2);assert.equal(rows.find(r=>r.key==='overall').sourceRevision,7);assert.equal(rows.find(r=>r.key==='voting:existing-vote').sourceRevision,4);
 assert.equal((await pg.query('SELECT "participantVisibility" FROM "JudgingContest" WHERE id=$1',['old-judge'])).rows[0].participantVisibility,'PUBLISHED','Existing explicitly configured visibility stays unchanged');
 await pg.exec(`INSERT INTO "JudgingContest" (id,"eventId",name,config) VALUES ('new-judge','new','New default','{}');`);
 assert.equal((await pg.query('SELECT "participantVisibility" FROM "JudgingContest" WHERE id=$1',['new-judge'])).rows[0].participantVisibility,'HIDDEN');assert.equal((await pg.query('SELECT count(*)::int AS n FROM "ResultSharing" WHERE "eventId"=$1',['new'])).rows[0].n,0);
 assert.equal((await pg.query('SELECT count(*)::int AS n FROM "ResultRevision"')).rows[0].n,2);
 console.log('PASS: migration preserves previously revealed snapshots/settings and history; new events and judged activities default to hidden.');
}finally{await pg.close();}

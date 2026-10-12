# Upgrade from Phase 5

Back up the database. This is a full source ZIP; preserve your private `.env`. Use Node 22.12+.

```sh
npm ci
npm run db:generate
npm run db:deploy
npm run build
```

Keep all six migration folders. The first five migrations are unchanged. The additive Phase 6 migration introduces announcements, saved route changes, score corrections and two ledger kinds. It preserves existing outcomes and ledger rows. Existing station results need no backfill.

The ledger retains one original entry per outcome/kind through a partial unique index. A correction has its own unique revision and paired reversal/replacement entries linked to that same outcome. Foreign keys and sign/bounds checks protect ownership and history. PostgreSQL 12+ is required for the enum additions in this migration; native PostgreSQL/Neon deployment was not verified in this environment. Do not use `db push` or reset migration history.

Mission Control is the organizer event homepage. Facilitators still open their assigned field station; participants still open Current mission. All organizer controls require a server impact preview and reason. A preview is invalidated when relevant event data changes; review again if the server reports that it is stale.

Score corrections replace a station's effective net points, not the team's whole total. Original base/bonus/penalty fields and facilitator receipt remain unchanged. Participant history shows current effective points; field history labels the original result and its corrections. Existing Phase 5 receipts still replay their original confirmation totals.

Preparing events with announcement history cannot be deleted as empty drafts. Announcement withdrawal preserves the record. Live/ended event deletion, destructive resets and archive/retention workflows are not added here.

Reopening an Ended event puts it in Paused for review. Resume separately to reopen normal actions. Finalized result reopening is reserved for Phase 8 revision controls; Phase 6 neither finalizes nor reveals results. Agent Contact remains disabled until policy is chosen.

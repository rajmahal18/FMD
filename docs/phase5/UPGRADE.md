# Upgrade to Phase 5

Back up your database. This ZIP contains the full project; keep your private `.env` when replacing the Phase 4 files. Use Node 22.12+.

```sh
npm ci
npm run db:generate
npm run db:deploy
npm run build
```

Keep all five migration folders. The first four migrations are unchanged. `20261006040000_phase5` adds arrival credentials, adjustment limits, finish timestamps, confirmed outcomes and score ledger entries with event/team/station ownership and uniqueness constraints. Do not substitute `db push`, delete migration history or reset a live database.

Existing stations keep their scoring configuration. Bonuses/penalties default to disabled. In a Preparing event, configure them explicitly if needed and issue the station arrival codes. Print the current sign after replacing a code; the old sign no longer works.

Routes must match their current template revision, and active participants need teams and one active captain per team. Required stations need an available, configured rule, briefing, private instructions, arrival code and active assigned facilitator. Participants and facilitators must finish any mandatory password replacement. Start readiness links directly to each issue; starting revalidates it transactionally.

A Phase 4 `COMPLETED` visit with no matching confirmed outcome and ledger is deliberately not converted into points. The mission shows Review required, and ordinary arrival is blocked. Do not manufacture outcome/score rows as an upgrade shortcut. Phase 4's integration fixtures are test-only; a real event needs an attributable reconciliation workflow before use. Preparing events with existing visits cannot start normally.

Set `APP_ORIGIN` to the exact deployment origin. Camera scanning on phones needs HTTPS; loopback works only on that device. Use your existing production PostgreSQL connection settings. Run the migration and a role-scoped smoke test on the real database before release; native Neon/PostgreSQL deployment was not verified here.

Lifecycle changes, corrections and organizer overrides are Phase 6. Do not change live events through ad hoc SQL to imitate these controls. No remote deployment was performed.

# Upgrade from Phase 3

1. Back up your database and retain private environment configuration.
2. Extract the full project. Run `npm ci`, `npm run db:deploy`, then `npm run build`.
3. Keep Phase 1/2/3 migrations intact. The additive `20261006030000_phase4` migration creates StationVisit and composite ownership indexes; it does not create sample live progress.
4. Sign in as a participant who has an active team and saved route. Current mission shows the first destination while Preparing, plus folded route/team information.
5. No production data seeding or manual visit edits are needed. Live check-in and confirmation will be connected in Phase 5. Keep the event Preparing until then.

Participant pages and the GET mission endpoint recheck event membership. The endpoint uses the signed-in user's team; callers cannot choose another team's ID. Network loss retains the last confirmed view only in the current tab. Sign-out/expired access clears that view upon refresh; no personalized shared cache is added.

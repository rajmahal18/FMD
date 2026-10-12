# Upgrade from Phase 2

1. Back up the database and application configuration.
2. Extract this full project; preserve your private `.env` or deployment secrets. Do not copy node_modules or generated client from earlier releases.
3. Run `npm ci`, `npm run db:deploy`, then `npm run build`.
4. Sign in as event organizer. Open Stations, configure each existing station's directions, private handler instructions and result rules. Existing stations deliberately start as not configured.
5. Open Routes, create the movement plan, assign every team and review starting unlocks. Circular assignments require a starting station.
6. Check Prepare event. Edited templates require team reassignment before route readiness is complete.

The Phase 1 and Phase 2 migrations remain unchanged. New schema is additive in `20261006020000_phase3`. Accounts, sessions, roster and facilitator assignments are retained. Do not reseed a production event merely to upgrade. The readiness checklist does not start the race; live workflow arrives later.

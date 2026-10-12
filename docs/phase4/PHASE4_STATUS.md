# Phase 4 — Participant mission experience

Continues the Phase 3 project and its saved team-route assignments.

## Working
- Individual participant opens Current mission, with team identity/captain, one dominant station card, location, directions and a clear next action.
- Preparing/Ready show a first-destination preview with Awaiting the start. Missing team and missing/invalid routes give explicit organizer-help messages.
- Fixed/circular routes follow saved stop order. Free roam offers a destination selector; browsing a station is read-only and never checks in, changes the team route or records completion.
- Confirmed queued/arrived/active/awaiting-confirmation visits drive the mission card. Queue position is computed from same-event queued visits ordered by timestamp and ID.
- Availability remains distinct from visit progress. Paused/end states preserve history. Fully confirmed routes show Operation complete.
- Folded route/history and team roster show names only; no emails, private facilitator notes, credentials or internal points policy enter participant data.
- Same event/team projection is read inside a repeatable-read transaction. Protected GET endpoint accepts no team ID and always resolves the signed-in participant's current membership.
- Private/no-store responses. Refresh every 10 seconds while visible, immediately on reconnect/visibility return, plus a manual Refresh mission control. Network failures preserve last confirmed state and timestamps. Access revocation removes cached mission content upon the next server check. No localStorage/shared offline cache.
- Additive StationVisit read-model schema with composite event/team/station ownership, one in-flight visit per team, unique team/station visit, required queue timestamp and required completed confirmation timestamp.

## Phase boundary
There are no end-user visit/result writers in this phase. Real check-in, scanner/manual fallback, challenge start, completion, points ledger and one atomic result/progression transaction are Phase 5. The mission explicitly says check-in is not enabled yet; it never presents a fake Scan/Complete button. Database-only integration fixtures exercise future states and are not shipped as product helpers. Confirmed history currently means stored facilitator-confirmation read state; Phase 5 must populate that state together with the authoritative outcome/ledger transaction. No score totals are invented here.

The organizer cannot yet start the race through the app. Existing configured events remain Preparing until the live workflow is implemented. Agent Contact remains disabled.

## Verification
- 14 passing unit tests: auth/validation/routes/admission plus mission gating, arrival versus confirmation, pause/end/completion and free roam.
- Production build and real authenticated HTTP integration: all migrations, repeat seed, existing management/auth regressions, mission access/privacy/no-store, no client completion writes, event ownership/in-flight/confirmation constraints and state progression.
- Browser flows: onboarding and setup regressions, Preparing → destination → queue → active → completed, automatic polling, offline retention/reconnect, free-roam selection without writes and access-revocation clearing; responsive overflow checks at 320/390/768/1440px.
- The constrained single-process Chromium test runner uses separate browser processes for organizer and participant identities to prevent its cross-context fetch-cookie issue. Production permission checks remain unchanged.
- Native PostgreSQL/Neon deployment and event-day camera trial are not verified in this environment.

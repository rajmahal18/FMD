# Phase 5 — Live arrivals and facilitator confirmation

Continues the full Phase 4 project. Physical challenge mechanics remain outside the app.

## Delivered

- Server readiness with direct fix links and an actual organizer start command. Start locks setup and revalidates roster/captains, passwords, assigned staff, station policy/availability, current route snapshots, signs and application origin.
- Organizer-issued event-scoped arrival credentials; printable QR plus readable manual code. Rotation is restricted to Preparing. Participant DTOs expose neither these credentials nor private handler instructions.
- Explicit camera permission, rear-camera preference, HTTPS check, cleanup, readable permission fallback and manual entry. Verification is read-only; explicit captain confirmation writes arrival, never points.
- Capacity, optional FIFO queue, queue departure, admission, challenge start/finish and facilitator review. Assigned station and current event membership are checked on every server operation.
- Fixed/manual scoring with server bounds, zero-base unsuccessful completion, explicitly enabled adjustments and required reasons. Timer records duration but has no automatic scoring effect.
- Transactional confirmed outcome, immutable score ledger entries, completed visit, next destination, queue promotion, audit and request receipt. Event locks serialize state/capacity decisions; database uniqueness and composite foreign keys prevent duplicate or cross-event records.
- One canonical ledger total for facilitator and participant views. Completion read models require a matching outcome/ledger; legacy unbacked completed visits show Review required.
- Pending requests saved before sending, exact-payload retry, recovery after reload, original confirmation replay and persistent normal/recovered result summaries. Actor-scoped tab storage and sign-out cleanup.

## Verification

19 unit tests cover auth, validation, routes/admission, mission states, credential/origin parsing, safe login return, scoring bounds/adjustments and next destination. Production build and TypeScript checks pass.

Authenticated HTTP/database tests apply all migrations and seed twice, then exercise real login, management and live operations. Phase 5 covers fixed/circular/free routes, readiness, sign rotation, captain ownership, facilitator scope revocation, queue/full/FIFO/departure, successful/unsuccessful fixed/manual results, adjustment bounds/reasons, concurrent identical/conflicting retries, canonical totals, paused/ended guards, rate limits and event ownership.

An injected ledger-insert failure proves no partial outcome, receipt, completed progress or queue admission survives. Retrying the same request after removing the fault records the result once. Cross-team ledger linkage is rejected by the database.

Browser tests pass for readiness/start, sign rendering, QR login return and decode, camera track cleanup, manual permission fallback, result review, unsaved manual input across refresh, dropped response followed by reload/retry without duplicate points, persistent confirmation and final 255-point mission completion. Screenshots and overflow checks cover 320/390/1440px; earlier mission regressions also cover 768px. Browser evidence is in `previews/`. The camera test uses the actual printable station QR in a synthetic Chromium video feed; a real phone field trial is still required. The integration runner uses separate browser processes per identity because its constrained single-process Chromium mode can mix fetch cookies across contexts.

## Limits

Database tests use PostgreSQL-compatible PGlite with a single connection pool. Native PostgreSQL/Neon migration, multi-connection load, production HTTPS camera behavior and event-day hardware are not verified. No remote deployment was created.

Mission Control, organizer lifecycle/override/correction workflows are Phase 6. Leaderboard/final results, Agent Contact policy and later event-day hardening remain outside this phase. No controls pretending to implement them are included.

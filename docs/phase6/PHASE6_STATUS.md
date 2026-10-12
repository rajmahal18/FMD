# Phase 6 — Mission Control and audited organizer actions

Continues the Phase 5 project; physical games remain outside the app.

## Implemented

- Live organizer event homepage with confirmed team/station status, canonical ledger totals, attention filters, capacity/queue/staff summary and recent activity. Visible polling, manual refresh, offline retention and access-revocation clearing.
- Real pause/resume/end/reopen-for-review commands. State transition rules close normal writes; original records remain. Finalization/reopening finalized revisions are reserved for Phase 8.
- Station availability, unfinished visit release, explicit physical completion override and captain replacement. Normal facilitator operation stays separate; role/assignment checks remain unchanged.
- Reroute impact preview with preserved completed and unfinished stops, valid configured staff/signs, original assignment history and reason.
- Append-only score correction revisions with paired reversal/replacement ledger entries. Original result/entries remain immutable through the product API. Canonical totals and participant/field histories reflect effective corrected points.
- Event-wide announcements and withdrawal. Participant and facilitator polling receive only active public messages. Original records are preserved.
- Organizer-only audit view with actor/reason/time/impact. Latest 100 visible; all records retained.
- Preview freshness checks against relevant event data, event/actor locks, scope validation, strict payload parsing, same-origin protection and idempotent receipts. Pending retries work for both race and organizer command endpoints.

## Validation

21 unit tests pass, including correction-chain ordering and corrupt revision/reversal/entry rejection. Production build and TypeScript validation pass.

Real authenticated HTTP/database tests cover all preceding phases plus organizer scope and CSRF, stale previews after arrival, pause/resume/end/reopen, station availability, visit release/override, retained completed/in-flight routes and original assignment history, captain replacement, score correction bounds, unchanged original outcome, concurrent identical/stale requests, matching totals across views, announcements/withdrawal, finalized-state rejection and revoked-access replay rejection.

A fault injected before a replacement ledger insert rolls back the correction record, reversal, new total, audit and receipt together. Retrying the same request after removing the fault succeeds once. Composite correction/outcome ownership rejects a correction linked to another outcome.

Browser tests pass for real pause/resume preview and confirmation, announcement publication to participants and withdrawal, correction input retained across refresh/offline/reconnect, organizer lost-response/reload/retry without duplicate corrections, and organizer revocation clearing. Overflow and screenshots cover 320/390/768/1440px. Earlier onboarding, route, mission and QR/facilitator browser regressions also pass. Evidence is saved under `previews/`. The native phone camera, PostgreSQL multi-connection load, Neon migration/deployment and event-day hardware trial remain unverified. SQL/HTTP tests use isolated PostgreSQL-compatible PGlite with a single connection pool. No deployment was created.

## Next boundary

Phase 7: individual Agent Contact, subject to its explicit policy choices. Phase 8: standings, result review, finalized revisions and reveal. Phase 9: real mobile-camera and multi-team field rehearsal. No fake controls for these phases are added.

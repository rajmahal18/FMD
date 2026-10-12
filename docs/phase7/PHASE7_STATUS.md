# Phase 7 — Individual Agent Contact

Continues Phase 6. All award records are separate from race results and the team score ledger.

## Delivered

- Disabled-by-default optional contact policy with explicit per-event organizer selections. Server preview/reason/receipt, preparation lock, window readiness and audited live collection close/reopen.
- Unique unordered interactions or directed commendations, configurable same-team rules, limits, mutual acceptance, commendation reciprocity, visibility and explicitly selected shared ties.
- Active individual identity/team membership checks for issuer, scanner and recipient. Captain privilege is not needed and staff cannot cast participant contacts.
- At most two-minute random QR and rotating eight-digit code; event-scoped collision checks, hash-only storage, revocation and committed attempt budgets. Codes are reusable by different eligible agents.
- Read-only identity preview and explicit scanner confirmation. Optional recipient inbox with accept/decline, pending zero-credit state, expiry, fresh retry and canonical Accepted counts.
- Database pair/directed uniqueness and composite event/identity/credential ownership; event locks and idempotent request receipts protect concurrent retries and limits.
- Camera cleanup, numeric fallback, login return/query removal, server-time expiry guidance, polling, offline last-confirmed view, access clearing and saved pending confirmation recovery.
- Organizer counts/review; private/self/public visibility. Alphabetical public counts are not final standings. Equal counts stay ties.

## Validation

25 unit tests pass, including interaction versus directed keys, inclusive/exclusive window edges, scoped QR/manual parsing and restricted login return. Production build and TypeScript validation pass.

Authenticated HTTP/database tests cover prior phases plus policy gating/freeze, all explicit fields, invalid window, CSRF/role denial, hash-only credentials, read-only identity preview, self/foreign QR denial, expiry after preview, code rotation, concurrent opposite interaction scans, duplicate same/different requests, recipient ownership, pending zero credit, accept/decline/retry, both scoring modes, reciprocity allowed/blocked, limits, private/public counts, policy close/reopen, pause/window/end guards, revoked replay, numeric rate limits and foreign membership constraints.

An injected acceptance failure leaves the record Pending and creates no receipt/credit; retry after fault removal counts it once. Contact rehearsals produce zero team score ledger entries.

Browser tests pass for explicit organizer policy/start, actual expiring QR decode and camera cleanup, login return/query removal, read-only identity review, mutual acceptance, dropped acceptance response/reload/retry without duplicate credit, numeric permission fallback and duplicate confirmation, offline/reconnect and access clearing. Screenshots/overflow checks cover 320/390/768/1440px. Earlier phase browser regressions were also exercised during this phase. Evidence is saved under `previews/`. QR tests use the actual app-rendered credential QR in a synthetic Chromium camera stream. Real-phone HTTPS scanning, native PostgreSQL/Neon deployment, multi-connection load and hardware field rehearsal remain unverified. SQL/HTTP tests use isolated PostgreSQL-compatible PGlite with one connection pool. No remote deployment was created.

## Next boundary

Phase 8: standings, award/result review, final saved revisions and reveal. Phase 9: mobile-camera and multi-team field rehearsal. Contact policy selection remains an organizer action; the release does not activate an award by itself.

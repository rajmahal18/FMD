# Phase 3 — Station configuration and route engine

Continues Phase 2 without replacing earlier migrations or authentication.

## Implemented
- Organizer station files: participant directions, private facilitator instructions, codename/location, operational availability, fixed/manual bounded points, optional time limit, capacity and FIFO queue configuration.
- Named event-scoped fixed, circular and free-roam route templates. Add/remove/reorder stops by readable names; no technical IDs needed.
- Team assignment saves mode, rotated station sequence and template revision. Template edits preserve assignments; previews flag stale revisions and preparation requires reassignment.
- Server rejects empty/duplicate/foreign/unconfigured stops, invalid circular starts, unavailable assignments, invalid points/timing/capacity and foreign team/route combinations.
- Fixed/circular progression unlocks one required stop from confirmed outcomes; free roam unlocks all remaining available stops. Unavailable stations are paused, never silently skipped. Completion returns an explicit complete state.
- Shared capacity admission policy distinguishes ADMIT/WAIT/FULL and prevents overtaking the queue head. Rules are configured now; live occupancy storage and queue movement connect with check-in in Phase 5.
- Role checks, Preparing-only edits, audited commands, idempotent receipts and no private instructions in participant pages.

## Boundary
This is preparation and engine work. No check-in, result submission, points ledger, start-event action or live queue UI is represented as working. Phase 4 builds participant mission views; Phase 5 atomically connects confirmed results to points/progression. Route snapshots preserve stop order, not a frozen copy of station instructions/scoring; setup editing is already blocked outside Preparing. Live reroutes need Phase 6 audited impact handling.

## Verification
10 unit tests cover security/validation, circular wrap, next-stop unlocks, paused stops, full completion, free roam and capacity/FIFO decisions. Production build and authenticated HTTP integration exercise migrations, setup commands, ownership, roles, retries and snapshot preservation. Browser coverage exercises station configuration, circular assignment, previews, existing roster/auth flows and 320px/1440px overflow. Native PostgreSQL/Neon migrate deploy and event-day physical rehearsal remain unverified here.

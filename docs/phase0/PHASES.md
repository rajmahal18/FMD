# Implementation handoff

Phase 0 complete: product contract, visual bible, composition study and phased acceptance baseline. Congeniality policy and exact final brand asset remain explicit pending decisions; event setup stays configurable.

| Phase | Deliverable | Exit evidence |
|---|---|---|
| 1 | Fresh Next.js/TypeScript app, Prisma/Postgres, auth, roles, shared visual shell | Individual session; unauthorized access denied; seeded demo; local startup guide |
| 2 | Minimal event creation, teams, agents, facilitator assignment | Create event and roster through UI without technical keys |
| 3 | Station configuration and route engine | Fixed/circular/free routes; preview; invalid assignments blocked |
| 4 | Participant mission experience | Current station and next action clear on 320px screen; completed race state |
| 5 | Facilitator, scanner/fallback, atomic result recording | Physical challenge workflow; double submit safe; correct points and next stop |
| 6 | Mission Control, announcements, overrides | Pause/reopen/reroute and corrections authorized and audited |
| 7 | Individual Agent Contact | Both policy modes tested; expiry/rate limits/duplicates enforced; policy gating |
| 8 | Standings, result review and final reveal | Totals identical across views; awards separate; final revision saved |
| 9 | Visual and event-day rehearsal | Mobile camera field trial; network interruption recovery; multi-team rehearsal |

## Proposed domain boundaries
Organization/UserAccount; Event/EventMembership; Team/TeamMembership; Station/FacilitatorAssignment; Route/RouteStop/TeamRouteAssignment; StationVisit/StationOutcome; ScoreLedgerEntry; ContactPolicy/ContactCredential/ContactRecord; Announcement; ResultRevision; AuditEntry.

Design conceptual boundaries first; do not mechanically copy all old tables. Uniqueness is event-scoped where relevant. Assignments and outcomes retain event ownership. Server enforces role and station scope on every mutation. Critical mutation receipts use stable request IDs; outcome uniqueness also protects requests with different keys. Finalization and contact redemption require concurrency-safe transactions.

## Reference reuse
Reuse ideas: circular offsets, optional queues, idempotency, score reversals, announcements, audited overrides, scoped reconnect recovery. Reassess implementation before reuse. Do not copy the old UI, generic activity AST, 11-state organizer workflow or account-optional team sessions as individual identities.

## Phase 1 start instructions
Create a new project, not a patch to the supplied ZIP. Target user stack: Next.js/TypeScript, Prisma/Postgres compatible with Neon, Vercel. Tailwind or a small token-based stylesheet is an implementation choice; preserve the visual contract. Verify current dependencies through official sources when installing. Keep secrets out of archives and client code. Select auth based on supported deployment and individual onboarding; document the choice and recovery flow. Ship shared shells in the spy identity immediately. Do not implement later phases as unfinished extra pages.

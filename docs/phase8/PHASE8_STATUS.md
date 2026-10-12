# Phase 8 — Standings, saved revisions and reveal

Continues Phase 7 without changing station scoring or Agent Contact collection rules.

## Delivered
- Organizer Results screen driven by the same score ledger used by Mission Control. Equal team totals receive shared competition ranks.
- Agent Contact award standings remain a separate count-only result. Interaction credits both agents; commendation credits recipients; zero accepted contacts produces no winner.
- Finalization is available only from Ended. It saves an immutable result revision, expires unresolved contact requests, changes the event to Finalized, and reveals that saved snapshot to event members.
- Reopening finalized results returns the event to Ended review, hides the reveal, and preserves every prior revision. A later finalization writes a new revision rather than overwriting history.
- Preview tokens include event stage and current standings so changed scores/contact counts force a fresh review before commit. Finalization uses an event row lock plus a serializable transaction and idempotent request receipt.
- Participant/facilitator result access remains sealed until Finalized. Demo events are identified in the saved revision summary and are not represented as external official results.

## Validation
Run `npm run typecheck`, `npm test`, `npm run build`, and `npm run test:integration`. Native Neon and multi-device rehearsal remain Phase 9 field work.

## Next boundary
Phase 9: real-phone HTTPS camera checks, multi-team concurrency/load rehearsal, field reset/recovery rehearsal and final deployment checklist.

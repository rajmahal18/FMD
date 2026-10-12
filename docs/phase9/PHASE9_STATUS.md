# Phase 9 — Field rehearsal and release gate

Phase 9 adds the software-side rehearsal harness and the event-day acceptance procedure. It does not pretend that desktop CI is a substitute for a real-phone field trial.

## Delivered
- Organizer-only **Rehearsal** screen with live online/offline state, secure-context check, camera API check, viewport display and a protected no-cache server round trip.
- Real browser camera permission/open/stop test. Video remains local to the browser; no frame is uploaded or stored.
- Device-local rehearsal checklist covering captain, facilitator, printed arrival QR/manual code, optional Agent Contact QR/manual fallback, dropped-connection recovery, multi-team queue/capacity behavior, and End → Results → revision/reveal flow.
- Checklist reset is local-only and cannot reset production race data, scores, visits, contacts or final result revisions.
- Protected `/api/events/:eventId/rehearsal-ping` endpoint for testing the exact authenticated deployment path without mutating event state.
- Final field runbook and go/no-go matrix in `docs/phase9/EVENT_DAY_REHEARSAL.md`.

## Release boundary
Automated tests can validate the application logic and browser behavior, but the following evidence must be collected on the actual event hardware/network before calling the deployment field-approved: real rear-camera QR acquisition, printed-code readability, connection-loss/recovery on the real carrier/Wi-Fi, and simultaneous multi-team operation.

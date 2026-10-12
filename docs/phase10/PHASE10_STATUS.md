# Phase 10 — Lifecycle, retention and rehearsal reset

Phase 10 closes the retention gap from the Phase 0 product contract. Real operations are archived instead of destructively cleared; disposable Demo / no official results events get an explicit reset with a stale-safe preview.

## Delivered
- Organizer-only **Lifecycle** screen with retained-run counts and preview-before-confirmation actions.
- Archive preserves the event stage, roster, setup, scores, Agent Contact history, audit trail and immutable final result revisions.
- Archived events are hidden from the default active workspace and appear in a separate Archived operations view.
- Archived events remain readable but normal setup, race, organizer-control, Agent Contact and finalization mutations are blocked until restoration.
- Restore returns the event to the active workspace without rewriting stage/history.
- Demo events can reset rehearsal-run data only after typing the exact event name and reviewing exact current record counts.
- Test reset removes visits, outcomes, score entries/corrections, contact credentials/records, announcements, live reroute records and saved final revisions. Teams, people, stations, routes, assignments, event branding, contact policy and audit history remain.
- Test reset returns the event to Preparing and reopens station availability. Live/Paused rehearsals must be ended first.

## Safety boundary
The destructive reset is deliberately unavailable to non-Demo events. Archive is the retention path for official/live/completed operations. Audit entries are never cleared by the reset.

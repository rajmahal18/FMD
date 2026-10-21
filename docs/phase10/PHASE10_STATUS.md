# Phase 10 — Lifecycle, retention and rehearsal reset

## Existing-event reset update

Review fix: reset audit history now supplies a monotonic run revision without a schema change. Preview tokens include the revision; rendered race/contact actions submit it, and server checks reject stale actions before receipt replay. Regression coverage reproduces an old End operation preview across reset/restart with identical live data, rejects old pending commands and receipts, and verifies current-run actions/retries.

The organizer can now use **Event setup → Reset & archive → Reset event run** on an existing official or Demo event, including Live/Paused/Finalized stages. It returns to Preparing while retaining accounts/passwords, players, facilitators, teams/captains, station QR codes, routes and assignments. An atomic audit checkpoint retains the previous run before operational history and all published results/overall placements are cleared. Voting/contact collection close with configuration preserved. Exact-name confirmation, stale previews, role checks and idempotent retries are enforced. Archived events require restoration first. The legacy Demo-only reset API retains its restrictions. No schema migration is needed.

Validation: 50 unit tests, production build, isolated authenticated integration tests (including checkpoint contents, unchanged-count stale previews, replay, Live/Paused/Finalized resets, preserved identities/setup and event isolation), and an actual headless-browser reset form/preview/confirmation with the 93-person roster at 320/390/768/1440px. No production event was reset. See LIFECYCLE.md for the current behavior; the original Phase 10 notes below describe the earlier Demo-only implementation.

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

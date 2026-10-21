# Operation lifecycle guide

## Archive an official operation
Open **Lifecycle**, give a reason, review the effects, then confirm. The event disappears from the default active workspace but every historical record remains. Use **Archived operations** in the workspace to reopen it. Archived operations are read-only until restored.

## Restore an archive
Open the archived operation from the archived workspace, go to **Lifecycle**, give a reason and confirm Restore. The saved event stage is unchanged; restoration does not resume a paused/live event by itself or alter final results.

## Reset the event for another run
Open **Event setup → Reset & archive → Reset event run**. This works on the existing event, including official events, from Preparing, Ready, Live, Paused, Ended or Finalized. Archived events must be restored first. Give a reason, type the exact event name, review the record counts and effects, then confirm. Resetting from Live or Paused stops that run immediately.

Preserved: event identity/branding, teams, memberships, captains, stations, facilitator assignments, route templates and team route assignments, Agent Contact policy, and audit history.

Cleared from the active run: station visits, confirmed outcomes, score ledger entries, score corrections, time penalties, contact credentials and records, announcements, live reroute records, ballots/choices, and saved result revisions. Overall placements and published overall results are also cleared; component activities, weights and scoring rules stay configured. Voting and Agent Contact collection close, preserving their configuration and schedules. Reopen collection and adjust expired schedules when ready.

The event returns to Preparing and stations return to available. Players and facilitators keep their logins, passwords, team/station assignments, captains and station QR codes. No re-import or repeat password setup is needed for accounts that already completed it. Normal readiness checks still apply before starting again.

Before clearing, the server saves an `EVENT_RUN_RESET_CHECKPOINT` audit entry containing the previous event/run records, voting state and overall results. This is a recovery record for an operator, not a one-click restore feature. It excludes user accounts, passwords and sessions. Existing audit history and idempotency receipts remain. Checkpoint creation and reset commit atomically; failure rolls back both. Preview fingerprints detect changes to the run even when record counts stay the same. Retry uses the same request key to avoid resetting a second time after a lost response.

The older `resetTestEvent` API remains compatible: it still requires a Demo event and rejects Live/Paused events. The organizer UI uses the new `resetEventRun` operation. No schema migration is required.

Each reset advances the event's run revision using its retained reset audit entries. Control, results, lifecycle and contact-policy previews include that revision, so a preview cannot become valid again when the next run reaches the same stage. Race/contact commands carry the revision from the rendered page and check it under the event lock before replaying receipts or writing data. Requests without a revision remain compatible only before the first reset. After resetting, refresh open participant/facilitator pages before submitting new actions; old pending requests receive a reset message instead of modifying the next run. Audit history must remain intact because it defines these run boundaries.

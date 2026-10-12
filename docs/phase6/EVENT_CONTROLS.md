# Mission Control workflow

Mission Control shows confirmed visits and ledger totals, not GPS location. Team dossiers include completed stops, current arrival, captain, route and actionable attention messages. Filter waiting, in-progress, awaiting-confirmation, completed or needs-attention teams. Station cards show admitted/waiting counts and active assigned handlers. Refresh runs while visible and on reconnect; the last confirmed view and unsaved form input survive a lost connection. Revoked organizer access clears the private view at the next check.

Every control follows: enter details and reason → Review → inspect the impact → Confirm. Review alone writes nothing. The server rechecks role, event scope, state and preview freshness under the same event lock used for station results. A changed event requires another preview.

## Lifecycle

- Pause: stops normal arrival/challenge/result writes. Existing visits and scores stay intact. Timers remain wall-clock guidance and do not score automatically.
- Resume: reopens normal actions and admits waiting teams to available free station places.
- End: closes new arrivals and normal results. Unfinished visits remain recorded and earn no automatic points. Ending does not finalize standings.
- Reopen for review: Ended → Paused. Review/correct, then Resume if submissions should reopen.

A retry of an already recorded command returns its original receipt even after a later stage change, provided the actor still has organizer access. A new command must be allowed in the current stage.

## Field changes

Pause/reopen a station without removing its route stops or existing visits. A paused station rejects normal arrivals and challenge actions. A live reopened station can admit waiting teams into free places.

Release unfinished visit cancels that arrival without points or completion. The stop remains due and can be checked in again. This can free a queue place during Live. Confirmed visits cannot be released.

Override physical completion is a separate organizer action for an existing unfinished arrival, including a queued team. It bypasses the facilitator start/finish sequence, requires a reason, and still uses the configured fixed/manual scoring rule and permitted adjustment limits. It writes outcome, ledger, route progress and audit atomically. It is allowed during Live or Paused; paused overrides do not automatically admit another team until resume.

Replace captain only selects another active, password-ready participant already on that team. It does not move agents or change roles. The previous captain loses future arrival/queue-departure authority; existing progress is retained.

## Reroute

Choose an existing same-event route template, with a starting stop for circular routes. The preview shows old and new order. All confirmed stops must remain. An unfinished arrival must remain unlocked on the new route; release it first if that is not possible. New stops require available configured rules, arrival signs and active password-ready staff. The previous full assignment is saved in route-change history before updating the current snapshot. No new route templates are created during Live.

## Score correction

Select one confirmed station outcome. Enter its replacement **net points**, from −100000 to 200000, and an attributable reason. These bounds cover the configured scoring domain; the organizer can reconcile exceptional results independently of normal facilitator point bounds.

Example: original 100, corrected to 80, then to 75. The ledger keeps original +100, reversal −100, replacement +80, reversal −80, replacement +75. The effective result is 75. Route completion and the original physical outcome remain intact. The server rejects a broken correction chain and refuses changes to Finalized results. Corrections are available during Live, Paused or Ended.

## Announcements and audit

Publish a title/message to all active event members. Current mission and field station polls retrieve messages; no email or external message is sent. At most ten announcements are active. Withdraw to remove a message from member views while preserving its original text and audit record.

Recent activity shows twelve records. Audit history shows the latest 100 event actions, actors, times, reasons and control impact descriptions. Full audit and route-change records remain in the database. This is not an export or full-history pagination interface.

## Uncertain response

Organizer commands use the existing pending-request recovery flow. The exact payload and preview are saved in this tab before sending. After a dropped response/reload, Retry saved request returns the original receipt if committed. A stale uncommitted request is rejected without mutation; refresh and review again. Signing out clears pending tab storage. This is not guaranteed offline submission across closed tabs or devices.

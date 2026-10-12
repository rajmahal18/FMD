# Running a physical station round

1. Organizer prepares teams, people, captains, station rules and assigned facilitators, then saves each team's route. New accounts change their temporary password before the event.
2. In Stations, issue a QR/code for each required station. Open its printable sign and place it at the physical station. Replacing a code invalidates previously printed signs.
3. Open Start readiness. Fix every linked issue, refresh the checks, then Start operation. Setup becomes locked.
4. Captain opens Current mission and the arrival screen. Use camera or enter the printed code. A decoded QR only identifies a station. Verify station, review the team/destination, then Confirm team arrival.
5. If capacity is full and queueing is enabled, the team waits in first-in order. A freed place automatically admits the head. The captain may Leave queue. With queueing disabled, a full station creates no arrival; verify again later.
6. Assigned facilitator opens their field station. Start challenge, run the physical game, then Finish challenge. Timing is guidance; it never changes points automatically.
7. Choose successful completion or completed without success. Fixed success uses configured points; manual success must be within configured bounds. Unsuccessful completion has zero base points but still completes the stop. Optional permitted bonuses/penalties need a reason. Review the result, total and next destination, then Confirm completion.
8. The server records outcome, ledger, progression and queue admission together. Participant refresh/polling reveals the next destination and confirmed points. A completed route shows Operation complete.

## Lost connection or response

A pending mutation is saved in this tab before it is sent. Retry saved request sends the same request key and result; if it already committed, the server returns the original confirmation without adding points. Reload can recover a saved pending request even when the team has disappeared from the active station list. The recovered total is the total at that original confirmation, not a newly recalculated current total.

Keep the tab open if the browser cannot save pending requests. Pending storage is scoped to the signed-in actor and event, and cleared on sign-out. It is not a guaranteed offline queue across devices or closed/private tabs. Refresh preserves unsaved facilitator result input. Do not create a second, different result to work around an uncertain response.

## Boundaries

A static station sign is an arrival credential, not proof of physical presence or challenge success. A logged-in assigned facilitator confirms the physical result. HTTPS and camera permission are needed on real phones; manual entry follows the same server validation. Camera tracks stop on decode, stop, hidden page and exit.

One accepted outcome per team/station. No result editing, score correction, bypass completion, pause/resume/end control or final standings UI is included yet. Normal writes reject paused/ended events; a retry of an already recorded request still returns its original receipt. Agent Contact remains disabled and separate from team points.

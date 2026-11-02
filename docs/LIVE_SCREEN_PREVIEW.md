# Live screen preview

Staff can inspect live screen layouts before starting the event, even with incomplete or empty setup. This is separate from event rehearsal, event state transitions, and actual team progress.

- Organizer: **Event setup → Live screen preview**, or the preview link on Event details. Switch between participant and facilitator screens.
- Facilitator: **Live screen preview** on the station page while Preparing/Ready, or under Account. Only the facilitator screen is available. Configured stations are limited to the facilitator's own assignments.
- Participants cannot open the preview route, including direct URLs. Active individual identity, event membership and staff role are checked on the server. Previewing participant screens is organizer-only.

Choose a sample screen state and station. Where authorized station setup exists, the preview uses that station's text, requirements and result policy. Missing text is explicitly labelled as sample text. A generic sample station is also available, including when nothing is assigned or configured. Team names, identities, visits, progression and timing are synthetic, not impersonated roster members or recorded outcomes.

The preview renders the same `ParticipantMission`, `FacilitatorBoard` and `PlayerShell` components used by live pages. Mission/Station/Team/History/Tools tabs and local result review can be inspected. Recording actions are disabled; in-preview navigation cannot lead into live actions. Exit preview remains a real link.

Preview context bypasses live polling, pending-request recovery and draft storage effects. It never reads/clears real draft or retry namespaces, and cannot sign out the real session. Sample IDs are outside the real event/identity/visit namespace. Opening or using preview does not update readiness, event stage, attendance, scores, assignments or audit entries. Normal live components retain their existing behavior outside the preview provider.

No database migration is required. Validation includes fixture unit tests, permission/station-scope/incomplete-setup integration tests, and `SCREEN_PREVIEW_BROWSER_ONLY=1` with `test:theme` for responsive layouts, local review, no API traffic over a polling interval, unchanged event data and retained draft/retry sentinels.

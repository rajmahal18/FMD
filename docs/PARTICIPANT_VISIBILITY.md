# Participant visibility

Organizers manage two independent switches under **Event setup → Event details → Participant visibility**, followed by **Save participant visibility**.

- Hide event details removes the welcome briefing, event codename and dates from participant event context and denies access to the program/schedule content. The event name and branding still identify the event.
- Hide station details removes stations, station IDs, route assignments and visit history from participant mission responses. The mission and Stations tab explain that details are not released. Direct check-in pages, arrival previews, participant race actions and cached receipt replays are blocked on the server while hidden.

Team/profile access, announcements, voting, Contact and published standings keep their existing permissions. Organizer and facilitator access is unchanged. The switches can be saved outside Preparing, including Ready and Live; archived events remain read-only. Changes are audited with before/after values and use the existing idempotent management command path. Live actions serialize against the same event lock.

These are manual release controls, not a schedule: starting the event or reaching its date does not reveal details automatically. Connected mission screens refresh within ten seconds. Previously viewed information, screenshots or already-open program pages cannot be recalled.

Both values default to visible, preserving existing behavior. Deploy the additive `20261102010000_participant_visibility` migration before deploying the new application build. Existing events are not automatically hidden.

Validation: `npm run test:integration` covers authorization, direct access, independent hide/reveal, audits/idempotency, hidden payloads, check-in/replay denial and preserved staff access. Set `PARTICIPANT_VISIBILITY_BROWSER_ONLY=1` for the focused `npm run test:theme` pass covering mobile layouts, contrast and keyboard/save interaction.

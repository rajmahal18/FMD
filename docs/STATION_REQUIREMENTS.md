# Station requirements

Under **Event setup → Stations**, each station's existing configuration form includes **What participants need**:

- Brawn: optional whole number 0–5, displayed as fist emojis.
- Brain: optional whole number 0–5, displayed as brain emojis.
- Number of players: optional whole number 1–1000, describing players needed for that challenge, not simultaneous-team capacity.

A rating of 5 fills all five icons. A zero rating shows `0/5` with inactive icons; blank means not set and is omitted from participant display. Existing stations start with no values. These fields are informational and do not change scoring, routes, readiness or team-size enforcement.

Organizers edit them with the existing station rules while Preparing. Server validation and database constraints enforce ranges. Omitted fields from older forms/scripts preserve saved requirements; an explicitly blank field clears it. Changes are included in the normal station-configuration audit.

Participants see saved requirements below the current station's location and alongside stations in their route/availability list. Requirements use the existing participant mission projection and refresh flow. **Hide station details** removes the entire station payload, including these new fields.

Apply `20261102020000_station_requirements` before deploying the application build. `npm run test:integration` covers validation/persistence/permissions/visibility and preserves existing race behavior. Set `STATION_REQUIREMENTS_BROWSER_ONLY=1` for the focused `test:theme` browser pass (editor save, full/zero icon counts, mission/list/hidden displays, mobile layouts and contrast).

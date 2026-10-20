# Station timing and violation buttons

Amazing Race can rank purely by speed: the lowest sum of confirmed station elapsed times plus recorded time penalties wins. Travel and queueing are excluded. Equal adjusted totals remain tied. Configure and save **Shortest total station time, including time penalties** in Team Building Overall Ranking while Preparing. It is the default for new configurations; existing saved event rules are preserved.

## Facilitator and organizer flow

1. Open Field Station. Facilitators see only assigned stations; organizers can select any event station.
2. Open **Configure violation buttons**. Add one or more named buttons, each with its own whole-number seconds (for example, Wrong step +10, Boundary violation +30). Review and save. Buttons are shared by that station's handlers and may be edited during Preparing, Ready, Live or Paused.
3. Start an admitted team's challenge. The running timer shows elapsed time, confirmed penalties and their adjusted total. The existing challenge time-limit warning remains available.
4. During the active challenge, press a violation button for each observed violation. Each successful tap creates a separate attributed record. Repeated intentional violations add time again; retrying the same saved request never duplicates its penalty. No confirmation dialog interrupts each normal penalty tap.
5. If a penalty was entered accidentally, open Recorded penalties, choose Void this penalty and supply a reason. Voiding is available during an active challenge or while awaiting confirmation. Original values and attribution remain in history.
6. Finish the challenge. New penalties are then closed. Review elapsed time plus penalties, and confirm station time. Confirmation atomically saves the raw duration, penalty total, existing outcome/ledger records and route progression. Changed penalty totals require a fresh review. Completed penalties cannot be altered through the live controls.

In time-only mode the field completion form asks for station time, rather than points, bonuses or point penalties. Existing point records remain compatible, but they do not determine time-only race placements. Member mission history, organizer team totals and final race results show confirmed adjusted times. The overall contribution uses the saved final race placements.

## Persistence and access

- All writes verify active identity, event membership, facilitator assignment or organizer role on the server. Archived events are read-only. Applying or voiding a penalty requires a Live event and an available station.
- A station supports up to 20 buttons, with 1–3600 seconds each. A visit is limited to 24 hours of accumulated active penalties. Button IDs and labels are validated.
- Editing/removing a button never rewrites old penalties. The saved label, seconds and actor remain on each entry. A tap from an outdated screen is rejected if the button's current label or seconds no longer match.
- Revision checks prevent handlers from overwriting one another's button configuration. Unique request receipts and browser retry storage preserve exact requests across uncertain responses, including separate storage slots for different buttons on the same visit.
- Raw duration and penalty snapshots remain separate. Missing start/finish timing is not silently replaced by zero for final race ranking. Time-only finalization requires all assigned stations and timing records.
- Demo resets explicitly preview the penalty-entry count and remove those entries with their visits. Official events retain history through archive.

## Deployment and validation

Run `npm run db:deploy` with the existing overall-ranking migration and `20261020010000_station_time_penalties` before deploying the updated code. The migration adds station configuration fields, a zero-default outcome penalty total and a separate penalty-entry table. Existing points, durations and event rules are preserved; no production migration is run by this implementation task.

Unit tests cover configuration bounds, adjusted time arithmetic and speed ranking independent of points. Authenticated integration covers assignment/state checks, concurrent retries, stale presets, attributed voids, frozen confirmation snapshots and weighted overall placements. Browser checks cover real facilitator setup/taps/void/confirmation and mobile layouts.

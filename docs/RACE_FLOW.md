# Arrival policies and shared Final Station

Organizer configuration: **Event setup → Prepare event → Arrival, lineup & Final Station**. Save while Preparing, before visits exist. Existing events retain `CAPTAIN_CONFIRM`; deployment never switches a live event's timing policy. Settings include a stale-value check, permissions, audit and idempotent receipt.

| Timing setting | Lineup confirmation | Timer starts |
| --- | --- | --- |
| Facilitator starts timer (`CAPTAIN_CONFIRM`, legacy `PRESELECT_APPROVAL` / `ARRIVAL_LINEUP_APPROVAL`) | Assigned facilitator selects who will not play, reviews the remaining players and confirms | Confirmation after admission |
| QR starts timer (`SCAN_APPROVAL_TIMED`) | Assigned facilitator selects who will not play and confirms | Admitted QR arrival; queued teams start only on admission |

The captain records arrival only. Every regular station uses facilitator-owned lineup confirmation. With 19 eligible members and 15 required players, the facilitator selects four sit-outs; the other 15 become the locked lineup. The server checks active membership, assignment, exact required count and a current roster/count snapshot. Stale selections must be refreshed. Legacy captain submission/start/advance-lineup commands cannot write a lineup. Previously saved advance lineups remain historical records and are not applied automatically.

Arrival and confirmation use idempotent race requests. Instructions remain private until ACTIVE. Queue waiting is excluded; confirmation preserves any existing start timestamp. Already started and historical lineups stay unchanged. Sit-outs are not an attendance declaration and do not trigger an automatic incomplete-squad penalty. Final Station retains its shared full-team flow.

## Final Station setup and start

Create/configure a dedicated station with assigned facilitators and an explicit time limit, include it in every team's route, then designate it in the race-flow settings. Readiness validates the designation and every team route. Its position does not block regular station progression, and normal QR/start/advance-lineup commands cannot start it. Do not assign it as a free-roam required first stop.

All teams must have valid, facilitator-confirmed regular outcomes, with consistent completion/ledger history. HQ shows the ready-team count and rechecks all prerequisites transactionally. Only an active organizer can start the shared countdown while Live; all open regular visits must be resolved. The HQ confirmation asks that all squads are assembled. One transaction creates every team's ACTIVE final visit with the same start, one event-wide deadline, and its full active roster. Normal per-station capacity/queue limits do not stagger this shared start. Replayed HQ requests return the original receipt; a fresh second start is rejected.

Participants and assigned facilitators see the server-based shared countdown. Final success is 100 and failure 50, stored atomically with the regular outcome ledger/progression. This is explicitly marked `isFinal`; regular failed stations keep their existing zero-base rule. A recorded finish before the shared deadline is required for success. Finish after expiry is capped to the deadline and can only receive failure. Expiry does not invent an outcome: facilitators still review and confirm the physical result. Organizer corrections remain audited; individual release/manual-completion overrides cannot bypass this flow.

Timers use wall-clock time, including pauses; pause blocks mutations rather than extending the shared deadline. Final results require explicit review/confirmation, never client-side automatic score writes. Archive blocks mutations. Run reset checkpoints final timestamps, visits, submitted/advance lineups and scores, then clears operational timestamps/lineups while preserving setup and identities. Hidden station details also hide finale details and saved lineups from participants.

## Scoring scope

This adds final outcome points and arrival policies. It does **not** change existing total-time ranking into per-station ranking points, replace overall placement credits with actual judged/normalized scores, or change overall weights. Those scoring conversions remain separate outstanding work. Previously finalized snapshots are not rewritten.

## Deploy and verify

Deploy `20261103180000_arrival_policies_final_station` before deploying the new app. No live database is modified by tests. `npm test`, `npm run build`, and `node tests/integration.mjs` cover existing flows plus policy sequencing, current-roster validation, permissions, start preservation, queue admission, all-team final gate, shared start/replay and fixed 100/50 deadline handling.

After building, run `tests/theme-smoke.mjs` with `ARRIVAL_FLOW_BROWSER_ONLY` set to each of `PRESELECT_APPROVAL`, `SCAN_APPROVAL_TIMED`, `ARRIVAL_LINEUP_APPROVAL` for real browser actions and 320/390/768/1440px layouts/contrast. `FACILITATOR_LINEUP_BROWSER_ONLY=1` checks captain arrival, facilitator sit-outs, timer start and the sticky selection dock. Integration uses an isolated PostgreSQL-compatible database.

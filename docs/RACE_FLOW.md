# Arrival policies and shared Final Station

Organizer configuration: **Event setup → Prepare event → Arrival, lineup & Final Station**. Save while Preparing, before visits exist. Existing events retain `CAPTAIN_CONFIRM`; deployment never switches a live event's timing policy. Settings include a stale-value check, permissions, audit and idempotent receipt.

| Policy | Lineup | Timer starts | Facilitator action |
| --- | --- | --- | --- |
| Captain confirmation (existing) | After QR verification | Captain confirms players, after admission | Finish and confirm |
| Advance lineup | Captain may save for an unlocked station before arrival | Facilitator approves recorded arrival and submitted lineup | Approve arrival + lineup, then finish/confirm |
| QR starts timing | Only after facilitator approves recorded arrival | Server records the valid QR arrival; when queued, starts on admission | Approve arrival; captain submits players to begin play |
| QR + lineup approval | Submitted with/after QR arrival | Facilitator approves arrival and lineup | Review selected players, approve, finish/confirm |

Recording arrival is a write through the existing idempotent race API; the read-only arrival-preview endpoint never starts timing. For the QR-start policy, the browser records the verified scan automatically through a persisted race request. Pending responses retain safe retries. Instructions stay private until the visit becomes ACTIVE, even when timing is already running during approval/selection. Selection remains captain-owned and validates current active team membership and exact required count; facilitators cannot bypass approval through the old start action. Queue waiting is excluded under every policy. Approval/selection never resets an existing start time. Selection is not full-squad arrival attendance and does not trigger an automatic incomplete-squad penalty.

## Final Station setup and start

Create/configure a dedicated station with assigned facilitators and an explicit time limit, include it in every team's route, then designate it in the race-flow settings. Readiness validates the designation and every team route. Its position does not block regular station progression, and normal QR/start/advance-lineup commands cannot start it. Do not assign it as a free-roam required first stop.

All teams must have valid, facilitator-confirmed regular outcomes, with consistent completion/ledger history. HQ shows the ready-team count and rechecks all prerequisites transactionally. Only an active organizer can start the shared countdown while Live; all open regular visits must be resolved. The HQ confirmation asks that all squads are assembled. One transaction creates every team's ACTIVE final visit with the same start, one event-wide deadline, and its full active roster. Normal per-station capacity/queue limits do not stagger this shared start. Replayed HQ requests return the original receipt; a fresh second start is rejected.

Participants and assigned facilitators see the server-based shared countdown. Final success is 100 and failure 50, stored atomically with the regular outcome ledger/progression. This is explicitly marked `isFinal`; regular failed stations keep their existing zero-base rule. A recorded finish before the shared deadline is required for success. Finish after expiry is capped to the deadline and can only receive failure. Expiry does not invent an outcome: facilitators still review and confirm the physical result. Organizer corrections remain audited; individual release/manual-completion overrides cannot bypass this flow.

Timers use wall-clock time, including pauses; pause blocks mutations rather than extending the shared deadline. Final results require explicit review/confirmation, never client-side automatic score writes. Archive blocks mutations. Run reset checkpoints final timestamps, visits, submitted/advance lineups and scores, then clears operational timestamps/lineups while preserving setup and identities. Hidden station details also hide finale details and saved lineups from participants.

## Scoring scope

This adds final outcome points and arrival policies. It does **not** change existing total-time ranking into per-station ranking points, replace overall placement credits with actual judged/normalized scores, or change overall weights. Those scoring conversions remain separate outstanding work. Previously finalized snapshots are not rewritten.

## Deploy and verify

Deploy `20261103180000_arrival_policies_final_station` before deploying the new app. No live database is modified by tests. `npm test`, `npm run build`, and `node tests/integration.mjs` cover existing flows plus policy sequencing, current-roster validation, permissions, start preservation, queue admission, all-team final gate, shared start/replay and fixed 100/50 deadline handling.

After building, run `tests/theme-smoke.mjs` with `ARRIVAL_FLOW_BROWSER_ONLY` set to each of `PRESELECT_APPROVAL`, `SCAN_APPROVAL_TIMED`, `ARRIVAL_LINEUP_APPROVAL` for real browser actions and 320/390/768/1440px layouts/contrast. `PARTICIPATION_BROWSER_ONLY=1` checks the existing captain-start flow and sticky lineup count. Integration uses an isolated PostgreSQL-compatible database.

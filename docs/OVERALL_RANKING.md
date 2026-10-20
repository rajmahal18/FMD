# Team Building Overall Ranking

Amazing Race is the app-managed station activity. Overall Ranking combines its saved placements with manually entered placements from other team building activities, using the same registered teams.

New configurations start with an editable Amazing Race activity at 40%. Activity weights must total exactly 100% to finalize. Drafts may be incomplete; live feedback states the amount still needed or exceeding 100%. Placement credits default to 100/90/80/70/60, remain editable, and the last rule covers all lower places. Contribution = activity weight * placement credit / 100. Input precision is two decimal places; calculated contributions retain six decimal places.

## Amazing Race winning rule

Select and save the rule while the event is Preparing, before marking it Ready. New setup defaults to shortest total station time, including recorded time penalties. Points do not determine placement in this mode. Existing points-only and points-with-time-tiebreak rules remain available for backward compatibility. Existing configurations without a rule retain points-only ranking. The server rejects changes after Preparing, including rule changes through the API or by omitting the setting.

Points always come from the existing confirmed score ledger. Challenge time sums the recorded facilitator start-to-finish durations for the team's assigned route. It excludes travel and queueing. Each station outcome saves the raw elapsed duration and the sum of non-voided time penalties separately. Race time sums these adjusted durations across required stations. Under the time tiebreak rule, every team needs all assigned stations completed with timing records before the race can be finalized. An organizer override without recorded timing remains pending; no invented time or DNF credit is assigned. Equal adjusted station times remain a shared tie in time-only mode, with competition ranks such as 1, 2, 2, 4. The legacy points-with-time-tiebreak mode compares points first, then adjusted time.

Amazing Race Results and saved race revisions use the selected rule. Automatic overall contributions use the actual placements in the latest finalized race revision, never a separate points-only recomputation. Until the race is finalized its overall contributions remain pending.

## Partial, published and outdated results

Until all activity results are complete and weights equal 100%, organizer totals are partial and listed alphabetically without overall placements. Finalization saves the configuration, standings and source race revision. Participants and facilitators can access Team Building Overall Ranking from navigation, but receive only published final standings. Draft configuration, partial totals, actor IDs and audit history are not returned by the member results endpoint.

Reopening Amazing Race results marks dependent published overall results outdated inside the same transaction. The old overall snapshot remains preserved; it is hidden from members and organizers see a review notice. Race re-finalization does not silently republish overall results: reopen, review and finalize the overall results explicitly. Reads also verify the source race revision and stage to seal mismatched or legacy snapshots. Demo race resets invalidate dependent published overall results as well.

Organizer writes require active identity and event membership, reject stale revisions and are blocked for archived events. Explicit overall reopening retains the previous final snapshot in audit history. Station points and Agent Contact scoring remain separate. Absence, DNF and disqualification policies remain deferred pending organizer direction.

## Deployment and verification

Apply the additive migration 20261020000000_overall_ranking with npm run db:deploy before using the screen. No existing score or roster columns are changed. No production migration is applied by this implementation task. Follow-up corrections reuse the JSON configuration and snapshot fields and need no additional migration.

Unit coverage exercises weighted arithmetic, precision, partial results, placement credits and explicit time tiebreaks. Authenticated integration covers database timing aggregation, saved race placements, rule freezing, member publication privacy, stale invalidation and re-finalization. Browser checks cover 320/390/768/1440px layouts, weight feedback, partial totals and published/sealed member screens.

Timer penalty setup and event-day handling are described in TIME_PENALTIES.md. Deploy the additional additive migration 20261020010000_station_time_penalties before using time penalties.

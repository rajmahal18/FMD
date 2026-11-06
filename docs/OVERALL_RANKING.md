# Team Building Overall Ranking

Amazing Race is the app-managed station activity. Overall Ranking combines saved race placements, published judging placements and optional manual placements, using the same registered teams.

New configurations start with an editable Amazing Race activity at 40%. Activity weights must total exactly 100% to finalize. Drafts may be incomplete; live feedback states the amount still needed or exceeding 100%. Placement credits default to 100/90/80/70/60, remain editable, and the last rule covers all lower places. Tied placements receive the average credit of their occupied rank slots: two teams tied first receive (100 + 90) / 2 = 95 each, and third receives 80. Three teams tied first receive 90 each, and fourth receives 70. The last configured credit still covers lower slots. Pending/missing placements do not occupy tie slots. Published snapshots remain immutable; reopen, review and finalize to apply changed computations to previously published results. This tie-credit change does not convert total-time race scoring into per-station rank scoring.

Contribution = activity weight * placement credit / 100. Input precision is two decimal places; calculated contributions retain six decimal places.

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


## Automatic judging sources

Judge averages determine the activity's placements. Overall contributions use the configured placement credits, just like Amazing Race: 100/90/80/70/60 by default. Contribution = component weight * placement credit / 100. A first-place Gala squad receives the full 45 points even if its actual judge average is below 100; first place in Banner or Chant receives 5 points. Ties split the credits of occupied slots: two tied first receive 95 each, so Gala contributes 42.75 each and Banner/Chant contribute 4.75 each.

Raw judge sheets, sums, averages and published activity ranks are preserved. Missing or incomplete activity ranks receive no invented credit; partial averages remain visible in the organizer preview while the contribution stays pending. Official overall approval still requires every included source to be approved. The detailed sheet shows the raw average, activity rank, placement credit and weighted contribution in separate columns.

New overall snapshots record judgingContributionMethod=PLACEMENT. Earlier approved snapshots using actual-score normalization are preserved but treated as outdated, hidden from member views until reopened, reviewed and approved under the current method. No schema migration is needed. Existing source visibility, publication and sharing safeguards continue to apply.

## Automatic judging previews

Organizer draft standings use live averages of submitted judging sheets for linked activities and refresh every 10 seconds. Partial averages show submitted sheets only; placement contributions stay pending until activity ranks are complete. Missing/draft sheets are not zero. Overall places remain pending until every activity is complete and weights total 100%. Complete unpublished contests appear in preview automatically, while official finalization continues to require publication. A visibility toggle never changes scoring or an immutable final snapshot. Member-facing final overall results are withheld if a linked judging component is hidden from that member's role, preventing indirect disclosure through totals/breakdowns.


## Detailed overall breakdown

Open Combined results > Open detailed score breakdown, or choose Detailed overall breakdown from Results. The sheet keeps squad names frozen at the left and contains its horizontal scrolling inside the table on phones. Grouped activity columns show submitted judge totals, sum, average, activity rank, placement credits where applicable, weighted contribution, total overall points and overall rank. A jump selector reaches an activity or the final totals; individual judge columns can be hidden. Display values use two decimal places, while canonical ranking precision is preserved.

The organizer sees submitted-only partial previews and no overall rank until all components are complete. Draft sheets never appear as judge scores and missing values are not zeros. The sheet uses existing ranking formulas; special awards are excluded unless configured as championship components. It refreshes every ten seconds while visible.

Detailed sharing uses the separate overall-breakdown key in ResultSharing, default Hidden for both audiences. Only approved, current combined results may be shared, after the included source results and combined summary are visible to that audience. The sharing preview explicitly includes judge names and per-judge totals. Sharing the summary alone never shares individual judge scores. Hiding sources or the summary withdraws detailed access; reopening, changed source revisions and stale combined results seal the sheet. Re-sharing a source does not silently restore detailed sharing. Member API responses contain no table data while hidden.

No schema migration is needed. Verification: node tests/overall-breakdown-integration.mjs; OVERALL_BREAKDOWN_BROWSER_ONLY=1 node tests/theme-smoke.mjs; full integration and unit suites.

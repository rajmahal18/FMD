# Product contract

## Purpose and scope
A reusable coordinator for physical station-based team events. The app tells each team where to go, records facilitator-confirmed outcomes, applies points, tracks progress and supports a separate individual contact award. Station games take place outside the app.

Do not build quiz blocks, expression editors, tournament brackets, generic activity publishing or a game dictionary engine. Optional station descriptions may explain any physical challenge without implementing its mechanics.

## Roles and entry points
- Organizer: event list, setup checklist and Mission Control. Can manage all stations and make audited corrections.
- Facilitator: immediately opens assigned station(s), not the organizer navigation. Can act only on assigned stations unless explicitly granted broader permission.
- Participant: authenticates as an individual agent, belongs to an event and optionally a team. Opens the current assignment. Individual identity is required for Agent Contact; a shared team code is not individual authentication.
- Team captain: configurable responsibility to check the team in. Other members can read synchronized progress. Organizer can replace the captain.

Phase 1 decides authentication provider and onboarding transport. The contract requires verified, revocable individual access, organizer-provisioned membership and no unrestricted creation of voting identities. Do not collect unnecessary personal data. An account may participate in multiple events with separate memberships.

## Preparation
Create event with name and timezone; dates and branding can be filled afterward. Then add teams/agents, facilitators and stations. Arrange routes, select scoring and award settings, run readiness checks, then start. Event creation must not demand a full roster or station plan.

Each station contains name, optional codename, location, participant directions, facilitator instructions, assigned staff, scoring policy and operational availability. Capacity/queueing is optional and initially off. No activity object is needed.

Routes support same fixed order, circular order with different starting stations, or free roam. Free roam optionally requires an assigned first station before captain choice opens. Organizers can randomize first stations for all teams in one action, review the complete preview, and save all assignments atomically while Preparing. Team and station order are randomized and starts are distributed evenly. Stale previews must be regenerated. Per-team assignment remains available. Existing free-roam assignments without a starting station remain unrestricted. Participants see station occupancy, queue counts and operational availability; arrival rechecks capacity on the server. Complex conditional routes are deferred until a real requirement. Show a per-team route preview before assigning. Changing routes during a live event requires an impact preview and reason; preserve the original assignment and completed visits.

## Live station flow
1. Participant sees one primary current-station card, location and next action.
2. Captain scans the station QR or enters its manual code, selects exactly the configured player count (at least one if no count is configured), and confirms the lineup. If admitted, this atomically records the lineup and starts the official server timer. Timing includes reading instructions and preparation; participant station instructions are withheld until the visit starts. A queued lineup is saved without starting timing; after admission the captain confirms the players and starts. Started lineups are locked. Scanning alone never records success or points.
3. Assigned facilitator sees the lineup, individual played/explored counts and station history, then finishes and confirms the physical challenge. Legacy visits at stations without a player requirement may still use facilitator start; missing historical lineups are never inferred.
4. Confirmation shows team, station, points, bonus/penalty and next destination.
5. One server transaction records the outcome, corresponding score entries and progression. A duplicate request returns the original result. Team screens refresh the confirmed state.

Primary verification is authenticated facilitator approval. Static station QR is an arrival credential, not proof a challenge was completed. No shared facilitator PIN as the default. Organizer manual completion is a separate permissioned override with a reason.

UI states: Head to station → Waiting (optional) → Challenge in progress → Awaiting confirmation → Completed. Availability such as Station paused is distinct from visit progress. A completed team sees Operation complete rather than No active task.

Current Amazing Race policy: new configurations rank the lowest sum of confirmed station elapsed times plus recorded time penalties. Travel and queueing are excluded. Assigned facilitators and organizers configure station-specific violation buttons and record penalties during active challenges. Each penalty is attributed; mistaken entries may be voided with a reason before station confirmation. Raw time and penalty totals are preserved separately. Existing events retain their explicit ranking rule; no live event is silently converted.

Default scoring policy for a legacy points-based event: configured fixed points on successful completion. Optional alternative: facilitator enters a result within organizer-defined bounds. Timing can be recorded without affecting ranking. Lower-time ranking is only enabled with an explicit rule. Bonuses/penalties require reason and preview of resulting total. No implicit score dimensions exposed to users.

Team total = confirmed station points + confirmed bonuses − confirmed penalties. One canonical calculation drives participant totals, Mission Control and standings. Retries do not sum points automatically; choose the attempt policy before starting. Default is one accepted outcome per team per station. Corrections append reversals/replacements with attribution; no destructive edits to history.

Additional organizer-selected arrival/approval policies and the event-wide Final Station gate/countdown are documented in [RACE_FLOW.md](../RACE_FLOW.md). Existing captain-confirmation timing remains the default; deployment never silently switches a live event policy.

## Event controls
Visible stages: Preparing, Ready, Live, Paused, Ended, Finalized. Start validates setup on the server. Pause blocks normal race mutations and contact issuance/redemption; authorized corrections remain available with an explanation. End closes new submissions; review results before finalizing. Final results are saved revisions. Reopening requires an explicit organizer action and reason; supersede rather than overwrite a prior final revision.

Readiness checks must verify actual configured requirements: active roster and team assignments; stations and staff; complete valid routes with no missing stops; scoring bounds; available authentication and QR credentials; award window/policy if enabled. Pending participant/facilitator temporary-password changes are nonblocking reminders: organizers can start while others are pending, but each account still completes its password change before protected access. Organizers may generate missing station arrival codes in one atomic, idempotent action during Preparing, preserving existing codes and signs, then print all issued signs together. Every blocking issue has a readable description and a direct fix link. No schema-only Ready indicator.

## Agent Contact / Congeniality
Keep award scoring separate from team race scoring. Feature is disabled until organizer selects a policy and event window.

Two explicit modes:
- Unique interaction: one unordered pair of agents per event, credited once to both agents after the required confirmation. Mutual interaction is valid; scanning again cannot add another contact.
- Commendation: one directed giver→recipient record per event. Reciprocity is allowed or restricted by chosen rules. Outgoing limit, same-team eligibility and result visibility are configurable.

Boss must confirm mode, same-team eligibility, outgoing limits, mutual confirmation and tie rules. Do not silently adopt five votes or cross-team-only. Default safety stance while pending: no award collection. Public live award rankings default hidden; organizer sees reviewable records. Equal counts remain a tie unless an explicit tie rule is configured.

Server issues unpredictable short-lived QR tokens with rotating numeric fallback. Token expiry, issuer, event membership, participant status, window, pair uniqueness and policy are validated at redemption. Resolve identity then confirm before recording. Numeric attempts are rate limited; codes must be collision-safe within the event. Server time determines expiry. Expiration during confirmation yields a readable rescan prompt and no partial record. Per-giver redemption is unique; do not globally consume a displayed contact token on the first scanner unless the product explicitly uses a one-contact handshake.

Short-lived codes reduce delayed sharing; they do not prove physical presence or prevent live relay/collusion. Do not promise scan-only anti-cheat. If meaningful interaction is required, make the confirmation explicit and give organizers review tools without automatic accusations.

## Event-day reliability
QR scanner requires HTTPS, rear-camera preference, explicit permission, camera cleanup on exit, retry and manual code entry. Both scanner and code follow the same server validation. No fake success on decode alone.

On connection loss show Last confirmed update with timestamp. Persist an idempotent request before sending; display Pending confirmation and retry safely. Never unlock a station or award points from client-only state. No guaranteed offline Agent Contact: fresh token validation needs connectivity. No personalized shared service-worker cache. Refresh must preserve unsaved facilitator inputs.

Destructive deletion is available for drafts/test events with confirmation. Live/completed events use archive or an explicitly scoped, audited retention workflow. Organizers may explicitly reset an existing event run from any stage with exact-name confirmation and an impact preview, retaining accounts, roster and setup. Save the previous run in an atomic audit checkpoint before clearing operational records and returning to Preparing. Test events are visibly labeled and excluded from official results. See ../phase10/LIFECYCLE.md.

## Screens and acceptance
Organizer: event list, setup checklist, people, station editor, route preview, Mission Control, results/award review, audit history.
Participant: sign-in/join, agent identity, current station, scan/code, route history, contact credential/confirmation, final results when permitted.
Facilitator: assigned station selector, waiting/active teams, result confirmation, recent outcomes, correction request.

Acceptance scenarios: create a small event without technical keys; run different starting routes; complete an offline physical challenge and record it once; double-tap safely; correct points with traceable history; pause/end safely; deny an unassigned facilitator; explain expired/invalid QR; recover a dropped response without duplicates; hide award results; separate interaction-pair uniqueness from directed commendations.

## Individual voting awards

Organizers may create separate voting awards such as Showstealer. Voter eligibility (participants, roles, teams or selected individuals), candidates, own opening/closing window, maximum distinct choices, self-voting and same-team voting are configurable event data. Each voter submits one final ballot; every selected candidate receives one equal-weight vote. Review is required before submission. Voting stays separate from all race and Agent Contact scoring. Its schedule can extend beyond the race; parent pause/archive blocks submissions. Totals stay organizer-only until final publication. Rules lock after the first ballot, ties share placement, and publication saves an immutable result snapshot. Preserve active identity/event/role checks, idempotent atomic ballot recording and audit/retention behavior. See ../VOTING_EVENTS.md.

## Judged contests

Organizers may configure team or individual contests with criteria/maxima and assigned facilitator judges. Each judge independently drafts, reviews and submits a score per criterion per entrant. Equal-weight average of submitted judge totals determines the final result; publication requires every assigned judge/entrant sheet, and exact ties share rank. Criteria/entrants/assignments lock after the first draft or score. Judges see only their own sheets; organizers review all submitted breakdowns and can explicitly reopen scores with a reason. Parent pause/archive blocks score entry, while judging can continue after the race ends. Keep judging separate from race points, contact and voting. Preserve idempotent writes, revisions, private projections, publication snapshots and reset checkpoints. See ../JUDGING.md.

## Individual station participation

Played means the player was selected on a completed, facilitator-confirmed visit (including an unsuccessful physical result). Explored means distinct stations their current team was admitted to, including an ongoing visit; queued and cancelled visits are excluded. Display ?1 played / 2 explored? with station history in participant Team/Profile and staff roster/field views. Waiting or unconfirmed results do not earn played credit. Participation remains separate from race scoring; existing completion is the atomic source of confirmation. Reset checkpoints include visit lineups, and reset/deletion cascades visit lineups.

## Participant inbox and Double Agent offers

Organizers can send an individually addressed offer with a subject and message. Participants read only their own event inbox and explicitly confirm Yes or No once. Active event organizers receive email copies and response notifications and can inspect per-recipient sending status. Email buttons open the authenticated offer review; opening a link never records a response. SMTP acceptance is distinct from delivery/read confirmation. Failed emails may be retried; uncertain attempts must not automatically resend. Offers and responses remain separate from role permissions, race scores and Double Agent gameplay. Paused/archived events are read-only. See [INBOX.md](../INBOX.md).

Offer composition supports one atomic batch to multiple participants, at most one from each assigned team per send, with a complete recipient preview. Each message and response remains private and independent; the recipient list is organizer-only. Optional private attachments are shared across the batch, downloadable only by authorized recipients/organizers, and included in offer/copy emails. Upload validation, limits and idempotency apply on the server. These offers do not assign Double Agent permissions or mechanics.

## Categorized individual voting

Organizers may select Male & Female categories for a single award such as Agents of the Night. Explicit candidate-category assignments are saved with award rules; profile M/F values are setup suggestions only. Voters select exactly one eligible candidate per category and submit both as one atomic final ballot. Rankings and ties are independent per category, and published snapshots preserve assignments. Existing generic polls retain their original rules. See ../VOTING_EVENTS.md.

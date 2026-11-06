# Voting events

Voting awards (for example, Showstealer) are separate from Amazing Race, Agent Contact and weighted team scores.

## Configure

Open **Event setup ? Voting events ? Create voting event**. Choose a name, instructions, opening/closing times, voters and candidates. Voters may be all active participants, selected roles, selected teams or named event members. Candidates are explicitly selected active event members. Configure 1–50 maximum distinct choices per ballot, self-voting and same-team eligibility. At least two candidates and an eligible candidate for every eligible voter are required.

The form accepts the administrator's device-local time and labels that timezone. Configuration review and all displayed event schedules use the parent event timezone. New polls are disabled; merely creating one cannot open voting. Closed polls without ballots may be edited. Rules and schedule are locked after the first ballot; published results are immutable.

## Run

Open **Live operations ? Voting controls**. Enable voting to follow its own schedule, close it early if needed, and publish final results after collection is closed or the time window ends. The voting window is independent of race stages, including after race finalization. A paused or archived parent event blocks ballot submission. Re-enabling is allowed only within the unchanged window and before publication.

Players use **Open voting** on the mission page or **Account ? Voting events**. Facilitators have a Voting events link and may vote only when included by the chosen rules. Select 1 to the configured maximum candidates, review, then submit one final ballot. Each choice gives one equal-weight vote. Ballots cannot be edited; duplicate submissions and retried saved requests do not add votes.

Organizers see totals and turnout. Other members see only their own ballot until publication, then the saved final totals and placements. No live counts or other voters' selections are returned in the member API. Equal positive totals share competition rank (1, 1, 3); zero-vote candidates have no rank. This is authenticated voting, not a claim of anonymous ballots: voter membership and choices are stored for integrity, but individual ballot choices are not listed in the organizer UI or audit feed.

## Integrity and retention

Every server read/action verifies an active individual account and event membership; setup and collection/publication require organizer role. The server validates the voting window, pause/archive, voter rules, current candidate eligibility and choice limits. Ballot and choices commit atomically, with event/voter locks, composite event-scoped foreign keys and a unique poll/voter constraint. Management receipts make retries idempotent. Audit entries record configuration changes, collection controls, submissions and publication; ballot audit entries report choice count rather than candidate selections.

Published result snapshots remain stable. Events with voting history cannot be deleted as empty drafts. Archive preserves all voting data. Demo reset previews ballot counts, clears only ballots/choices and publication, disables polls, and preserves configuration/audits. No schema changes remove or rename existing tables/columns. Deploy additive migration `20261020020000_voting_events` before deploying code that reads voting tables.

## Validation

Unit tests cover eligibility modes, self/team restrictions, distinct choices/limits, valid schedules and pause/archive handling. Integration checks exercise real authenticated APIs, member privacy, permissions, scheduling, post-race ballots, idempotence/concurrent retries, immutable rules, tied final snapshots and demo reset. `VOTING_BROWSER_ONLY=1 node tests/theme-smoke.mjs` covers actual setup, the 93-person roster, enabling, player ballot/review/receipt, ineligible staff and publication at 320/390/768/1440 px.

## Agents of the Night / Male & Female

Choose Ballot format > Male & Female - one submission in voting setup. A blank award name becomes Agents of the Night; the name can still be edited. Select candidates and review each person's Male/Female category. Known M/F profile values provide suggestions; missing values require explicit organizer assignment. Category assignment is event configuration, never inferred from names, and does not modify profiles. Each candidate belongs to exactly one category, both need candidates, and every eligible voter must have an eligible candidate in each under the existing self/team rules.

Participants choose one candidate in each of two sections, review both, then submit one final ballot. One ballot and two choices commit atomically; partial ballots and two choices from one category are rejected by the server. Search retains selections. Receipts label each choice by category. Assignments lock after the first ballot and remain stable if profiles change.

Organizer preview and published results rank Male and Female candidates independently. Positive equal totals share rank within their category; zero-vote candidates remain unranked. Published snapshots retain category, name, votes and rank. Generic polls and existing publications remain unchanged. No schema migration is needed; rules and snapshots use existing JSON fields.

Validation: node tests/category-voting-integration.mjs checks combined ballots, partitions, frozen assignments, atomic retries and result snapshots. After building, set CATEGORY_VOTING_BROWSER_ONLY=1 and run node tests/theme-smoke.mjs for actual setup, voting, receipts and separate results at 320/390/768/1440px. Tests use isolated databases.


## Per-squad awards (Cornerstone)

Choose **Per squad - members and assigned handler vote** as the ballot format. One voting event automatically includes active squad members as candidates and voters, plus each assigned active squad handler as a voter. Each person chooses one member of their own squad. Self-votes are blocked. Each squad needs at least two active participants.

The server saves candidate groups and squad names from event membership. Results rank independently per squad, with shared first place for tied positive totals and no placement for zero votes. Approval and audience sharing remain separate actions. Existing voting events are not modified, and no migration is needed.


## Simple voter screen

Participants and facilitators use the same focused voting desk, separate from organizer controls. Only eligible awards, their own recorded ballots, or explicitly shared results appear. An award list shows Vote now, Submitted, Not open yet, or Results available. A single assigned award opens directly.

Male/Female ballots show one category at a time: choose Male, continue to Female, review both choices, then submit. Single awards show the selected name before review. Switching awards preserves unsubmitted choices while the page remains mounted. Confirmed server ballots show a completed receipt rather than another voting form. An interrupted response offers Check submission using the saved request key. Candidate changes, closed voting, archive state and organizer sharing retain existing server rules.

Validation: EASY_VOTING_BROWSER_ONLY=1 node tests/theme-smoke.mjs covers participant and facilitator eligibility, multi-award navigation, retained choices, category steps, review/edit and interrupted submission recovery.


## Final Congeniality rule: five choices

The final Most Congenial format allows 1 to 5 distinct people from Agents I met in one final ballot. Each chosen person receives one vote; votes cannot be stacked on the same person. Self-votes and unmet people remain blocked. There is no Male/Female quota on the five choices, but results still rank Male and Female candidates separately with shared ties. The 40-contact scanning limit is independent of this five-vote limit.

The configuration uses maxChoices=5, no ballot categories, and resultCategories for the Male/Female winner groups. Older two-category met-agent ballots remain supported so existing votes are never reinterpreted. Other award formats are unchanged. No schema migration is needed.


## Final update: direct Congeniality voting

Most Congenial now uses congeniality=true, without metAgentsOnly. Every active participant can select 1 to 5 distinct active participants directly; scanning and Agents I met are not prerequisites. Self-votes remain blocked, one final ballot is allowed, and Male/Female result groups still determine the winners with shared ties. Contact history and its 40-person limit remain separate and optional. The original met-only formats remain supported for existing historical configurations. No migration is needed.


## Participant voting-only phase

Event.participantVotingOnly is an opt-in navigation flag, default false. For enabled events in Ended or Finalized state, participants land directly on Voting and see only the Voting tab. Other event navigation and the inbox shortcut are hidden; identity, password/security, wake-lock and sign-out controls remain. Facilitator and organizer navigation is unchanged. Live/Preparing/Ready/Paused and archived events keep normal navigation, so a reset or resumed race does not lose its mission controls. Existing routes and server permissions are preserved; this is a navigation focus mode.

Migration 20261106020000_participant_voting_focus adds one default-false boolean column without deleting or resetting records. Enable it per event. The Operation Classified event was configured explicitly, leaving other events off. Verification: participant-navigation.test.ts, full integration suite and MEETING_VOTING_BROWSER_ONLY browser checks.

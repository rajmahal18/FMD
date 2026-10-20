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

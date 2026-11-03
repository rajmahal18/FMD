# Squad handlers

In **Event setup → Teams & agents**, open a team and use **Assign a squad handler**. Choose an active facilitator from the same event. Each squad has at most one handler and each facilitator handles at most one squad in that event. Clear the selection to remove the duty before assigning that facilitator elsewhere. Assignment uses the normal organizer-only Preparing-stage controls, stale-value protection, idempotent receipts and audit history. Existing teams remain valid without a handler; no duty is assigned automatically.

This is a team duty, not a new authentication role. A handler remains a facilitator, keeps separately assigned station permissions and never becomes a captain or selectable station player just from this assignment. Team rosters, participant Team tab and facilitator setup show the handler identity and avatar. Removing a facilitator or changing their role removes the handler duty while preserving accounts and recorded votes. Run resets preserve handler setup.

## Voting

Voting configuration can **Include squad handlers** as candidates. This adds active assigned handlers to the existing selection; it does not replace selected participants or add every facilitator. Individual candidate selection and existing rules still apply. Published and already-started ballots are never silently rewritten to add new candidates.

For voters, **Assigned squad handlers only** is an explicit eligibility option. The default All active participants does not include them. Existing selected-role and individual voter modes continue to work. Team-only voter mode still uses participant membership and does not silently add handlers. A handler's assigned squad is used for same-team candidate restrictions, and voter-facing candidates show the squad-handler label and squad name. Removing a duty changes current handler eligibility but does not delete historical ballots.

## Deploy and verify

Apply `20261103210000_squad_handlers` before deploying the app. It adds an empty assignment table with same-event foreign keys and unique team/facilitator constraints. No roster, station permissions or voting configurations are modified by the migration.

`npm test` covers handler voting scopes and same-squad exclusions. `node tests/integration.mjs` covers assignment/permission/stale/replay guards, team projection, separate station permissions, real handler votes, handler-only voters and removal/role-change cleanup. After building, `SQUAD_HANDLERS_BROWSER_ONLY=1 node tests/theme-smoke.mjs` exercises the real assignment form, quick-add candidate selection, team identity, ballot submission and 320/390/768/1440px layout/contrast checks in an isolated database.

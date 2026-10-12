# Spy Chase — Phase 10

Continues the existing Phase 6 project. Next.js 16.3.8 + TypeScript + Prisma 7.10 + PostgreSQL. The app coordinates physical station games; it does not implement the games themselves.

See [Phase 10 status](docs/phase10/PHASE10_STATUS.md), [lifecycle guide](docs/phase10/LIFECYCLE.md), [Phase 9 status](docs/phase9/PHASE9_STATUS.md), [field rehearsal runbook](docs/phase9/EVENT_DAY_REHEARSAL.md), [Phase 8 status](docs/phase8/PHASE8_STATUS.md), [Phase 7 status](docs/phase7/PHASE7_STATUS.md), [upgrade steps](docs/phase8/UPGRADE.md), [contact workflow](docs/phase7/CONTACT_WORKFLOW.md), [organizer controls](docs/phase6/EVENT_CONTROLS.md), and [station workflow](docs/phase5/EVENT_DAY.md).

## Working now
- Phase 10 lifecycle controls: archive/restore with read-only mutation gates, plus exact-preview destructive reset for Demo / no official results events.
- Active workspace hides archived operations by default; archived history remains accessible and restorable.
- Organizer-only field rehearsal console: HTTPS/camera/network/server checks plus a device-local go/no-go checklist.
- Individual Agent Contact: disabled until an explicit event policy and window are configured.
- Unique interactions or directed commendations, optional recipient consent, limits and reciprocity rules.
- Expiring QR/numeric fallback, identity preview, immutable accepted uniqueness and safe pending retries.
- Private/self/public individual counts, organizer review and zero effect on team race points.
- Mission Control team/station status, attention filters, canonical points and audit history.
- Organizer pause/resume/end/reopen, station availability, visit release and reasoned completion overrides.
- Live reroute preview preserves confirmed/current stops and original assignment history.
- Immutable score correction chain with reversal/replacement entries; all views share effective ledger totals.
- Event announcements and withdrawal, visible in participant/facilitator polling.
- Readiness checks and a real Start operation action close setup and open captain arrival.
- Printable station QR/manual codes; explicit camera permission, camera cleanup and manual fallback.
- Assigned facilitator board: admit/start/finish physical challenges, review fixed/manual results, then confirm.
- Atomic confirmed outcome, score ledger, progression and FIFO queue admission; duplicate retries return the original result.
- Canonical team points and persistent pending confirmation recovery after a dropped response/reload.
- Participant Current mission: first destination, location, directions, team/captain and folded route history.
- Read-only confirmed visit states, queue position, pause/end and explicit Operation complete.
- Private auto-refresh, manual refresh, offline last-confirmed view and reconnect recovery.
- Individual login, event-specific roles and restricted station access from Phase 1.
- Minimal event creation: name + timezone; test-event checkbox is optional.
- Guided preparation checklist; edit event name, dates, codename, welcome briefing and accent.
- Upload a PNG/JPEG/WebP event logo (up to 1 MB), with protected retrieval and preserved proportions.
- Create/edit teams; delete only empty teams.
- Add people as agents, facilitators or event organizers; move agents between teams and choose one captain per team.
- New accounts receive a random temporary password shown once. First-login password change is mandatory. No public signup and no automatic emails/messages.
- Existing accounts are linked without changing their name or password. Removing event access preserves their account and other events. Re-add by email to restore event access.
- Add station names/locations and assign facilitators to selected stations. Configure station briefings, private handler instructions, points, timing and optional capacity/queues in Stations.
- Create fixed/circular/free-roam routes, reorder stops, assign per-team starting stations and inspect saved route previews.
- Route template revisions preserve existing assignments; server validates all event ownership and station rules.
- Delete a Preparing event with an exact-name confirmation. Users and audit history are preserved.
- Organizer-only, same-event validation and transaction-backed audit records. Duplicate management requests do not create duplicate records.

## Fresh Windows / Neon startup
Use Node 22.12+ and a PostgreSQL database. Neon works without Docker.

1. Extract to e.g. `C:\dev\spy-chase`; open a terminal in the project directory.
2. Run `npm ci`.
3. Run `Copy-Item .env.example .env` in PowerShell.
4. Set DATABASE_URL to your pooled Neon connection, DIRECT_URL to its direct connection, and APP_ORIGIN to `http://localhost:3000`.
5. Run `npm run db:generate` and `npm run db:deploy`.
6. For a local demo, set SEED_PASSWORD in `.env` to a unique 12–128 character password and run `npm run db:seed`.
7. Run `npm run dev`; open http://localhost:3000.

Demo emails: organizer@example.test, facilitator@example.test and agent@example.test. The chosen seed password is used only when creating new demo accounts. Seed reruns preserve existing passwords and assignments. The demo organizer can create events. Do not seed a production roster.

## Upgrade from Phase 1
Back up the database first. Extract this full project into your working folder, preserving your private `.env`. Run `npm ci`, `npm run db:generate`, then `npm run db:deploy`. All migration folders must remain; do not replace migration history or use db push as a substitute.

The new migration defaults event-creation permission to false for existing accounts. For the demo organizer, re-running the explicit demo seed grants it. For your own organizer account, use `npm run admin:grant -- your-email@example.com`. This grants only the platform permission to create events; access to existing events still requires their organizer membership. No account password is changed by the grant command.

See docs/phase2/UPGRADE.md for the migration details and troubleshooting.

## Create a real first organizer without demo data
In PowerShell set `$env:NEW_PASSWORD = '<unique temporary password>'`, then run:

```powershell
npm run admin:create -- your-email@example.com "Your Name"
Remove-Item Env:NEW_PASSWORD
```

Use a new email. It creates an individual event creator, requires password replacement on first login, and leaves event creation to the UI. It refuses to overwrite an existing account. For an existing account, use admin:grant instead. Only a trusted platform operator with database access should run these scripts.

## Organizer flow
Sign in → My events → Create event → Prepare event → Teams & agents → Facilitators.

Add teams, then people. Existing emails keep their own account credentials. For a new account, save the generated password immediately, share it privately yourself, and acknowledge the credential panel. The app sends nothing on your behalf. The recipient signs in and sets their own password before seeing protected event screens.

People are removed from the event, not deleted globally. Choosing a captain replaces the previous captain for that team. Changing a facilitator to another role clears their station permissions. Your own organizer access cannot be removed through this UI.

Configure Stations and Routes, issue printable arrival signs, and have new accounts finish their password change. Start readiness lists remaining issues with fix links. Start operation rechecks everything on the server before opening arrival.

## Password recovery
Self-service password change is available through Password & access. It requires the current password and revokes all sessions after saving. Forgotten/lost credentials still use the operator-assisted reset: set NEW_PASSWORD in the environment and run `npm run user:password -- email@example.com`, then clear the environment value. Reset revokes sessions and requires another password change at first login.

Temporary passwords are never saved in receipts, audit records or plaintext database fields. If a creation response is lost, retry with the same form request: the account is not duplicated, but its password is not displayed again. Contact the platform operator to reset it. Do not submit repeatedly with different emails to work around a lost response.

## Validation
`npm run typecheck`, `npm test`, `npm run build`.

`npm run test:integration` builds the app and checks real HTTP/database flows using isolated PGlite, without Neon credentials. It uses loopback ports 3100/5545; stop other processes using these ports first. Browser checks are optional: supply PLAYWRIGHT_MODULE (path to a Playwright core module), and CHROMIUM_PATH if required. Browser screenshots go to QA_OUTPUT or the system temp directory.

`npm run test:theme` runs the theme browser smoke checks against a separate PGlite database on ports 3188/3189/5546. A local HTTPS proxy tests the production Secure cookie without weakening application settings. It checks the roster import and repeat import, browser sign-in, mobile tabs, decorative layer positioning, theme assets, keyboard focus, QR surfaces, printing, reduced motion and page overflow at 320/390/768/1440px. Set CHROMIUM_PATH to a Chromium browser executable and OPENSSL_PATH to OpenSSL if needed; Windows defaults to Microsoft Edge and Git's OpenSSL. Screenshots and check results are written to `.tmp/stability-evidence/`. It does not seed or change the configured application database.

Current software evidence and scope: docs/phase9/PHASE9_STATUS.md. The real-device acceptance sequence is docs/phase9/EVENT_DAY_REHEARSAL.md. Historical phase evidence is retained. Browser QR checks additionally need ffmpeg to create a synthetic camera stream from the actual printable QR.

## Vercel / Neon
Set DATABASE_URL, DIRECT_URL and APP_ORIGIN to the exact HTTPS deployment origin. Build command: npm run build. Run db:deploy against the intended database before releasing the new app. Do not automatically seed production. The Secure __Host- session cookie requires HTTPS in production. vercel.json targets sin1. No remote repository or deployment was created during this phase.

Native Neon migration/deployment remains untested in this execution environment. Initial and additive migration SQL were applied and tested through the PostgreSQL-compatible PGlite adapter. A real database migration and smoke test are required before production.

## Release gate
The Phase 9 software harness is included. Field approval still requires the real-phone, printed-QR, venue-network and multi-team rehearsal described in docs/phase9/EVENT_DAY_REHEARSAL.md. Keep docs/phase0/PRODUCT.md and DESIGN.md authoritative.

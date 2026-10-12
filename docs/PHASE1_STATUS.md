# Phase 1 delivery — 6 October 2026

Implemented a fresh project. Phase 0 contracts are bundled under docs/phase0. No source files from the reviewed old MPW app were copied.

## Delivered
- Next.js 16.3.8, React 19, TypeScript and Prisma 7.10/PostgreSQL adapter with lockfile.
- Initial schema and SQL migration: individual users, hashed opaque sessions, events, event memberships/roles, teams, stations, facilitator assignments, login budgets and audit entries.
- Working sign-in/logout, assigned-event selection and organizer/facilitator/participant screens.
- Event isolation, active user/membership checks, session expiry and station-assignment authorization.
- Explicit demo seed, no default password, operator-assisted password reset with session revocation.
- Locally bundled Rajdhani, Source Sans 3 and IBM Plex Mono with licenses. Navy/icy-cyan visual shell, mobile layout and accessible focus states.
- README with Windows/Neon startup and Vercel configuration. No external deployment was made.

## Validation performed
Prisma client generation, TypeScript check, four security unit tests and optimized production build passed.

The initial SQL migration executed against an isolated PGlite database through its PostgreSQL socket adapter. The repeat seed ran twice successfully. Real HTTP requests against the built Next.js server verified correct/incorrect login, cross-origin rejection, unauthenticated redirects, all three role views, another-event rejection, participant station denial, facilitator station scope, inactive membership rejection, expired session rejection, logout revocation and attempt limiting.

Chromium browser automation performed real form sign-in and event navigation, captured organizer screens at desktop and 320px mobile width, and confirmed no horizontal overflow at 320px. Screenshots are in docs/previews. Browser checks are optional in tests/integration.mjs; provide PLAYWRIGHT_MODULE and optional CHROMIUM_PATH when a browser runtime is available. The default integration command performs the HTTP/database checks without requiring a browser.

## Limits
Native Prisma migrate deploy could not be exercised successfully in this execution environment; migration SQL execution and schema generation were verified separately. A real Neon migration/deployment is still required before production. PGlite is an isolated test database, not the production database.

Phase 1 is a foundation, not an event-ready release. Create/edit event and roster UX starts in Phase 2; routes, completion/points, QR camera, Contact and results remain later phases. No live scores or fake race controls are shown. Production invitations, self-service email recovery, edge abuse protection and field-device testing are not delivered yet. The CLI password reset is an operator action, with the target account recorded separately from an authenticated actor.

## Next: Phase 2
Build minimal event creation and guided setup; manage teams and individual memberships; provision accounts with forced initial credential change or a secure invitation flow; assign facilitators. Validate same-event team/station references in server services. Preserve this shared design and role boundaries. Do not add the old activity engine.

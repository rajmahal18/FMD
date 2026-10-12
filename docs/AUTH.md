# Authentication decision

Phase 1 uses organizer-provisioned individual email/password accounts and opaque server sessions. This avoids treating a shared team join code as a voting identity and works without Google account requirements or an email-delivery dependency. There is no public signup or password shipped in source. Credentials are verified server-side with salted scrypt; database stores only token digests. Sessions expire after 12 hours, are revoked on logout/password reset and are denied immediately when user/membership is inactive.

This is a deliberately bounded implementation, not a full identity platform. Invitation UX, operator-facing provisioning, self-service recovery and optional OAuth can be added in Phase 2 without changing event membership IDs. Session query includes active user status; page and API query active event membership rather than trusting role data in a client cookie. Never rely on navigation hiding as authorization.

Login/logout route handlers require Origin to match configured APP_ORIGIN. Cookies are HttpOnly, SameSite=Lax; Secure and __Host- prefixed in production. No session token is logged or exposed to the UI. Login responses do not reveal whether an account exists. Per-email attempt counters are atomic in PostgreSQL and work across Vercel instances. Response-loss retries for future station mutations need separate idempotency receipts; authentication is not that mechanism.

Official implementation references checked 6 October 2026:
- https://nextjs.org/docs/app/guides/authentication
- https://nextjs.org/docs/app/api-reference/functions/cookies
- https://nextjs.org/docs/app/getting-started/mutating-data
- https://www.prisma.io/docs/orm/v7/reference/prisma-config-reference
- https://www.prisma.io/docs/orm/v7/core-concepts/supported-databases/postgresql

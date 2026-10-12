# Upgrade from Phase 6

Back up your database. This full source ZIP continues Phase 6; preserve your private `.env`. Use Node 22.12+ and PostgreSQL 12+.

```sh
npm ci
npm run db:generate
npm run db:deploy
npm run build
```

Keep all seven migration folders. The first six migrations are unchanged. The additive Phase 7 migration adds an optional event contact policy, expiring hashed credentials and contact request/acceptance records. Composite ownership keys prevent cross-event membership/credential references. No existing race result or score ledger row is changed.

Existing events have no contact policy and therefore collect no award records. In a Preparing event, open Agent Contact in organizer navigation and explicitly choose all policy fields, opening/closing times, visibility and collection state. Review and confirm. The app does not infer five votes, cross-team-only eligibility or a global boss policy. These are per-event organizer choices.

Policy choices lock after preparation. During Live/Paused the organizer can close or reopen collection with a reason and fresh preview. Closing revokes active credentials and expires pending requests, preserving accepted records. An event whose enabled contact window has already ended fails Start readiness until its window is fixed or collection is disabled.

QR URLs continue through individual login/password change using a restricted local return path. The contact page clears the credential query after loading. Set `APP_ORIGIN` to the exact HTTPS deployment origin; native phone camera scanning needs HTTPS. Rotating codes are issued only when Live and within the configured server-time window.

A Preparing event with a contact policy cannot be deleted through the empty-draft shortcut. A future explicit retention workflow is required; deleting a policy directly is not a supported reset.

Native PostgreSQL/Neon deployment and real-device camera behavior are not verified here. Run migration and role-scoped smoke tests on the real deployment before release. No remote deployment was created.

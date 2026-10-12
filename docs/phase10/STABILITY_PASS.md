# Theme and roster stability pass — 2026-10-12

Scope: stabilize the current animated theme, themed page wrappers, and organizer-linked roster import without reverting the supplied implementation or changing database schemas.

## Fixes

- Pass the validated temporary password into the roster seed function so production TypeScript compilation succeeds. Preserve organizer linking and existing account passwords.
- Keep the decorative content HUD absolutely positioned behind content; it previously became a 340px spacer through a later generic child selector.
- Restore horizontal, scrollable navigation tabs on mobile. The theme's desktop navigation declaration had overridden the mobile direction.
- Restore white station signs and Agent Contact credential surfaces, and dark secondary actions/tags on light reading surfaces.
- Prevent the login glow and sidebar aura from intercepting pointer events.
- Include all decorative HUD/glow animations in reduced-motion handling; hide theme decorations when printing station signs.

## Verification

- `npm test`: 27 tests passed.
- `npm run build`: production compilation and TypeScript checks passed.
- `node tests/integration.mjs`: isolated SQL migrations, repeat demo seed, authentication, event/station authorization, setup, routes, scoring, idempotent retries, corrections, lifecycle controls and Agent Contact checks passed.
- `node tests/theme-smoke.mjs`: 32 page/viewport combinations passed across 320/390/768/1440px. Covered landing, login, organizer, seeded people, setup, station sign, facilitator and participant screens. No page overflow, broken images, blocked visible controls or browser runtime exceptions were detected.
- Browser sign-in succeeded through a local HTTPS proxy using the production Secure session cookie. Keyboard focus, QR surface colors, reduced motion and print styles passed.
- Roster import and rerun linked the organizer and preserved all 93 existing placeholder account passwords in a separate test database.

The reusable browser check is available as `npm run test:theme`; prerequisites are documented in README.md. Screenshots and machine-readable checks are stored in `.tmp/stability-evidence/` and ignored by Git.

Application database credentials and production records were not used for test mutations. Real camera scanning, physical printed-QR and venue-device acceptance remain covered by the existing event-day rehearsal guide; this pass verifies software and browser behavior.

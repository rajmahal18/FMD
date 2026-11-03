# Participant and facilitator controllers

Participants use Mission, Stations, and Team tabs within their existing event navigation. Mission prioritizes the current destination and the captain's check-in action. Stations contains availability and route history; choosing an available station returns to Mission. Team contains the roster, briefing, voting entry, and program link. These panels stay mounted during tab changes.

Facilitators use a compact field shell with Station, Teams, and History navigation. Their board has Work, History, and Tools tabs, and a team selector when multiple teams are present. One team action panel is visible at a time, while the remaining panels stay mounted to preserve inputs. Organizer boards retain their original presentation.

Internal controller links use client navigation and show pending feedback. Result drafts are stored in sessionStorage, scoped to actor, event, run revision, and visit. They restore after navigation/reload and clear on confirmation or sign-out. Drafts never confirm scores; existing server validation, result review, idempotent requests, and permissions remain authoritative. Pending requests from hidden panels remain available in the global retry section.

The field dock reserves mobile safe-area space and becomes an inline navigation bar on desktop. Controller transitions respect reduced motion. No service worker, shared personalized cache, or offline scoring is added.

Verification: `CONTROLLER_BROWSER_ONLY=1 node tests/theme-smoke.mjs` uses an isolated database for mobile/desktop layouts, client navigation, one-team selection, the actual penalty/finish/confirmation flow, draft persistence and sign-out cleanup. Standard unit and integration checks cover existing race behavior and authorization.

## Captain lineups and individual participation

After station-code verification, the captain sees avatar/name rows with an explicit checkbox, selected highlight and played/explored count. The selected-count action stays sticky above the mobile event dock. A configured player count is exact; without one, select at least one player. Confirmation atomically records the lineup and starts the server timer for an admitted team, revealing participant instructions. Queued lineups wait for admission and a captain start. Refresh/retry uses the existing run-scoped idempotent race actions; player selection drafts stay tab-local. Started lineups are immutable.

The Team tab, profile and staff roster show confirmed played / team explored with expandable station history. Explored includes admitted, active and completed stations, and excludes queues/cancellations. Facilitator Work shows the lineup alongside each player's station participation; score completion remains facilitator-only. Legacy visits without recorded lineups display Not recorded, never fabricated credit.

Run `PARTICIPATION_BROWSER_ONLY=1 node tests/theme-smoke.mjs` (PowerShell: set `$env:PARTICIPATION_BROWSER_ONLY='1'` first) after building for isolated browser checks at 320/390/768/1440px, including count limits, selected states, sticky action clearance, actual captain start, running timer and facilitator participation.

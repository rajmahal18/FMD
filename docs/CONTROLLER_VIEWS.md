# Participant and facilitator controllers

Participants use Mission, Stations, and Team tabs within their existing event navigation. Mission prioritizes the current destination and the captain's check-in action. Stations contains availability and route history; choosing an available station returns to Mission. Team contains the roster, briefing, voting entry, and program link. These panels stay mounted during tab changes.

Facilitators use a compact field shell with Station, Teams, and History navigation. Their board has Work, History, and Tools tabs, and a team selector when multiple teams are present. One team action panel is visible at a time, while the remaining panels stay mounted to preserve inputs. Organizer boards retain their original presentation.

Internal controller links use client navigation and show pending feedback. Result drafts are stored in sessionStorage, scoped to actor, event, run revision, and visit. They restore after navigation/reload and clear on confirmation or sign-out. Drafts never confirm scores; existing server validation, result review, idempotent requests, and permissions remain authoritative. Pending requests from hidden panels remain available in the global retry section.

The field dock reserves mobile safe-area space and becomes an inline navigation bar on desktop. Controller transitions respect reduced motion. No service worker, shared personalized cache, or offline scoring is added.

Verification: `CONTROLLER_BROWSER_ONLY=1 node tests/theme-smoke.mjs` uses an isolated database for mobile/desktop layouts, client navigation, one-team selection, the actual penalty/finish/confirmation flow, draft persistence and sign-out cleanup. Standard unit and integration checks cover existing race behavior and authorization.

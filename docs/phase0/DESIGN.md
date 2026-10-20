# Spy / Detective design bible

## Identity
Operation: Classified / Spy Chase is configurable event branding, not engine logic. Direction: cold field intelligence, documentary dossiers, restrained tactical typography. Shirt-inspired navy and icy cyan. No humans, character silhouettes, cartoon detectives, stock dashboard gradients, neon panel overload or decorative fake live telemetry.

Use dossier numbers, clearance strips, mission-file headers, fine cartographic grids, route coordinates and restrained classified stamps. Meaningful data supplies the labels; decorative identifiers must not impersonate actual security or tracking. Mission Control tracks confirmed station status, not GPS location unless separately implemented with consent.

## Tokens
| Token | Value | Purpose |
|---|---|---|
| ink | #071426 | Primary navy background |
| panel | #10243A | Elevated operational surface |
| ice | #BDEAF0 | Light dossier surface |
| paper | #EAF4F5 | Reading/forms background |
| cyan | #72D5E3 | Active focus, selected route |
| text-light | #F2F7FA | Text on navy |
| text-dark | #10243A | Text on ice/paper |
| muted-light | #B0C2D1 | Secondary text on navy |
| border-dark | #385166 | Structural boundaries |
| success | #83D6B2 | Confirmed success on navy |
| warning | #F5CB83 | Waiting/attention on navy |
| danger | #FFA4A8 | Failed/blocked on navy |

Status colors always include text/icons. On light surfaces use darker semantic foregrounds; verify contrast during implementation. Do not use cyan body text on ice. QR rendered black on white with required quiet zone; no camo, tint or logo over its modules.

## Typography and layout
Display: locally bundled Rajdhani SemiBold, uppercase only for short mission titles. Body: locally bundled Source Sans 3 regular/semibold. Metadata: locally bundled IBM Plex Mono. Font licenses must ship with assets. If assets unavailable use system sans and monospace, never block content loading. Preview uses system fallbacks and therefore demonstrates composition rather than final font fidelity.

Body 16px mobile; metadata 12–13px; card title 20–24px; desktop page title 28–32px. No tiny operational labels, giant marketing headings or uppercase paragraphs. Controls at least 44px tall. Radius 4px controls, 8px cards; rectangular dossier geometry, limited pills for status. Space scale 4/8/12/16/24/32/48px.

Mobile: 16px page gutters; one dominant current-station card; secondary route/history folded below; no horizontal table needed to participate. At 320px controls and long names wrap without clipping. Bottom navigation: Mission, Team, Contact. Facilitator: Station, Teams, History. Desktop Mission Control: narrow navigation rail, central team/station matrix, smaller activity feed; actionable alerts above secondary metrics. Mobile organizer uses stacked cards and team filters rather than shrinking the desktop matrix.

## Component language
Mission card: file number, readable station name, location, short instruction, clear state and one primary action.
Team card: team name/color badge plus text, completed/total count, current station, latest confirmed update.
Buttons: solid icy cyan on navy with dark text; secondary outlined; danger only for destructive steps. Spy vocabulary adds atmosphere to headings; action labels remain Start challenge, Confirm completion, Add penalty.
Forms: paper/ice fields with navy text, visible labels, inline validation, optional fields marked. Station editor groups Details, Facilitator, Result rule; advanced queue options folded.
Confirmation: shows exact team/station/result and next station. Loading replaces action label and prevents repeated taps; failure preserves input.
Empty/error/offline states: brief cause, one useful action, no engine jargon or stack traces.

## Motion
120–180ms control feedback; 220–300ms mission-card change; brief clearance-line reveal after confirmed completion. No perpetual scanning theatrics or animation indicating false success. No sound by default. Reduced-motion disables decorative transitions. Camo/grid opacity below 5% behind empty space; none behind forms or operational text.

## Phase 0 visual artifact
visual-direction.svg shows a mobile mission dossier and desktop Mission Control. It is a static composition study with fictional data, not a working app or generated photograph. Review theme density, hierarchy and readability before expanding the component system.

## Visual acceptance in every phase

Player screens retain the shared detective/agent identity: navy surfaces, icy cyan primary actions, shield branding, dossier headings and restrained station codenames. Simplify information hierarchy and controls without replacing the theme with a plain light interface. Keep one prominent primary action for the current task; fold route/team details and secondary instructions below it. Contact separates showing a QR from scanning a code. Organizer/facilitator visuals retain their existing design.
Check 320/390/768/1440px, keyboard focus, long names, no-data/loading/error/offline states, outdoor readability and reduced motion. Every new screen follows tokens and shared components. No phase may introduce an unrelated generic dashboard style.

Participant identity pages retain the full agent dossier, monogram, callsign and insignia. Decorative identity details can be elaborate; navigation and operational controls must use familiar labels, strong contrast and a clear primary action. Keep decoration separate from forms, QR modules and instructions. Preserve reduced-motion support and mobile readability.

Player event navigation uses a fixed bottom dock: Contact, an emphasized central Mission link, and Ranks with Race results and Overall ranking. My profile is in the top Account menu. Reserve bottom space including the device safe area so page content remains reachable. Ranks closes after navigation, outside click or Escape and indicates the active ranking section.

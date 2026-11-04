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

Mobile: 16px page gutters; one dominant current-station card; secondary route/history folded below; no horizontal table needed to participate. At 320px controls and long names wrap without clipping. Participant mobile bottom navigation: Voting, Contact, Spy Chase (emphasized center), Ranks, Profile. Desktop uses navigation below the topbar, without a bottom dock. Facilitator: Station, Teams, History. Desktop Mission Control: narrow navigation rail, central team/station matrix, smaller activity feed; actionable alerts above secondary metrics. Mobile organizer uses stacked cards and team filters rather than shrinking the desktop matrix.

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

Player event navigation uses a fixed bottom dock only below 768px: Voting, Contact, an emphasized central Spy Chase link, Ranks with Race results and Overall ranking, and Profile. At 768px and above, these destinations appear below the topbar in normal document flow. My profile also remains in the top Account menu. Reserve bottom space including the device safe area so page content remains reachable. Ranks closes after navigation, outside click or Escape and indicates the active ranking section.

Organizer navigation separates Event setup from Live operations. Setup contains event details, roster, stations, routes, facilitators, ranking rules, contact policy, rehearsal and archive/reset management. Operations contains Mission Control, field handling, contact collection/review and race/overall results. Setup readiness checks link to operations to start the race; start/pause/resume/end actions stay in operations. Overall configuration edits activities/weights/credits separately from operational placement entry and finalization. Preserve server role checks and existing API routes; this navigation split adds no database schema or new permissions. Mobile uses a two-option workspace switch above scrollable section tabs.

Live operations prioritizes ordinary station work: current team, next action, elapsed time, violation buttons and result confirmation. Facilitator pages use compact branding/account controls and no duplicate page heading. Station tools (violation-button editing and printable arrival code), recent results and an empty queue are folded below active work; a nonempty queue opens automatically. Mission Control shows team status and a direct Field station entry; event-wide controls, recent activity and organizer overrides/corrections/history are disclosed separately. This is presentation only: facilitator station assignments, organizer-only permissions, confirmation previews, pending requests, retry behavior, timer penalties and audit logs remain enforced.

Voting setup belongs to Event setup; collection controls and publication belong to Live operations. Player voting uses readable candidate rows, clear selection contrast and a separate review/submit step. Include Voting as the leftmost mobile bottom navigation destination; preserve voting links from the mission page and Account menu. Long candidate/voter lists use a search/filter and contained scrolling with 44px selection targets; show selection limits inline. Do not display unpublished vote totals to members.


## Handheld controller direction

Participant and facilitator views use a compact app-style shell, client navigation, reachable controls, and safe bottom space. Participants switch between Mission, Stations, and Team; their existing event dock stays intact. Facilitators use Station, Teams, and History navigation, with Work, History, and Tools inside their station. Show one team action panel at a time while keeping other forms mounted. Preserve the selected team through result confirmation. Result drafts may be restored from tab-local, identity/event/run/visit-scoped storage; drafts never count as confirmed actions. Keep explicit result review, retries, offline feedback, server permissions, and reduced-motion support. Organizer dashboard layouts are unchanged. See ../CONTROLLER_VIEWS.md.


## Simplified participant and facilitator navigation

Participant mission opens directly without local navigation tabs. Stations and Team use collapsed sections below the current task; station selection returns focus to the mission. Keep the existing event dock and mobile safe space. Facilitator Station, Teams and History remain the main navigation; remove the repeated Work/History/Tools bar. Station tools fold below active work, and a labeled team select replaces team tabs. Keep result forms mounted, explicit review, pending retries and existing authorization. Preview helpers belong to organizer setup rather than staff work screens. Use concise task-specific copy; omit technical implementation subtitles and repeated explanatory text.


Handheld task hierarchy uses a navy shell with cyan primary actions, amber waiting/approval cues, green confirmed results and muted secondary tools. Current station/team names use readable body-family display weight; status text includes an icon. Participant location and scan action include station/QR icons. Facilitator timing separates running cyan from stopped green; review and confirmation remain explicit. Avoid duplicate progress steppers. Touch targets remain at least 44px and fixed navigation keeps safe-area clearance.

Inbox composition groups selectable names by team in a searchable, bounded list with at least 44px rows. Keep one selected participant per assigned team and show selected/team coverage inline. Review lists the complete recipient selection and attachments before sending. Attachments use compact filename/size rows with a paperclip and a readable Download action. Mobile review, upload errors and long filenames must wrap within the page; keep the existing dock safe space.

Categorized voting uses two stacked Male/Female sections with shared search, one radio choice in each, selected-name feedback and one Review both votes action. Review and receipt label each choice by category; published results use separate headings and rankings. Setup offers a ballot-format selector and explicit category controls for selected candidates. Keep names readable, lists contained, 44px choices and mobile dock clearance without adding another navigation layer.

Results use the unified Results center described in [RESULTS_REDESIGN.md](../RESULTS_REDESIGN.md). Scoring collects entries; approval locks a calculation; Sharing controls audience access through a reviewed confirmation. Show effective Participants and Facilitators status beside each source. New results are hidden by default. Replace dependent visibility checkboxes with explicit Hidden / Approved results / Live scores options. Participants have one Results destination; facilitator Results stays secondary. Judging uses a native event picker, and combined totals precede disclosed activity-entry controls. Preserve source privacy, score math, mounted drafts, role checks and mobile safe space.

Judge scoring is the entry screen for assigned judges and lists open contests only. Score inputs and sliders use whole-number steps. Submitted sheets remain editable while open, with Review changes and Confirm & update score actions; close/pause disables edits server-side. Remove redundant .00 from score displays without rounding ranking math. Keep station work reachable through its direct Field route and standings secondary. Mobile review dialogs and score actions retain dock-safe scroll space.

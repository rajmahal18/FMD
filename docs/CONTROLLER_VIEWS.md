# Participant and facilitator controllers

Participants open their current mission directly. Stations and Team are collapsed sections below the mission, within the existing event navigation. Mission prioritizes the current destination and the captain's check-in action. Stations contains availability and route history; choosing an available station returns to Mission. Team contains the roster, briefing, voting entry, and program link. These sections stay mounted while collapsed.

Facilitators use a compact field shell with Station, Teams, and History navigation. Station opens current work; History opens confirmed results through the main navigation. Tools are folded below station work, and a labeled select switches teams when multiple teams are present. One team action panel is visible at a time, while the remaining panels stay mounted to preserve inputs. Organizer boards retain their original presentation.

Internal controller links use client navigation and show pending feedback. Result drafts are stored in sessionStorage, scoped to actor, event, run revision, and visit. They restore after navigation/reload and clear on confirmation or sign-out. Drafts never confirm scores; existing server validation, result review, idempotent requests, and permissions remain authoritative. Pending requests from hidden panels remain available in the global retry section.

The field dock reserves mobile safe-area space and becomes an inline navigation bar on desktop. Controller transitions respect reduced motion. No service worker, shared personalized cache, or offline scoring is added.

Verification: `CONTROLLER_BROWSER_ONLY=1 node tests/theme-smoke.mjs` uses an isolated database for mobile/desktop layouts, client navigation, one-team selection, the actual penalty/finish/confirmation flow, draft persistence and sign-out cleanup. Standard unit and integration checks cover existing race behavior and authorization.

## Captain lineups and individual participation

After station-code verification, the captain sees avatar/name rows with an explicit checkbox, selected highlight and played/explored count. The selected-count action stays sticky above the mobile event dock. A configured player count is exact; without one, select at least one player. Confirmation atomically records the lineup and starts the server timer for an admitted team, revealing participant instructions. Queued lineups wait for admission and a captain start. Refresh/retry uses the existing run-scoped idempotent race actions; player selection drafts stay tab-local. Started lineups are immutable.

The Team tab, profile and staff roster show confirmed played / team explored with expandable station history. Explored includes admitted, active and completed stations, and excludes queues/cancellations. Facilitator Work shows the lineup alongside each player's station participation; score completion remains facilitator-only. Legacy visits without recorded lineups display Not recorded, never fabricated credit.

Run `PARTICIPATION_BROWSER_ONLY=1 node tests/theme-smoke.mjs` (PowerShell: set `$env:PARTICIPATION_BROWSER_ONLY='1'` first) after building for isolated browser checks at 320/390/768/1440px, including count limits, selected states, sticky action clearance, actual captain start, running timer and facilitator participation.

## Event-day control priority

Captain selection uses a viewport dock rendered outside animated/overflowing page ancestors. It follows the picker visibility, reserves its measured height in the document, and sits above the measured mobile navigation height. Verify it while scrolling the first, middle and last player rows, rather than scrolling the action bar into view. Hidden tab panels must not leave a dock visible.

Facilitator Work prioritizes the active team, running time, large penalty keys and Finish challenge. Player participation and penalty history stay folded below those controls; private instructions live under Tools. A long list of penalty keys scrolls within its own area so it cannot displace the timer and finish action. Penalty taps show inline confirmation instead of opening a modal. Busy states, persisted pending requests, safe retries, server-side checks and explicit final result review remain in place.

## Action guidance and recovery

Captain check-in shows three steps: verify station, choose players, start timer. QR and direct-code links verify automatically without creating a visit. Full stations offer an availability retry. The roster supports name/role search without dropping selected players, a clear-selection action, exact remaining counts and a ready-to-start explanation in the fixed dock.

Mission guidance distinguishes captain responsibilities, selected players, supporting teammates, queue waiting and stopped timers awaiting facilitator confirmation. Active instructions open by default. Facilitators can switch assigned stations in the Work header; Finish explains that it stops timing before result review. Confirmation shows the station, team and consequences. Completed one-time actions disable repeat submission while penalty keys remain repeatable and uncertain requests retain their saved retry.

Search empty states in shared lists and ballots offer a reset. Voting explains the review requirement, email sign-in guards rapid duplicate submissions, already-counted contacts offer a fresh scan, and free-roam route setup explains station inclusion without suggesting a required playing order.

## POS station board

Participant Stations and organizer station status use compact, responsive tiles with a colored status label, station name and occupancy/queue summary. Details move into one native dialog: location, requirements, current teams, confirmed result and relevant actions. Participant instruction text remains limited to the server-authorized projection; arrival is distinct from active play. Tile/modal content follows live refreshes. Final Station gating and captain eligibility continue to come from server mission state.

The modal uses no extra data fetch or animation library. It supports keyboard focus containment, Escape, backdrop dismissal, focus restoration and body scroll lock. Height is bounded to the viewport with safe-area space. Free-roam selection closes the dialog and returns to the Mission action. Organizer availability changes retain their existing permission checks and confirmation review inside the detail view.

Verify with `STATION_TILES_BROWSER_ONLY=1 node tests/theme-smoke.mjs` after building for 320/390/768/1440px layouts, long station names, modal contrast/focus/dismissal and a seven-station board. `FREE_ROAM_BROWSER_ONLY=1` checks selecting a destination through tile details. The live schema migration was deployed on 2026-11-03; the UI still follows the normal app deployment workflow.

## Organizer preview visibility

Event setup contains a folded Live screen preview section with an organizer-only enable/disable switch and Save preview visibility action. It persists per event and can be changed while Live. Disabled previews remove setup navigation, staff account links and preparation banners; direct preview URLs show a disabled message and a recovery link instead of sample screens. Actual event work remains available. Staff already viewing a page see updated entries on navigation/reload. Archive blocks edits, and stale values and duplicate requests follow existing management validation and receipts. The setting survives run resets as part of event setup. Existing events default to enabled.

Apply `20261103200000_screen_preview_visibility` before deploying the app. Verify real switch/save, both states, navigation and mobile layouts using `PREVIEW_TOGGLE_BROWSER_ONLY=1 node tests/theme-smoke.mjs` after building. The isolated integration suite covers organizer permissions, changes while Live, replay/stale guards, disabled direct access and unchanged station work.

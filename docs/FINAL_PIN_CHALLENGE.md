# Shared PIN Final Challenge

This is an optional finale, separate from regular station visits and the older station-based HQ finale. New installations and existing events have no enabled challenge by default. Adding its tables does not change any existing event data.

## Organizer flow

Open **Live operations → Final Challenge**. Set the duration (1–120 whole minutes), enter a six-digit PIN for every squad, and save with **Enable Final Challenge** checked. PINs may be unique or shared; leading zeros are preserved. Saved PINs are hashed and never returned to any screen or API. Leave a saved PIN blank when editing to keep it. Saving with enable unchecked keeps the feature disabled.

Captains keep their regular mission until all squads have confirmed outcomes for every configured regular scoring station, their release deadlines have passed, and no regular visit remains open. Their Spy Chase page then shows Awaiting organizer's start. Only the organizer can press **Start shared countdown**. Starting is allowed once, while the event is Live; it locks the duration and PINs and saves one server deadline for every squad.

Open **Control-center display** in a separate organizer-authenticated browser window for projection, then press **Enter fullscreen**. Presentation controls and the cursor hide after three idle seconds; move the pointer or use the keyboard to reveal them. Escape or Exit fullscreen restores the normal browser view. If the browser blocks the Fullscreen API, use its own fullscreen option (F11 on Windows). The display has no event controls or PINs.

On landscape projectors, five equal-size squad tiles fill two rows (three above, two centered below) without viewport scrolling at 720p, 1080p and 4K. The shared timer, squad names and statuses scale with resolution. Smaller/portrait screens retain a scrollable responsive layout. Squad names/statuses are app overlays. Videos are muted, autoplaying loops with static readable fallbacks; reduced-motion users receive static visuals:

- `public/videos/final-challenge/red-alert.mp4`
- `public/videos/final-challenge/threat-neutralized.mp4`
- `public/videos/final-challenge/explosion.mp4`

## Captain flow and scoring

Only active captains can submit for their own squad. The form accepts exactly six ASCII digits and uses a numeric mobile keyboard. Wrong PINs allow further attempts with a one-second cooldown. An uncertain request retries its original idempotency key. Correct submissions accepted by the server before the deadline record Defused and create the existing `RaceFinalResult` Success record. Refreshing or changing devices cannot restart the countdown. All squads defused ends the challenge early, without a speed bonus.

At deadline, remaining squads are logically failed. Authorized challenge or canonical race-results reads persist those failures atomically using the saved deadline, including after reconnect; no scheduled job is needed. No further code can succeed after expiry. Defused squads stay defused. Defused = final score 100 / 20 equivalent points; expired = 50 / 10 equivalent points. Existing station-placement scoring and 45% race contribution remain unchanged. Result approval/publication are still separate organizer actions.

Existing manual final results block challenge configuration/start; nothing silently overwrites them. Manual entry is blocked while the PIN challenge is running. After it finishes, the existing organizer review/correction rules still apply. Archiving blocks mutations. Each challenge is scoped to the event's run revision, so an explicitly authorized later reset cannot reactivate old PINs or accept stale requests; previous challenge records are retained.

Migration: `20261106010000_final_pin_challenge` only creates two tables and their constraints/index. It contains no existing-row updates, deletes, resets, drops or station/route changes. Stage it disabled, test in isolation, and configure/enable/start deliberately.

Tests: `tests/final-challenge.test.ts`, `node tests/final-challenge-integration.mjs`, `FINAL_CHALLENGE_BROWSER_ONLY=1 node tests/theme-smoke.mjs`, and the existing full integration/scoring suites.

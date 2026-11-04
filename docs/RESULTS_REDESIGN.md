# Results: review, approve, share

## Problem found in the existing flow

Navigation treated Race results, Overall results, Judging and Judging standings as unrelated destinations. The same words, such as publish and finalize, meant both approving a calculation and revealing it to members. Two dependent checkboxes per audience hid a three-state policy. A complete judging result could unexpectedly become visible when approved for an overall calculation.

## Research and design decisions

- [Nielsen Norman Group: visibility of system status](https://www.nngroup.com/articles/visibility-system-status/) supports showing the current audience access next to each result, rather than requiring the organizer to remember settings elsewhere.
- [Nielsen Norman Group: recognition rather than recall](https://www.nngroup.com/articles/recognition-and-recall/) supports consistent destinations and explicit labels. The app now has **Scoring** for entering scores and **Results** for reviewing and sharing results. Combined results means the weighted total across activities.
- [GOV.UK: check answers](https://design-system.service.gov.uk/patterns/check-answers/) supports a separate review before a consequential submission. Sharing shows the exact result, old and new audience access, score rows and live-update consequences before confirmation.
- [GOV.UK: buttons](https://design-system.service.gov.uk/components/button/) supports clear action labels and sparing use of destructive styling. Approve results, Review sharing changes and Confirm sharing changes describe distinct operations. Routine privacy controls do not use alarming red buttons.

These are design principles applied to this app, not a claim of user testing. Automated browser checks cover layout and behavior; an event-day rehearsal remains useful.

## Information hierarchy

**Organizer:** Live operations → Scoring / Results. Results is a flat list of Amazing Race, Combined results, judged activities and voting awards. Each row shows its readiness and separate Participants / Facilitators status. View results opens the existing source workflow. Sharing opens an audience dialog; it never alters scores or approvals. Every source has an All results link and current audience status.

**Facilitator:** Assigned judge scoring stays the default entry. Station work remains directly reachable. Results is a secondary account-menu destination. Private assigned score sheets remain available independently of shared standings.

**Participant:** One Results destination replaces the ranking dropdown and separate standings links. It lists only sources shared with that individual’s role. Hidden sources and draft scores are omitted on the server, including direct source URLs and APIs.

Judging event selection uses one native select rather than another tab layer. Entrant forms remain mounted. Combined results opens with the total; manual activity entry and approval are disclosed below it. Password, screen-awake and sign-out controls move into the organizer Account menu so they do not occupy the mobile page header.

## Terms and state changes

| Action | Effect | Audience access |
| --- | --- | --- |
| Save draft / submit score | Existing scoring rules and versions | Private score sheets; shared live results follow explicit policy |
| Close scoring | Locks judge edits | Does not reveal results |
| Approve results | Saves the immutable source result for combined calculations | Does not reveal a new snapshot |
| Share approved results | Releases the reviewed snapshot to the selected audience | Explicit review and confirmation |
| Share live scores | Judged activities only; submitted sheets including partial averages | Explicit review warns that future submissions and changes are visible |
| Hide results | Withdraws access for the selected audience | Scores and approval are retained |
| Reopen / re-approve | Existing correction and audit workflow | A replacement approved snapshot must be shared again |

An explicitly enabled Live scores audience stays live through judging approval. Assigned judges always retain only their own sheets. Averaging, integer score input, tie/rank rules, ballot eligibility, weighting, normalization, final race state, overrides and audit snapshots keep their existing logic.

Combined results cannot bypass a hidden included race or judged activity by revealing its contribution. Hiding an included source also withdraws the dependent combined release for that audience. Showing the source again does not silently restore combined access. Unrelated activities do not affect combined sharing.

## Safety and migration

New sources default to Hidden. Race, combined and voting releases are bound to the approved source revision. Judging uses its existing independent visibility revision. Server-side sharing previews include the actor, event/run, result state, score versions, audience revisions and displayed score rows. A changed score, approval, lineup, audience setting or reset invalidates a pending review. Confirmations are atomic, audited and idempotent. Archived events and inactive/cross-event identities cannot change sharing.

`20261104180000_explicit_result_sharing` adds ResultSharing and changes new judging defaults to Hidden. It preserves already revealed race/combined/voting snapshots and existing judging policies. It does not change scores, assignments, account credentials, ballots or saved result revisions. Reset checkpoints retain prior sharing before withdrawing all access for the new run. Existing API operation names remain compatible; user-facing labels now distinguish approval from sharing.

## Validation

- Unit tests and production build.
- Existing integration suite with explicit audience release after approval.
- Result-sharing integration: role/CSRF/event scope, hidden defaults, exact previews, cancellation/no mutation, stale scores, replay/concurrency, live partials, private sheets, source dependencies, new-revision privacy, archive and reset boundary.
- Migration test with pre-existing revealed snapshots and new hidden defaults.
- Real browser checks at 320, 390, 768 and 1440 pixels: Results list, sharing settings/review/back/cancel/confirmation, source views, judge submission/editing, keyboard focus, contrast and safe scrolling.

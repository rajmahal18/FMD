# Criterion-based judging

Organizer flow:

1. **Event setup → Judging setup → Add contest**. Choose a Gala template or a custom contest. Set criteria and maximum points, select competing teams or individual nominees, and assign active facilitators as judges.
2. **Live operations → Judging**. Open the specific contest when ready. This schedule is independent of the race: Gala judging can continue after the race has ended. A paused or archived parent event blocks score entry.
3. Close scoring, inspect the entrant rows for each submitted judge/criterion breakdown, then publish once every assigned judge has submitted every entrant's sheet.

Judge flow:

- Assigned facilitators receive **Judge** in their event navigation and can also open the Judging desk from Account. Unassigned facilitators cannot access private contests or submit scores.
- Select a contest and team/nominee. Enter each criterion's points, such as Stage impact `9 / 10` and Harmony `10 / 15`.
- Each criterion offers a synchronized number input and slider. Inline validation checks its own maximum, nonnegative values and two decimal places as the judge edits. Invalid values cannot be saved or submitted and are excluded from the running total. Blank scores stay incomplete; zero is an explicit valid score.
- **Save draft** preserves incomplete work without counting it. Unsaved input can also be retained in tab-local session storage scoped to identity, event run, contest revision, entrant and score version; it is never treated as confirmed data.
- **Review score → Confirm & submit score** validates every criterion and locks the sheet. Judges see only their own sheets, even after publication. Only organizers see the full breakdown.

## Rules and results

The supplied percentage weights become criterion maximum points. Each Gala template totals 100: Banner, War Cry/Chant, Gala Showcase Performance, Squad Look, and Male/Female Agents of the Night. Templates do not automatically create contests, select nominees or open scoring. In particular, Chant is optional because the source program notes say no chant presentation. Individual nominees must be explicitly selected by the organizer; category titles do not silently assign people by gender.

Scores accept zero and up to two decimal places within `0..criterion maximum`. Integer hundredths preserve exact totals. A judge total is the sum of criterion scores; an entrant's final score is the equal-weight average of all assigned judges' submitted totals. Drafts and missing sheets are not zero scores. Publication requires the complete judge × entrant matrix. Exact ties share competition rank (`1, 1, 3`); rounding the displayed average does not introduce a tiebreak.

Criteria, entrants and judge assignments lock after the first saved draft or score. Before scoring, close the contest before changing its configuration. An organizer may close scoring, withdraw a publication with a reason, reopen a specific submitted judge/entrant sheet with a reason, and open scoring for resubmission. Previous scores and publication snapshots are preserved in the audit. Publishing saves an aggregate snapshot; event members see published totals, never private judge sheets.

Judging does not write to the Spy Chase score ledger, Agent Contact, or voting ballots. Linked Overall ranking components use published judges' actual average scores; see `docs/OVERALL_RANKING.md` for component weights and publication behavior.

## Keeping the screen awake

Protected app screens automatically request the browser's Screen Wake Lock while visible. Account includes **Keep screen awake**, with an on/off preference saved on this device, current status, and retry when released or declined. Leaving the app screen or hiding the page releases the lock; returning reacquires it. A late request is also released if the user has already turned the option off.

This requires HTTPS and browser support. Phone power settings or browser policy may release or refuse the lock; the app reports that state rather than promising a permanent override. Unsupported browsers retain normal phone screen-timeout behavior. No database migration is needed for the screen-awake control or score-entry improvements.

## Security and lifecycle

The server rechecks active individual identity, password-change completion, event membership, organizer role or facilitator assignment, eligible entrant, contest state/revision, and sheet version. Writes lock the actor and event and atomically save the sheet, audit and idempotency receipt. Retries cannot double-count a score. Cross-event IDs, stale versions and requests from an earlier reset run are rejected.

Archive preserves judging data read-only. Event reset checkpoints include contests, assignments, drafts, submitted scores and publications; scores are cleared and contests return to Draft while rules/assignments remain. Draft deletion is refused for events with judging score/publication history. Reset preview tokens include judging changes.

Deploy the additive `20261102030000_judging` migration before deploying the new application. No existing events, race results or credentials are modified by the migration.

Validation: `npm test`, `npm run test:integration`; set `JUDGING_BROWSER_ONLY=1` when running `npm run test:theme` for 320/390/768/1440px setup, score entry, saved drafts, review modal, submission and published-result checks.

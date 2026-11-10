# Final event awards and breakdown

The event results view has four sections: Awardees, Overall results, Voting breakdown and Activity results. It uses approved results shared with the signed-in member's role. Every underlying reader still checks active identity, password setup, membership, publication revisions and audience access. No raw ballots, password hashes, sessions or organizer audit details enter the member view.

Overall results show every squad, configured activity weights, placements, tie-adjusted placement credits and weighted contributions. Shared detailed results additionally show judge names and individual totals. Activity results include race station points and the Final Station result, approved judging averages, and criterion-by-criterion sheets when detailed sharing is enabled. Best Squad Look and voting stay outside overall scoring unless explicitly configured as components.

Cornerstone winners use the assigned handlers' recorded ballots when publication explicitly requests `winnerBasis: HANDLER_CHOICE`. Each configured squad must have exactly one active assigned handler with one valid choice in that squad. Published rows retain their original vote totals and vote ranks; separate `winnerBasis` and `winner` fields record the award decision. Ordinary voting and existing snapshots keep their original behavior. Ballots and published results remain immutable.

The opt-in `eventRecapEnabled` property is saved inside the existing overall approval JSON. With a Finalized event and shared overall approval, participants and facilitators enter Results and see one Event Results destination. Organizer navigation and controls remain available. Other events, live/reset workflows, unpublished results and existing deep links are preserved. Withdrawing source sharing still hides the affected result. No database migration is required.

## Publish an event

Use an active event organizer's user ID and the exact event ID. Run a read-only review first:

```powershell
node --conditions=react-server --import tsx scripts/publish-event-results.ts EVENT_ID ORGANIZER_USER_ID
```

Add `--confirm` to close and approve voting, use handler choices for squad awards, approve the configured overall calculation, and share approved race, judging, voting, overall and detailed results with both audiences. The script uses the application's server commands, revision guards, reviewed sharing, receipts and audit records. It preserves scoring configuration, ballots, submitted judge sheets and race history. A partial publication can be resumed; already approved sources are skipped. Existing overall approvals without the recap option require reopening and review before enabling it.

## Verification

- `npm test` and `npm run typecheck`
- `npm run build` and `node tests/integration.mjs`
- `node --conditions=react-server --import tsx tests/event-recap-integration.ts`
- Add `--browser` for isolated participant/facilitator/organizer checks at 320, 390, 768 and 1440px. Screenshots are written to `.tmp/event-recap/`. Tests use an isolated PGlite database, never configured event data.

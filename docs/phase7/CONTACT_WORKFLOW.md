# Agent Contact

This is an individual award. It never writes team points or station progress.

## Organizer choices

In Preparing → Agent Contact, explicitly configure:

- Unique interaction: one unordered pair per event, counted once for both agents. Reverse scanning adds nothing.
- Commendation: one directed giver → recipient pair per event; only the recipient earns credit.
- Same-team eligibility: allowed or different teams only.
- Limit: unlimited, or 1–10000. For interaction it is confirmed connections per agent; for commendation it is outgoing commendations per giver. Pending outgoing requests reserve a place. Incoming requests do not reserve another agent's capacity indefinitely; final acceptance rechecks both agents' interaction limits.
- Recipient confirmation: required, or scanner's explicit confirmation counts immediately.
- Reciprocity: interaction is inherently mutual and remains one pair. Commendation can allow both directions once or block the reverse direction, including an existing valid pending request.
- Visibility: Organizer only hides participant aggregate counts; Own count shows each agent their own; Public shows alphabetical individual counts. Participants still retain their own consent/history, so a hidden aggregate cannot prevent them inferring their own accepted contacts. Public is never enabled by default.
- Ties: explicitly choose shared ties. Other tiebreak rules are not implemented.
- Opening/closing times in UTC and collection enabled/disabled. The server uses inclusive opening and exclusive closing. Policy choices lock after start.

Review the full summary before confirming. The server checks active organizer scope, current event stage and preview freshness. Collection may be closed/reopened during Live/Paused with a reason. Closing invalidates credentials and pending requests; accepted records remain. Paused/Ended/Finalized events reject new issuance and confirmations regardless of window.

## Participant flow

Every agent uses their own account, not a shared team login. Captain status is irrelevant to contacts. Active, password-ready participant membership and a same-event team assignment are required.

1. Open Contact from Current mission.
2. To identify yourself, choose Show my QR/code. The black-on-white QR and numeric fallback expire in at most two minutes, or earlier at the window close. Showing a fresh credential invalidates previous codes and pending requests addressed to you. Different eligible agents can use the same current credential; it is not globally consumed by one scanner.
3. Scan the other agent's QR or enter their eight-digit code. Verify agent resolves the name and team but does not write a contact or award credit.
4. Review the person and policy, then explicitly confirm interaction/commendation. If recipient confirmation is required, the request remains Pending with zero credit.
5. Recipient opens Requests for your confirmation and accepts or declines before the same credential expires. Accept counts once. Decline/expiry adds no credit; a fresh eligible scan may reopen that pair's request. Each attempt has an audit record; accepted pairs are never reset through this flow.

Counts derive from Accepted records. Interaction counts both sides; commendation counts recipients only. Accepted history survives later membership deactivation and remains visible to organizers. Participant public lists omit inactive members. Final ranking/reveal is Phase 8.

## Reliability and limits

Tokens are random 256-bit values; numeric codes are random eight digits and unique within the event's stored credential history. Only hashes are stored. Raw credentials appear only in the issuer's current response/in-memory screen, never in receipts/audits. Numeric lookup and issuance each have a committed actor/event budget of 30 attempts per five minutes, so a rejected transaction cannot erase its attempts.

Code expiry, rotation, current identities, same-event/team eligibility, limit, reciprocity, policy and window are rechecked at confirmation. An expired token after preview records nothing. A pending request that expires before consent becomes Expired and records no credit. Access revocation blocks even a replayed receipt.

Confirmations save the exact request in this tab before sending. Lost response → reload → Retry saved request returns its original receipt if it committed, even after a later pause/window close. A new attempt with an expired credential is rejected and needs a fresh scan. Different nonces cannot add another accepted pair/directed record. Signing out clears pending tab storage. There is no guaranteed offline contact collection: server validation needs connectivity.

Camera permission is explicit, rear camera preferred, and tracks stop on successful decode, stop, hidden page and unmount. Manual entry uses the same validation. Short-lived credentials reduce delayed sharing; they do not prove presence, meaningful interaction or prevent live relays/collusion.

Organizer review shows alphabetical individual counts and the latest 100 records; all records remain in the database. No contact deletion/reversal, mass export, award reveal, notifications or external messages are included.

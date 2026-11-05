# Organizer account switching

Open an event, then **Account → Switch to account**. Search by name, email or team, select a member and confirm. This is the member’s actual identity and assigned permissions within that event. Scores, votes and other submissions affect real event data. Use the visible **Return to organizer** button to restore the original session and choose another member.

Only an authenticated organizer of the selected event can switch. Target accounts must be active. Pending password setup does not block organizer switching: validated delegated sessions may use the target account within the selected event. Normal target login still requires password setup. The feature does not change passwords, complete password setup or revoke the real member’s normal sessions. Accounts in other events are not accessible through the switched session, even when the target has other memberships. Password/security endpoints, global management and nested switching require returning to the organizer.

Switched sessions last up to one hour and never outlive the original session. Every request revalidates the original organizer, target account, memberships and expiry. Deleting the original session cascades to its switched sessions. Return remains available after a target switch expires or loses access, provided the organizer’s original session is still valid. Signing out while switched signs out the original browser session and the delegated session, without signing out the real target’s other sessions.

The original and delegated tokens are separate HttpOnly cookies, secure in production. Only hashes are stored in the database. Switching uses a full document navigation; tabs refresh when the active identity changes. Identity headers reject stale-tab submissions both during a switch and after returning.

Audit actions:

- `ACCOUNT_SWITCH_STARTED`: original organizer, target identity, event, delegated session and expiry.
- `ACCOUNT_SWITCH_ACTION`: original organizer and target, request method/path and delegated session. This records an **attempt**; normal authorization and the action’s own audit/result determine whether it succeeds. Request bodies and private ballot choices are not copied into this log.
- `ACCOUNT_SWITCH_ENDED`: restoration of the original session.

Migration: `20261105010000_account_switching` adds nullable session-parent/event fields, a self-referencing cascading foreign key, a scope check and an index. Existing sessions retain their ordinary behavior.

Validation: isolated API tests verify actual judge scores and participant ballots, role and event scope, HttpOnly cookies, unchanged passwords, stale identity rejection, original-session restoration, expiry/revocation and logout isolation. Real-browser checks cover the searchable list, confirmation, real score submission, participant identity and return controls at 320/390/768/1440 pixels.

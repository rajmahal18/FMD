# Participant offers

Organizer → Live operations → Participant inbox → New offer. Choose one active participant, write the offer, review, then send. The participant has an envelope shortcut beside Account and a private event inbox. Selecting Yes or No requires an explicit final confirmation. No race, scoring, role or Double Agent mechanic changes happen on acceptance.

Offers are saved before email is attempted. Each active event organizer receives a separate copy; an answer creates organizer response notifications. Use the existing `GMAIL_USER`, `GMAIL_APP_PASSWORD` and `APP_ORIGIN` configuration. No messages are sent by migrations, builds or tests. Email buttons open the authenticated inbox with a suggested answer; GET and email scanners never submit an answer. Sign-in/password change retains that destination.

Email status is per recipient: pending, sending, accepted by the email server, failed, uncertain or skipped due to access changes. SMTP acceptance is not delivery/read confirmation. Explicit retry is available only for definite failures. Timeouts and abandoned sends remain uncertain to avoid automatic duplicate email. Replaying the same action retries pending envelopes without creating another offer or answer. A response is final; identical responses are idempotent and a conflicting response is rejected.

Every read/write checks active individual membership and role on the server. Participants see only their messages and no organizer email status or roster. Facilitators have no access. Responses must belong to the current participant. Paused/archived events are read-only. Inbox history remains across race resets because offers do not affect race state; event or membership deletion cascades messages/delivery records. Audits and management receipts record sending/responding/retry. Message content is escaped in HTML email.

Apply `20261104120000_participant_inbox` before deploying this feature. `npm run db:deploy` uses the configured database; this implementation does not automatically migrate a live database or send real offers.

Validation: `npm test`, `node tests/inbox-integration.mjs`, and `$env:INBOX_BROWSER_ONLY='1'; node tests/theme-smoke.mjs` after `npm run build`. Both inbox integration/browser tests use isolated databases and disable Gmail delivery. Pending inbox actions use actor/event-scoped tab storage and clear on sign-out.

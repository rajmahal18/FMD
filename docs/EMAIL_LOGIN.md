# Email code sign-in

Normal entry: open `/login`, enter the organizer-provisioned email, send a code, then enter the six digits. Printed account QR links keep their existing `/players/:id` destination and send to that account's registered email without requiring email entry. Both screens retain password sign-in.

Deployment:

1. Apply the migration with `npm run db:deploy`.
2. Set `GMAIL_USER` to the sending Gmail address and `GMAIL_APP_PASSWORD` to its Google App Password on the server. Enable 2-Step Verification for that Google account, then generate an App Password at https://myaccount.google.com/apppasswords. Use this app password, not the normal Gmail password. See https://support.google.com/accounts/answer/185833. Delivery uses Nodemailer with `smtp.gmail.com:465` over TLS and sends as that Gmail account. Spaces in the displayed App Password are stripped automatically. Remove obsolete `RESEND_API_KEY` / `EMAIL_FROM` settings if previously configured.
3. Keep `APP_ORIGIN` equal to the public app origin and deploy the new build.
4. Check delivery with a real roster account, including the spam folder. Email delivery is not exercised by the isolated integration suite.

Codes expire after ten minutes, permit five verification attempts and are consumed atomically with session creation. Resending replaces previous codes. Requests are limited per email to one per minute and five per fifteen minutes. Only active accounts with active membership in an unarchived event can sign in by email. Account QR entry supports organizer, participant and facilitator memberships and rechecks the specific account at verification. Codes are stored as challenge-bound hashes; SMTP credentials and codes are never returned to the browser or logged.

Existing temporary-password requirements remain enforced after email verification. OTP does not modify the password or remove the requirement to choose a personal password. Existing session and protected-page authorization rules continue to apply.

Without email configuration, the interface reports that email sign-in is unavailable and password entry remains usable. No public account creation is enabled.

# Phase 1 → Phase 2

This is an additive upgrade of the same project. Phase 1 migration was not rewritten.

## Additions
- User.canCreateEvents: separate platform permission; false by default.
- User.mustChangePassword: access gate for newly provisioned/reset accounts.
- Event dates, codename, briefing, accent and bounded logo bytes/MIME.
- EventMembership.isCaptain; a partial unique index enforces one active captain per team.
- AuditEntry target/details fields and ManagementReceipt for mutation deduplication.

Back up, install from the updated lockfile, regenerate Prisma and run migrate deploy. Retain both migrations. Existing users and memberships are preserved; event creation must be explicitly granted to the intended account through the operator CLI, or through re-seeding the known local demo organizer. Never grant this permission merely because someone has an organizer role in an unrelated event.

## Permissions and safety
All management commands verify current individual access and organizer membership inside the transaction. Event-level setup commands lock the event and require Preparing. Future lifecycle services must use the same event lock to serialize status changes with roster edits.

Team and station references are validated against the same event. A facilitator must have an active facilitator membership; changing its role clears assignments. Roles do not grant access to another event. Removal deactivates the membership and clears its team/captain/station links. Existing global account identity is never edited by an event organizer.

Management receipts store nonsecret results only. Permission checks run again on retries. Successful draft deletion has a narrow replay exception for the same authenticated actor/request so a lost response can still acknowledge a deleted event. It does not restore access or permit new mutations.

Draft deletion cascades only event-owned teams/membership links/stations/assignments. Users and sessions are preserved; other-event access remains valid. Audit event references become null while target IDs/details remain historical evidence.

## Provisioning and recovery
New-account credentials are returned once over the authenticated response; share privately yourself. They are hashed at rest and must be changed before event access. No email verification or email delivery provider is configured. Organizer-provisioned identity is trusted based on the organizer’s roster; it is not proof of mailbox ownership. Contact award identity/policies remain a later phase.

Password change checks the current password, performs a compare-and-set update, revokes every session and records an audit. Forgotten credentials require the documented operator CLI. Account recovery can affect every event, so event organizers do not receive arbitrary global password-reset power through the UI.

## Known deployment limit
The native Prisma migration engine could not be exercised successfully here. Both migration SQL scripts executed against PGlite and the upgraded Prisma client/build/HTTP flows passed. Apply migrations on a real Neon/PostgreSQL database and smoke-test before hosting.

If no Create event button appears, verify canCreateEvents for the signed-in account. If an agent repeatedly returns to Password & access, finish first-login password replacement. If an account already exists, grant permissions or link it rather than trying to overwrite its password/profile.

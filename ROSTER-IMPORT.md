# Operation Classified — Team 1–5 roster import

Source: five organizer-provided roster posters, transcribed into `prisma/operation-roster.ts` (93 participants). Verify spelling and office codes against the originals before issuing access.

1. `npm ci`
2. Create `.env` from `.env.example` and set `DATABASE_URL`, `SEED_PASSWORD` (for default demo accounts), and separately `SEED_AGENT_PASSWORD` (12–128 chars, temporary; choose a unique secret). Never commit `.env`.
3. `npm run db:generate`
4. `npm run db:deploy`
5. `npm run db:seed` (optional default demo)
6. `npm run db:seed:roster`
7. `npm run dev`

**Where to find it**: Organizer > My events > `Operation: Classified — The Ultimate Mission` > Teams & agents. The seeded event is separate from `classified-demo` and its name/slug are independent of the old demo. Click any person for a private agent dossier. Each participant sees **My agent dossier** in their sidebar after login.

**Access caveat:** Posters provide only name, office/section, and M/F markers—not verified emails. For safety, the seed uses synthetic `.invalid` placeholder emails; these MUST be replaced with the person's actual email through an authorized workflow before live invitations or password delivery. Temporary passwords trigger forced password change. Do not distribute the same temporary password to multiple real users: replace with unique individual credentials before production. This seed is for local/demo use, not production identity provisioning.

**Repeatability:** Team names and placeholder identifiers are stable, so rerunning does not duplicate existing memberships. Import refuses to update an event after it leaves PREPARING. Existing passwords are preserved. The seed does not delete existing teams or people.

## Organizer visibility fix

The roster seed links `SEED_ORGANIZER_EMAIL` (default `organizer@example.test`) as an ORGANIZER member to the `operation-classified-fmd` event. Run `npm run db:seed:roster` again after extracting this patch; no database reset is required. If your actual organizer login is different, set `SEED_ORGANIZER_EMAIL` in `.env`.

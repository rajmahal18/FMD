# Phase 8 upgrade

Back up the database. Preserve the existing `.env`, replace the app files with this archive, then run `npm ci`, `npm run db:generate`, and `npm run db:deploy`. The additive migration creates `ResultRevision`; it does not alter prior race or contact records.

Do not use `prisma db push` as a substitute for migration history. Finalize only after an operation has been ended and reviewed.

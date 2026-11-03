# Profile avatar display

Prepared on 2026-11-03. Photos belong to the individual User, so one photo follows a participant or facilitator across event memberships. Existing accounts have a null `avatarKey` and continue to display initials.

## Storage recommendation

Cloudflare R2 Standard is the preferred storage for this app. Its monthly free allowance is 10 GB-month of storage, 1 million Class A operations and 10 million Class B operations, with no egress charge. Usage above these allowances is billable: R2 is not a guaranteed zero-spend service. Account checkout/subscription is required. Monitor usage before enabling uploads; billing alerts are not hard caps.

Vercel Blob Hobby includes 1 GB storage, 10,000 simple operations, 2,000 advanced operations and 10 GB transfer. Hobby is limited to personal, non-commercial use and can suspend features at the usage limit. It has less capacity for frequently displayed photos, but is the better fit if a hard free-plan limit matters more than availability and the project qualifies for Hobby. Neither choice is unconditionally free for every use case.

Sources checked:

- https://developers.cloudflare.com/r2/pricing/
- https://developers.cloudflare.com/r2/get-started/
- https://vercel.com/docs/vercel-blob/usage-and-pricing
- https://vercel.com/docs/plans/hobby

## Connect public photo delivery

1. Apply the additive migration using `npm run db:deploy` in the intended environment, before deploying the new app. Generate Prisma with `npm run db:generate` for local development.
2. Use a dedicated avatar bucket/store. For R2 production delivery, connect a custom domain with caching; `r2.dev` is intended for development. A Vercel public Blob store URL also works. No storage SDK is needed for display.
3. Set server environment `AVATAR_PUBLIC_BASE_URL=https://photos.example.com` (or the public Blob store base URL). Leave it empty to disable photo delivery and retain initials.
4. For a provisioned photo, store only its relative versioned object key in `User.avatarKey`, for example `avatars/<random-account-reference>/<random-version>.webp`. The same key must exist in storage. Use opaque references, not names/emails. Only JPEG, PNG and WebP keys are accepted. The app will not resolve arbitrary URLs or traversal paths.

Public delivery means anyone with the photo URL can fetch it, even though app roster/profile screens remain protected by existing identity/event/role checks. Obtain the user's agreement before provisioning publicly accessible photos. If private photos are required, implement authenticated delivery instead of enabling a public bucket. Never place other personal files in this store.

## Display contract

`Avatar` provides fixed sizes, object-fit cropping, lazy loading, no referrer and initials on missing/failed images. It is decorative beside a name; use `label` for a standalone portrait. `PersonName` combines the photo and readable name for reuse. Resolve `avatarUrl(user.avatarKey)` on the server and pass only that URL to client components; do not serialize the User record.

Integrated surfaces: Teams & agents cards, agent dossier, facilitator staffing, participant Team tab, account identity, voting candidate selection/configuration and Agent Contact verification/requests/history/public counts. Existing published result snapshots are left intact; new person displays should reuse `PersonName` and project the current photo reference under their existing access checks.

## Upload integration to follow

This change prepares display and persistence; it does not create a bucket, upload endpoint or nonfunctional upload button. A subsequent uploader must verify the active individual and authorized owner on the server, enforce same-origin mutations, validate decoded raster content, strip metadata and resize/re-encode (target 256–512px and <=100 KB), enforce quotas before storage writes, and commit the new versioned key only after a successful upload. Delete superseded objects with retry-safe cleanup. Do not accept arbitrary keys or photo URLs from an untrusted form. Keep storage credentials server-only.

For a small roster, 1,000 photos at 100 KB each are about 100 MB. Browser/CDN caching and immutable versioned keys reduce repeat reads. This is an estimate, not a spending guarantee. Avoid paid image-transformation services for basic avatar display.

# Profile photos

Photos belong to the individual account and follow its event memberships. Accounts without photos display initials.

## Upload

An organizer opens **Teams & agents ? Photo** beside an active member, chooses a JPG, PNG or WebP (up to 5 MB / 24 megapixels), adjusts the square crop and saves. Remove photo restores initials. Photos can be updated during the event; archived events are read-only.

New uploads use built-in database storage (`UserAvatar`). The server validates and converts images to 384px WebP with metadata removed. Image delivery requires an active authenticated account sharing an active event membership with the photo owner. Switched accounts remain restricted to their selected event. Replacing or removing a photo deletes the previous uploaded bytes; stale edits require a refresh. Uploads and removals are audited.

Apply migration `20261105040000_avatar_upload` before deploying. No external image service is required for uploads.

## Existing external photos

Existing relative `avatars/<opaque-account>/<version>.webp` keys continue to use `AVATAR_PUBLIC_BASE_URL`, an HTTPS public base without credentials, query parameters or fragments. JPEG and PNG object keys are also accepted. Keep credentials and signed URLs out of `User.avatarKey`. New `uploads/<uuid>.webp` keys resolve to the protected internal image endpoint independently of this setting.

## Display

Use `Avatar` for a fixed-size portrait, or `PersonName` for photo and name together. Resolve `avatarUrl` on the server and pass only the resulting URL to clients. Visible names remain alongside decorative photos; standalone portraits require `label`. Missing or failed images fall back to initials.

-- Optional account-level photo; existing accounts keep their initials fallback.
ALTER TABLE "User" ADD COLUMN "avatarKey" TEXT;

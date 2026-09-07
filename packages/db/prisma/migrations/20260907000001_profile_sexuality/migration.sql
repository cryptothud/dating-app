-- Profile.sexuality was added to schema.prisma without a matching migration, so
-- databases built from migrations alone are missing the column and every read of
-- a profile fails with "column profiles.sexuality does not exist".
--
-- IF NOT EXISTS keeps this safe on databases that were created or repaired with
-- `prisma db push` and therefore already have the column.
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "sexuality" TEXT;

-- Add interests array to profiles
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "interests" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

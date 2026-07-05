-- Add moderator role
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'moderator';

-- User: chat timeout + performance indexes
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "timeout_until" TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS "users_last_active_idx"     ON "users"("last_active");
CREATE INDEX IF NOT EXISTS "users_is_seeded_created_idx" ON "users"("is_seeded", "created_at");

-- UserLocation: the most critical missing indexes — map bounding-box query
CREATE INDEX IF NOT EXISTS "user_locations_lat_lng_idx"  ON "user_locations"("latitude", "longitude");
CREATE INDEX IF NOT EXISTS "user_locations_updated_at_idx" ON "user_locations"("updated_at");

-- Messages: soft-delete + edit support + query indexes
ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "edited_at"  TIMESTAMPTZ;
ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMPTZ;
ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "deleted_by"  TEXT;
CREATE INDEX IF NOT EXISTS "messages_conversation_sent_idx" ON "messages"("conversation_id", "sent_at");
CREATE INDEX IF NOT EXISTS "messages_sender_id_idx"         ON "messages"("sender_id");

-- Photos: partial index for primary photo JOIN (can't express in Prisma schema)
CREATE INDEX IF NOT EXISTS "photos_profile_primary_idx" ON "photos"("profile_id") WHERE "is_primary" = true;

-- Blocks: both directions are queried in the map NOT EXISTS subquery
CREATE INDEX IF NOT EXISTS "blocks_blocker_id_idx" ON "blocks"("blocker_id");
CREATE INDEX IF NOT EXISTS "blocks_blocked_id_idx" ON "blocks"("blocked_id");

-- Reports / Tickets: open-status counts on admin dashboard
CREATE INDEX IF NOT EXISTS "reports_status_idx"          ON "reports"("status");
CREATE INDEX IF NOT EXISTS "support_tickets_status_idx"  ON "support_tickets"("status");

-- Subscriptions: active subscription count query
CREATE INDEX IF NOT EXISTS "subscriptions_expires_cancelled_idx" ON "subscriptions"("expires_at", "cancelled_at");

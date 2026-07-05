-- AlterTable
ALTER TABLE "conversation_participants" ADD COLUMN IF NOT EXISTS "archived_at" TIMESTAMP(3);
ALTER TABLE "conversation_participants" ADD COLUMN IF NOT EXISTS "hidden_at" TIMESTAMP(3);

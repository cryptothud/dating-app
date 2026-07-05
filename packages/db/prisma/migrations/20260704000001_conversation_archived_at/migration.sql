-- AlterTable
ALTER TABLE "conversations" ADD COLUMN IF NOT EXISTS "archived_at" TIMESTAMP(3);

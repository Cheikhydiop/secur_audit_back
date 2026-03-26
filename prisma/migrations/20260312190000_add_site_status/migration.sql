-- Add status column to Site table
ALTER TABLE "Site" ADD COLUMN IF NOT EXISTS "status" VARCHAR(255) DEFAULT 'actif';

-- Add dateRealisation field to Mission table and ANTICIPÉ status
-- This migration adds the dateRealisation column to track when inspections were actually completed
-- and adds ANTICIPÉ status for inspections done before the planned date

-- Add ANTICIPÉ to StatusAction enum
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'statusaction') THEN
        CREATE TYPE "StatusAction" AS ENUM ('A_FAIRE', 'EN_COURS', 'TERMINE', 'EN_RETARD', 'ANTICIPE');
    ELSE
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'ANTICIPE') THEN
            ALTER TYPE "StatusAction" ADD VALUE 'ANTICIPE';
        END IF;
    END IF;
END $$;

-- Add dateRealisation column to Mission table
ALTER TABLE "Mission" ADD COLUMN IF NOT EXISTS "dateRealisation" TIMESTAMP;

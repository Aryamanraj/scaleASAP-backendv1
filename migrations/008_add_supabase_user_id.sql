-- Migration: Add SupabaseUserID column to Users table
-- Purpose: Enable Supabase auth integration from frontend-v1
-- Date: 2026-01-28

-- Add nullable SupabaseUserID column
ALTER TABLE "Users" 
ADD COLUMN IF NOT EXISTS "SupabaseUserID" VARCHAR(255) UNIQUE;

-- Create index for fast lookups by SupabaseUserID
CREATE INDEX IF NOT EXISTS "IDX_USER_SUPABASE_ID" ON "Users" ("SupabaseUserID");

-- Note: SupabaseUserID is nullable because:
-- 1. Existing users don't have Supabase accounts yet
-- 2. Some users may only use internal auth (no Supabase)
-- 3. UNIQUE constraint still applies to non-null values

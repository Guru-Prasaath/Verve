-- Adds the failure_reason column the receipt webhook needs to record why a
-- delivery failed (and to build the campaign failure breakdown).
-- Safe + non-destructive: run once in the Supabase SQL editor on an existing DB.
-- (Fresh setups get this automatically from schema.sql.)

ALTER TABLE recipients ADD COLUMN IF NOT EXISTS failure_reason TEXT;

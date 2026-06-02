-- Add 'cancelled' status to application_status enum
-- This status is referenced in multiple places:
-- 1. auto_pause_listing_at_limit() trigger
-- 2. UnitRemoveTenantButton component
-- 3. check_unit_application_capacity() function

ALTER TYPE application_status ADD VALUE IF NOT EXISTS 'cancelled';
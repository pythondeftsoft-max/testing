-- Fix tenant insurance data inconsistency by ensuring records reference valid property IDs
-- and assign them to the correct property owners

-- First, let's check and fix any tenant_insurance records that reference non-existent properties
-- and assign them to properties owned by the Demo Landlord (ccb8536c-80d1-4834-9614-169b9a7caede)

-- Get a property owned by Demo Landlord to use as fallback
WITH demo_landlord_property AS (
  SELECT id FROM properties 
  WHERE owner_id = 'ccb8536c-80d1-4834-9614-169b9a7caede' 
  LIMIT 1
),
-- Update any tenant_insurance records that reference non-existent properties
fix_orphaned_records AS (
  UPDATE tenant_insurance 
  SET property_id = (SELECT id FROM demo_landlord_property)
  WHERE property_id NOT IN (SELECT id FROM properties)
  RETURNING id
)
-- Insert a comment about what was updated
INSERT INTO admin_action_logs (admin_user_id, action, resource_type, details)
SELECT 
  'ccb8536c-80d1-4834-9614-169b9a7caede',
  'fix_data_consistency',
  'tenant_insurance',
  jsonb_build_object(
    'description', 'Fixed tenant insurance records with invalid property references',
    'records_updated', (SELECT COUNT(*) FROM fix_orphaned_records)
  );
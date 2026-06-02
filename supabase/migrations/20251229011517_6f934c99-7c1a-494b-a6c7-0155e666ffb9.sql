-- Add missing indexes to fix RLS cascading timeout when loading messages
-- These indexes support the helper functions used by RLS policies

-- Fix is_tenant_housed_in_property() performance
CREATE INDEX IF NOT EXISTS idx_lease_lifecycle_tenant_id 
  ON public.lease_lifecycle_tracking (tenant_id);

CREATE INDEX IF NOT EXISTS idx_lease_lifecycle_tenant_property 
  ON public.lease_lifecycle_tracking (property_id, tenant_id, lease_status);

-- Fix tenant_properties lookups
CREATE INDEX IF NOT EXISTS idx_tenant_properties_property_tenant_active 
  ON public.tenant_properties (property_id, tenant_id, is_active);

-- Ensure property_applications has efficient tenant lookups
CREATE INDEX IF NOT EXISTS idx_property_applications_property_tenant 
  ON public.property_applications (property_id, tenant_id);

-- Ensure marketplace_applications has efficient user lookups  
CREATE INDEX IF NOT EXISTS idx_marketplace_applications_property_user
  ON public.marketplace_applications (property_id, user_id);
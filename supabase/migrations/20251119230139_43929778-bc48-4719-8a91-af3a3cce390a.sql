-- Create stage_change_events table to track all worker actions
CREATE TABLE IF NOT EXISTS public.stage_change_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('tenant', 'property')),
  entity_id UUID NOT NULL,
  from_stage TEXT,
  to_stage TEXT NOT NULL,
  changed_by_type TEXT NOT NULL CHECK (changed_by_type IN ('worker', 'system')),
  changed_by_id UUID,
  is_forward_move BOOLEAN NOT NULL DEFAULT true,
  points_earned INTEGER NOT NULL DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create worker_action_points_config table for configurable point values
CREATE TABLE IF NOT EXISTS public.worker_action_points_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_key TEXT NOT NULL UNIQUE,
  action_label TEXT NOT NULL,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('tenant', 'property')),
  from_stage TEXT,
  to_stage TEXT NOT NULL,
  points_value INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_stage_change_events_changed_by ON stage_change_events(changed_by_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stage_change_events_entity ON stage_change_events(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_stage_change_events_created_at ON stage_change_events(created_at DESC);

-- Enable RLS
ALTER TABLE public.stage_change_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.worker_action_points_config ENABLE ROW LEVEL SECURITY;

-- RLS Policies (Admin access only using existing admin check functions)
CREATE POLICY "Admins can view stage change events"
  ON public.stage_change_events FOR SELECT
  USING (
    is_admin(auth.uid()) OR is_account_admin(auth.uid())
  );

CREATE POLICY "Admins can manage points config"
  ON public.worker_action_points_config FOR ALL
  USING (
    is_admin(auth.uid()) OR is_account_admin(auth.uid())
  );

-- Function to determine if tenant stage change is forward move
CREATE OR REPLACE FUNCTION is_tenant_forward_move(from_stage TEXT, to_stage TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  stage_order TEXT[] := ARRAY['lead', 'contacted', 'touring', 'application_submitted', 'application_approved', 'lease_signed', 'move_in_scheduled', 'moved_in', 'active', 'notice_given', 'moved_out'];
  from_idx INTEGER;
  to_idx INTEGER;
BEGIN
  from_idx := array_position(stage_order, from_stage);
  to_idx := array_position(stage_order, to_stage);
  
  IF from_idx IS NULL THEN RETURN true; END IF;
  IF to_idx IS NULL THEN RETURN false; END IF;
  
  RETURN to_idx > from_idx;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to determine if property stage change is forward move
CREATE OR REPLACE FUNCTION is_property_forward_move(from_stage TEXT, to_stage TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  stage_order TEXT[] := ARRAY['vacant', 'make_ready', 'marketing', 'showing', 'application_pending', 'lease_pending', 'occupied'];
  from_idx INTEGER;
  to_idx INTEGER;
BEGIN
  from_idx := array_position(stage_order, from_stage);
  to_idx := array_position(stage_order, to_stage);
  
  IF from_idx IS NULL THEN RETURN true; END IF;
  IF to_idx IS NULL THEN RETURN false; END IF;
  
  RETURN to_idx > from_idx;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to calculate points for stage change
CREATE OR REPLACE FUNCTION calculate_stage_change_points(
  p_entity_type TEXT,
  p_from_stage TEXT,
  p_to_stage TEXT
)
RETURNS INTEGER AS $$
DECLARE
  points INTEGER := 0;
BEGIN
  SELECT points_value INTO points
  FROM worker_action_points_config
  WHERE entity_type = p_entity_type
    AND (from_stage = p_from_stage OR from_stage IS NULL)
    AND to_stage = p_to_stage
    AND is_active = true
  LIMIT 1;
  
  RETURN COALESCE(points, 0);
END;
$$ LANGUAGE plpgsql STABLE;

-- Trigger function for tenant stage changes
CREATE OR REPLACE FUNCTION log_tenant_stage_change()
RETURNS TRIGGER AS $$
DECLARE
  is_forward BOOLEAN;
  points INTEGER;
  worker_id UUID;
BEGIN
  IF OLD.pipeline_stage IS DISTINCT FROM NEW.pipeline_stage THEN
    is_forward := is_tenant_forward_move(OLD.pipeline_stage, NEW.pipeline_stage);
    points := calculate_stage_change_points('tenant', OLD.pipeline_stage, NEW.pipeline_stage);
    
    worker_id := COALESCE(NEW.assigned_worker_id, NEW.updated_by);
    
    INSERT INTO stage_change_events (
      entity_type,
      entity_id,
      from_stage,
      to_stage,
      changed_by_type,
      changed_by_id,
      is_forward_move,
      points_earned,
      metadata
    ) VALUES (
      'tenant',
      NEW.id,
      OLD.pipeline_stage,
      NEW.pipeline_stage,
      CASE WHEN worker_id IS NOT NULL THEN 'worker' ELSE 'system' END,
      worker_id,
      is_forward,
      CASE WHEN is_forward THEN points ELSE 0 END,
      jsonb_build_object(
        'tenant_name', COALESCE(NEW.full_name, NEW.email),
        'worker_name', (SELECT full_name FROM profiles WHERE id = worker_id)
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger function for property stage changes
CREATE OR REPLACE FUNCTION log_property_stage_change()
RETURNS TRIGGER AS $$
DECLARE
  is_forward BOOLEAN;
  points INTEGER;
  worker_id UUID;
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    is_forward := is_property_forward_move(OLD.status, NEW.status);
    points := calculate_stage_change_points('property', OLD.status, NEW.status);
    
    worker_id := NEW.updated_by;
    
    INSERT INTO stage_change_events (
      entity_type,
      entity_id,
      from_stage,
      to_stage,
      changed_by_type,
      changed_by_id,
      is_forward_move,
      points_earned,
      metadata
    ) VALUES (
      'property',
      NEW.id,
      OLD.status,
      NEW.status,
      CASE WHEN worker_id IS NOT NULL THEN 'worker' ELSE 'system' END,
      worker_id,
      is_forward,
      CASE WHEN is_forward THEN points ELSE 0 END,
      jsonb_build_object(
        'property_name', NEW.unit_number,
        'worker_name', (SELECT full_name FROM profiles WHERE id = worker_id)
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
DROP TRIGGER IF EXISTS tenant_stage_change_trigger ON profiles;
CREATE TRIGGER tenant_stage_change_trigger
  AFTER UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION log_tenant_stage_change();

DROP TRIGGER IF EXISTS property_stage_change_trigger ON property_units;
CREATE TRIGGER property_stage_change_trigger
  AFTER UPDATE ON property_units
  FOR EACH ROW
  EXECUTE FUNCTION log_property_stage_change();

-- Seed default point values
INSERT INTO worker_action_points_config (action_key, action_label, entity_type, from_stage, to_stage, points_value, description) VALUES
  ('tenant_lead_contacted', 'Lead Contacted', 'tenant', 'lead', 'contacted', 5, 'Initial contact with lead'),
  ('tenant_tour_scheduled', 'Tour Scheduled', 'tenant', 'contacted', 'touring', 10, 'Scheduled property tour'),
  ('tenant_application_submitted', 'Application Submitted', 'tenant', 'touring', 'application_submitted', 20, 'Tenant submitted application'),
  ('tenant_application_approved', 'Application Approved', 'tenant', 'application_submitted', 'application_approved', 15, 'Application approved'),
  ('tenant_lease_signed', 'Lease Signed', 'tenant', 'application_approved', 'lease_signed', 50, 'Lease agreement signed'),
  ('tenant_move_in_scheduled', 'Move-In Scheduled', 'tenant', 'lease_signed', 'move_in_scheduled', 10, 'Move-in date scheduled'),
  ('tenant_moved_in', 'Tenant Moved In', 'tenant', 'move_in_scheduled', 'moved_in', 25, 'Tenant successfully moved in'),
  ('property_make_ready', 'Make Ready Started', 'property', 'vacant', 'make_ready', 5, 'Property prep started'),
  ('property_marketing', 'Marketing Active', 'property', 'make_ready', 'marketing', 10, 'Property listed for marketing'),
  ('property_showing', 'Showing Scheduled', 'property', 'marketing', 'showing', 15, 'Property showing scheduled'),
  ('property_application_pending', 'Application Pending', 'property', 'showing', 'application_pending', 20, 'Application received for property'),
  ('property_lease_pending', 'Lease Pending', 'property', 'application_pending', 'lease_pending', 25, 'Lease pending signature'),
  ('property_occupied', 'Property Occupied', 'property', 'lease_pending', 'occupied', 50, 'Property successfully occupied')
ON CONFLICT (action_key) DO NOTHING;
-- =============================================
-- EVENT-DRIVEN MATCH CACHING SYSTEM
-- =============================================

-- 1. Create computed_matches table to store pre-calculated match scores
CREATE TABLE public.computed_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  unit_id UUID NOT NULL REFERENCES public.property_units(id) ON DELETE CASCADE,
  
  -- Score data
  score INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
  tier TEXT NOT NULL CHECK (tier IN ('hot_match', 'decent_match', 'no_match', 'excluded')),
  breakdown JSONB NOT NULL DEFAULT '{}',
  
  -- Drive time (cached)
  drive_time_minutes INTEGER,
  drive_time_source TEXT CHECK (drive_time_source IN ('google', 'cache', 'estimated')),
  
  -- Freshness tracking
  tenant_version INTEGER NOT NULL DEFAULT 1,
  property_version INTEGER NOT NULL DEFAULT 1,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Unique constraint to prevent duplicates
  UNIQUE(tenant_id, unit_id)
);

-- Indexes for fast lookups
CREATE INDEX idx_computed_matches_tenant ON public.computed_matches(tenant_id);
CREATE INDEX idx_computed_matches_unit ON public.computed_matches(unit_id);
CREATE INDEX idx_computed_matches_score ON public.computed_matches(score DESC);
CREATE INDEX idx_computed_matches_tier ON public.computed_matches(tier);

-- Enable RLS
ALTER TABLE public.computed_matches ENABLE ROW LEVEL SECURITY;

-- Policy: Admin users can view all matches (using system_admins table)
CREATE POLICY "Admins can view all computed matches"
  ON public.computed_matches
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.system_admins 
      WHERE user_id = auth.uid() 
      AND role_name IN ('super_admin', 'operations_admin', 'matchmaker')
      AND is_active = true
    )
  );

-- Policy: System can manage matches (for edge functions)
CREATE POLICY "Service role can manage computed matches"
  ON public.computed_matches
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- 2. Create match_compute_queue table
CREATE TABLE public.match_compute_queue (
  entity_type TEXT NOT NULL CHECK (entity_type IN ('tenant', 'property')),
  entity_id UUID NOT NULL,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processing_started_at TIMESTAMPTZ,
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  PRIMARY KEY (entity_type, entity_id)
);

-- Index for queue processing
CREATE INDEX idx_match_compute_queue_pending 
  ON public.match_compute_queue(requested_at) 
  WHERE processing_started_at IS NULL;

-- Enable RLS
ALTER TABLE public.match_compute_queue ENABLE ROW LEVEL SECURITY;

-- Policy: Only service role can access queue
CREATE POLICY "Service role can manage compute queue"
  ON public.match_compute_queue
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- 3. Add match_version columns to source tables
ALTER TABLE public.tenant_profiles 
  ADD COLUMN IF NOT EXISTS match_version INTEGER NOT NULL DEFAULT 1;

ALTER TABLE public.property_units 
  ADD COLUMN IF NOT EXISTS match_version INTEGER NOT NULL DEFAULT 1;

-- 4. Create trigger function for tenant_profiles
CREATE OR REPLACE FUNCTION public.trigger_tenant_match_version()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if any match-relevant fields changed
  IF (OLD.voucher_amount IS DISTINCT FROM NEW.voucher_amount
   OR OLD.rent_range_max IS DISTINCT FROM NEW.rent_range_max
   OR OLD.rent_range_min IS DISTINCT FROM NEW.rent_range_min
   OR OLD.bedrooms_approved IS DISTINCT FROM NEW.bedrooms_approved
   OR OLD.city IS DISTINCT FROM NEW.city
   OR OLD.state IS DISTINCT FROM NEW.state
   OR OLD.zip_code IS DISTINCT FROM NEW.zip_code
   OR OLD.has_pets IS DISTINCT FROM NEW.has_pets
   OR OLD.move_in_window IS DISTINCT FROM NEW.move_in_window)
  THEN
    -- Increment version
    NEW.match_version := COALESCE(OLD.match_version, 0) + 1;
    
    -- Queue for recompute
    INSERT INTO public.match_compute_queue (entity_type, entity_id, requested_at)
    VALUES ('tenant', NEW.user_id, now())
    ON CONFLICT (entity_type, entity_id) 
    DO UPDATE SET 
      requested_at = now(),
      processing_started_at = NULL,
      attempts = 0;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create the trigger
DROP TRIGGER IF EXISTS tenant_match_version_trigger ON public.tenant_profiles;
CREATE TRIGGER tenant_match_version_trigger
  BEFORE UPDATE ON public.tenant_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_tenant_match_version();

-- 5. Create trigger function for property_units
CREATE OR REPLACE FUNCTION public.trigger_property_match_version()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if any match-relevant fields changed
  IF (OLD.monthly_rent IS DISTINCT FROM NEW.monthly_rent
   OR OLD.bedrooms IS DISTINCT FROM NEW.bedrooms
   OR OLD.pets_allowed IS DISTINCT FROM NEW.pets_allowed
   OR OLD.available_date IS DISTINCT FROM NEW.available_date
   OR OLD.on_market IS DISTINCT FROM NEW.on_market)
  THEN
    -- Increment version
    NEW.match_version := COALESCE(OLD.match_version, 0) + 1;
    
    -- Queue for recompute (only if on_market)
    IF NEW.on_market = true THEN
      INSERT INTO public.match_compute_queue (entity_type, entity_id, requested_at)
      VALUES ('property', NEW.id, now())
      ON CONFLICT (entity_type, entity_id) 
      DO UPDATE SET 
        requested_at = now(),
        processing_started_at = NULL,
        attempts = 0;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create the trigger
DROP TRIGGER IF EXISTS property_match_version_trigger ON public.property_units;
CREATE TRIGGER property_match_version_trigger
  BEFORE UPDATE ON public.property_units
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_property_match_version();

-- 6. Create trigger for NEW tenant_profiles (insert)
CREATE OR REPLACE FUNCTION public.trigger_new_tenant_queue()
RETURNS TRIGGER AS $$
BEGIN
  -- Queue new tenants for match computation
  INSERT INTO public.match_compute_queue (entity_type, entity_id, requested_at)
  VALUES ('tenant', NEW.user_id, now())
  ON CONFLICT (entity_type, entity_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS new_tenant_queue_trigger ON public.tenant_profiles;
CREATE TRIGGER new_tenant_queue_trigger
  AFTER INSERT ON public.tenant_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_new_tenant_queue();

-- 7. Create trigger for NEW property_units that are on_market
CREATE OR REPLACE FUNCTION public.trigger_new_property_queue()
RETURNS TRIGGER AS $$
BEGIN
  -- Queue new on_market properties for match computation
  IF NEW.on_market = true THEN
    INSERT INTO public.match_compute_queue (entity_type, entity_id, requested_at)
    VALUES ('property', NEW.id, now())
    ON CONFLICT (entity_type, entity_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS new_property_queue_trigger ON public.property_units;
CREATE TRIGGER new_property_queue_trigger
  AFTER INSERT ON public.property_units
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_new_property_queue();
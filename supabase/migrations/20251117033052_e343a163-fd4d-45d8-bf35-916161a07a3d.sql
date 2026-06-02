-- Create territories table
CREATE TABLE territories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country TEXT NOT NULL,
  territory_type TEXT NOT NULL,
  territory_name TEXT NOT NULL,
  region_code TEXT,
  postal_ranges TEXT,
  default_worker_id UUID,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID
);

-- Enable RLS
ALTER TABLE territories ENABLE ROW LEVEL SECURITY;

-- System admins can manage territories
CREATE POLICY "System admins can manage territories"
ON territories
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM system_admins
    WHERE system_admins.user_id = auth.uid()
    AND system_admins.is_active = true
  )
);

-- Indexes for performance
CREATE INDEX idx_territories_country ON territories(country);
CREATE INDEX idx_territories_active ON territories(is_active);
CREATE INDEX idx_territories_worker ON territories(default_worker_id);

-- Trigger for updated_at
CREATE TRIGGER update_territories_updated_at
BEFORE UPDATE ON territories
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
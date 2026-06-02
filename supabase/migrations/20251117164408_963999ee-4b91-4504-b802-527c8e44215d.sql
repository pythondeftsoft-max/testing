-- Create territory_workers junction table for many-to-many relationship
CREATE TABLE IF NOT EXISTS territory_workers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  territory_id UUID NOT NULL REFERENCES territories(id) ON DELETE CASCADE,
  worker_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  assigned_by UUID REFERENCES auth.users(id),
  is_primary BOOLEAN DEFAULT false,
  UNIQUE(territory_id, worker_id)
);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_territory_workers_territory ON territory_workers(territory_id);
CREATE INDEX IF NOT EXISTS idx_territory_workers_worker ON territory_workers(worker_id);

-- Enable RLS
ALTER TABLE territory_workers ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Allow authenticated users to view territory workers"
  ON territory_workers FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow admins to manage territory workers"
  ON territory_workers FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM system_admins
      WHERE user_id = auth.uid()
      AND role_name IN ('super_admin', 'operations_admin')
      AND is_active = true
    )
  );

-- Migrate existing single workers to junction table
INSERT INTO territory_workers (territory_id, worker_id, is_primary, assigned_by)
SELECT id, default_worker_id, true, created_by
FROM territories
WHERE default_worker_id IS NOT NULL
ON CONFLICT (territory_id, worker_id) DO NOTHING;
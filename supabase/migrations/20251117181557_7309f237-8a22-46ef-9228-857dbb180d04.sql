-- Create auto_assignment_logs table for tracking automated assignment runs
CREATE TABLE IF NOT EXISTS auto_assignment_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  tenants_assigned INTEGER NOT NULL DEFAULT 0,
  properties_assigned INTEGER NOT NULL DEFAULT 0,
  tenants_skipped INTEGER NOT NULL DEFAULT 0,
  properties_skipped INTEGER NOT NULL DEFAULT 0,
  workers_used TEXT[] NOT NULL DEFAULT '{}',
  errors TEXT[] NOT NULL DEFAULT '{}',
  triggered_by TEXT NOT NULL DEFAULT 'manual',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_assignment_logs_run_at ON auto_assignment_logs(run_at DESC);

COMMENT ON TABLE auto_assignment_logs IS 'Tracks automated and manual auto-assignment runs';
COMMENT ON COLUMN auto_assignment_logs.tenants_skipped IS 'Tenants left in queue due to no workers in their territory';
COMMENT ON COLUMN auto_assignment_logs.properties_skipped IS 'Properties left in queue due to no workers in their territory';
COMMENT ON COLUMN auto_assignment_logs.triggered_by IS 'Source of assignment run: cron, manual, or admin';
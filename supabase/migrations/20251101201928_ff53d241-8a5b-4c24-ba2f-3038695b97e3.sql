-- Create the points_admin_audit table for tracking all administrative point adjustments
CREATE TABLE IF NOT EXISTS points_admin_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID NOT NULL REFERENCES auth.users(id),
  target_user_id UUID NOT NULL REFERENCES auth.users(id),
  action_type TEXT NOT NULL,
  points_change NUMERIC NOT NULL,
  balance_before NUMERIC NOT NULL,
  balance_after NUMERIC NOT NULL,
  reason TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraint to ensure valid action types
  CONSTRAINT points_admin_audit_action_type_check 
    CHECK (action_type IN ('add', 'subtract', 'set', 'delegate'))
);

-- Create indexes for efficient querying
CREATE INDEX idx_points_admin_audit_admin_user ON points_admin_audit(admin_user_id);
CREATE INDEX idx_points_admin_audit_target_user ON points_admin_audit(target_user_id);
CREATE INDEX idx_points_admin_audit_created_at ON points_admin_audit(created_at DESC);

-- Enable Row Level Security
ALTER TABLE points_admin_audit ENABLE ROW LEVEL SECURITY;

-- Policy: Only admins can view audit logs
CREATE POLICY "Admins can view all audit logs"
  ON points_admin_audit
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_type = 'admin'
    )
  );

-- Policy: System can insert audit logs (function runs with SECURITY DEFINER)
CREATE POLICY "System can insert audit logs"
  ON points_admin_audit
  FOR INSERT
  TO authenticated
  WITH CHECK (true);
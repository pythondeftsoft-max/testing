-- Enable RLS on auto_assignment_logs table
ALTER TABLE auto_assignment_logs ENABLE ROW LEVEL SECURITY;

-- Create policy to allow admins to view assignment logs
CREATE POLICY "Admins can view assignment logs"
ON auto_assignment_logs
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM system_admins
    WHERE system_admins.user_id = auth.uid()
    AND system_admins.is_active = true
  )
);

-- Create policy to allow service role to insert logs (for edge functions)
CREATE POLICY "Service role can insert assignment logs"
ON auto_assignment_logs
FOR INSERT
TO service_role
WITH CHECK (true);
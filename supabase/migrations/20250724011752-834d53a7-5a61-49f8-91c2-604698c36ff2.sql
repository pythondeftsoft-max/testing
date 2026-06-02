
-- Create account_activity_log table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.account_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_type TEXT NOT NULL,
  performed_by UUID REFERENCES auth.users(id),
  target_user_id UUID,
  details JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on activity log
ALTER TABLE public.account_activity_log ENABLE ROW LEVEL SECURITY;

-- Policy for account owners to view activity logs (avoiding recursion by using direct lookup)
CREATE POLICY "Account owners can view activity logs"
ON public.account_activity_log
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.account_roles ar
    WHERE ar.user_id = auth.uid()
    AND ar.role_name = 'owner'
    AND ar.is_active = true
  )
);

-- Policy for system to insert activity logs
CREATE POLICY "System can insert activity logs"
ON public.account_activity_log
FOR INSERT
WITH CHECK (true);

-- Add updated_at trigger
CREATE TRIGGER update_account_activity_log_updated_at
    BEFORE UPDATE ON public.account_activity_log
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

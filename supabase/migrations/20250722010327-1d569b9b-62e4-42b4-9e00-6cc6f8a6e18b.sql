
-- Add RLS policy to allow account role managers to view profiles for user lookup
CREATE POLICY "Account role managers can view profiles for user lookup" 
ON public.profiles 
FOR SELECT 
USING (
  has_account_role(auth.uid(), ARRAY['owner'::account_role_type, 'admin_partner'::account_role_type])
);

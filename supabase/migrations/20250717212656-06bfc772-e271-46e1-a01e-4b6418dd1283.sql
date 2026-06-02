-- Update is_admin function to include admin-level user types
CREATE OR REPLACE FUNCTION public.is_admin(user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = user_id AND user_type IN ('admin', 'individual_owner', 'property_manager', 'landlord')
  );
$$;
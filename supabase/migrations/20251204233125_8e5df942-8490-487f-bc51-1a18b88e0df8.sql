CREATE OR REPLACE FUNCTION public.can_access_hap_features(user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = user_id 
        AND user_type IN ('individual_owner', 'property_manager', 'admin', 'landlord')
    );
$$;
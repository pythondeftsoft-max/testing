
-- Create a new RPC function that includes business type classification for landlords/PMs
CREATE OR REPLACE FUNCTION public.get_admin_user_directory_with_business_types()
RETURNS TABLE(
  id uuid, 
  first_name text, 
  last_name text, 
  user_type user_type, 
  company_name text, 
  phone text, 
  created_at timestamp with time zone, 
  updated_at timestamp with time zone, 
  email text, 
  last_sign_in_at timestamp with time zone, 
  status text,
  business_type text
)
LANGUAGE sql
STABLE SECURITY DEFINER
AS $function$
    SELECT 
        p.id,
        p.first_name,
        p.last_name,
        p.user_type,
        p.company_name,
        p.phone,
        p.created_at,
        p.updated_at,
        au.email,
        au.last_sign_in_at,
        CASE 
            WHEN au.email_confirmed_at IS NOT NULL THEN 'active'
            WHEN au.email_confirmed_at IS NULL THEN 'invited'
            ELSE 'suspended'
        END::text as status,
        CASE 
            WHEN p.user_type IN ('landlord', 'property_manager') THEN
                CASE 
                    -- Corporate: Has active white label config AND active subscription
                    WHEN EXISTS (
                        SELECT 1 FROM public.white_label_configs wlc
                        JOIN public.subscriptions s ON s.user_id = wlc.user_id
                        WHERE wlc.user_id = p.id 
                        AND wlc.is_active = true
                        AND s.status = 'active'
                        AND (s.current_period_end IS NULL OR s.current_period_end > NOW())
                    ) THEN 'corporate'
                    -- Property Manager: Has account roles OR portfolio roles assigned TO them by others
                    WHEN EXISTS (
                        SELECT 1 FROM public.account_roles ar 
                        WHERE ar.user_id = p.id 
                        AND ar.is_active = true
                    ) OR EXISTS (
                        SELECT 1 FROM public.portfolio_roles pr
                        WHERE pr.user_id = p.id
                        AND pr.is_active = true
                        AND pr.added_by != p.id  -- Role was granted BY someone else
                    ) THEN 'property_manager'
                    -- Individual Owner: Pure landlord with no RBAC assignments
                    ELSE 'individual_owner'
                END
            ELSE NULL
        END::text as business_type
    FROM public.profiles p
    JOIN auth.users au ON p.id = au.id
    ORDER BY p.created_at DESC;
$function$

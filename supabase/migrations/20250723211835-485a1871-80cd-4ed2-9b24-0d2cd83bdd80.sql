-- Create the missing get_highest_account_role function
CREATE OR REPLACE FUNCTION public.get_highest_account_role(user_id_param uuid)
RETURNS account_role_type
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT ar.role_name
  FROM public.account_roles ar
  WHERE ar.user_id = user_id_param 
    AND ar.is_active = true
  ORDER BY 
    CASE ar.role_name 
      WHEN 'owner' THEN 1
      WHEN 'admin_partner' THEN 2
      WHEN 'support_assistant' THEN 3
    END
  LIMIT 1;
$$;
-- Create RPC to return account roles with emails, securely scoped
CREATE OR REPLACE FUNCTION public.get_all_account_roles_with_emails()
RETURNS TABLE(
  id uuid,
  user_id uuid,
  role_name public.account_role_type,
  is_active boolean,
  added_by uuid,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  first_name text,
  last_name text,
  user_type public.user_type,
  user_email text,
  last_sign_in_at timestamp with time zone
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $function$
  SELECT
    ar.id,
    ar.user_id,
    ar.role_name,
    ar.is_active,
    ar.added_by,
    ar.created_at,
    ar.updated_at,
    p.first_name,
    p.last_name,
    p.user_type,
    au.email AS user_email,
    au.last_sign_in_at
  FROM public.account_roles ar
  JOIN public.profiles p ON p.id = ar.user_id
  JOIN auth.users au ON au.id = ar.user_id
  WHERE ar.is_active = true
    AND (
      public.has_account_role(auth.uid(), ARRAY['owner'::public.account_role_type])
      OR ar.user_id = auth.uid()
    )
  ORDER BY ar.created_at DESC;
$function$;

-- Create a function to safely get user ID by email from auth.users table
CREATE OR REPLACE FUNCTION public.get_user_id_by_email(user_email text)
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT au.id 
    FROM auth.users au 
    WHERE LOWER(au.email) = LOWER(user_email)
    LIMIT 1;
$$;

-- Create a function to get user details for account roles display
CREATE OR REPLACE FUNCTION public.get_account_roles_with_user_details()
RETURNS TABLE(
    id uuid,
    user_id uuid,
    role_name account_role_type,
    added_by uuid,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    is_active boolean,
    notes text,
    user_email text,
    user_first_name text,
    user_last_name text,
    granted_by_first_name text,
    granted_by_last_name text
)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT 
        ar.id,
        ar.user_id,
        ar.role_name,
        ar.added_by,
        ar.created_at,
        ar.updated_at,
        ar.is_active,
        ar.notes,
        au.email as user_email,
        up.first_name as user_first_name,
        up.last_name as user_last_name,
        gb.first_name as granted_by_first_name,
        gb.last_name as granted_by_last_name
    FROM public.account_roles ar
    LEFT JOIN auth.users au ON ar.user_id = au.id
    LEFT JOIN public.profiles up ON ar.user_id = up.id
    LEFT JOIN public.profiles gb ON ar.added_by = gb.id
    WHERE ar.is_active = true
    ORDER BY ar.created_at DESC;
$$;

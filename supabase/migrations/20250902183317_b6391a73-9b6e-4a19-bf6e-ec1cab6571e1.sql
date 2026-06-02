-- Fix RPC type mismatches for admin functions

-- Fix get_points_recent_activity_admin function (numeric vs integer issue)
CREATE OR REPLACE FUNCTION public.get_points_recent_activity_admin(activity_limit integer DEFAULT 10)
RETURNS TABLE(
  id uuid,
  user_id uuid,
  event_type text,
  points_change integer,
  notes text,
  created_at timestamp with time zone,
  user_name text,
  user_email text
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pt.id,
    pt.user_id,
    pt.event_type,
    pt.points_change::integer,
    pt.notes,
    pt.created_at,
    CONCAT(pr.first_name, ' ', pr.last_name) as user_name,
    au.email as user_email
  FROM public.points_transactions pt
  JOIN public.profiles pr ON pt.user_id = pr.id
  JOIN auth.users au ON pt.user_id = au.id
  ORDER BY pt.created_at DESC
  LIMIT activity_limit;
END;
$$;

-- Fix search_admin_users function (varchar vs text issue)
CREATE OR REPLACE FUNCTION public.search_admin_users(
  search_query text DEFAULT NULL,
  type_filter text DEFAULT NULL,
  status_filter text DEFAULT NULL,
  limit_count integer DEFAULT 50,
  offset_count integer DEFAULT 0
)
RETURNS TABLE(
  id uuid,
  first_name text,
  last_name text,
  email text,
  user_type text,
  account_status text,
  total_points integer,
  last_sign_in_at timestamp with time zone,
  created_at timestamp with time zone,
  updated_at timestamp with time zone
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.first_name,
    p.last_name,
    au.email,
    p.user_type::text,
    CASE 
      WHEN au.email_confirmed_at IS NOT NULL THEN 'active'::text
      WHEN au.email_confirmed_at IS NULL THEN 'invited'::text
      ELSE 'suspended'::text
    END as account_status,
    COALESCE(up.total_points, 0)::integer as total_points,
    au.last_sign_in_at,
    p.created_at,
    p.updated_at
  FROM public.profiles p
  JOIN auth.users au ON p.id = au.id
  LEFT JOIN public.user_points up ON p.id = up.user_id
  WHERE 
    (search_query IS NULL OR 
     p.first_name ILIKE '%' || search_query || '%' OR 
     p.last_name ILIKE '%' || search_query || '%' OR 
     au.email ILIKE '%' || search_query || '%')
    AND (type_filter IS NULL OR p.user_type::text = type_filter)
    AND (status_filter IS NULL OR 
         (status_filter = 'active' AND au.email_confirmed_at IS NOT NULL) OR
         (status_filter = 'invited' AND au.email_confirmed_at IS NULL) OR
         (status_filter = 'suspended' AND au.email_confirmed_at IS NULL))
  ORDER BY p.created_at DESC
  LIMIT limit_count
  OFFSET offset_count;
END;
$$;
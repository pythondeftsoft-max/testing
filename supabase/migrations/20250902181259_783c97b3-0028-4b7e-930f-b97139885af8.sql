-- Create comprehensive admin user search function
CREATE OR REPLACE FUNCTION public.search_admin_users(
  p_search_query text DEFAULT NULL,
  p_user_type text DEFAULT NULL,
  p_status_filter text DEFAULT NULL,
  p_limit integer DEFAULT 50,
  p_offset integer DEFAULT 0
)
RETURNS TABLE(
  id uuid,
  first_name text,
  last_name text,
  email text,
  user_type text,
  created_at timestamp with time zone,
  last_sign_in_at timestamp with time zone,
  total_points bigint,
  account_status text
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH user_points AS (
    SELECT 
      ph.user_id,
      COALESCE(SUM(ph.points_change), 0) as total_points
    FROM points_history ph
    GROUP BY ph.user_id
  )
  SELECT 
    p.id,
    p.first_name,
    p.last_name,
    au.email,
    p.user_type::text,
    p.created_at,
    au.last_sign_in_at,
    COALESCE(up.total_points, 0)::bigint as total_points,
    CASE 
      WHEN au.email_confirmed_at IS NOT NULL THEN 'active'
      WHEN au.email_confirmed_at IS NULL THEN 'invited'
      ELSE 'suspended'
    END::text as account_status
  FROM public.profiles p
  JOIN auth.users au ON p.id = au.id
  LEFT JOIN user_points up ON p.id = up.user_id
  WHERE 
    (p_search_query IS NULL OR (
      p.first_name ILIKE '%' || p_search_query || '%' OR
      p.last_name ILIKE '%' || p_search_query || '%' OR
      au.email ILIKE '%' || p_search_query || '%'
    ))
    AND (p_user_type IS NULL OR p.user_type::text = p_user_type)
    AND (p_status_filter IS NULL OR 
      CASE 
        WHEN au.email_confirmed_at IS NOT NULL THEN 'active'
        WHEN au.email_confirmed_at IS NULL THEN 'invited'
        ELSE 'suspended'
      END = p_status_filter
    )
  ORDER BY p.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- Create admin points adjustment function
CREATE OR REPLACE FUNCTION public.admin_adjust_user_points(
  p_target_user_id uuid,
  p_adjustment_type text, -- 'add', 'subtract', 'set'
  p_points integer,
  p_reason text,
  p_notes text DEFAULT NULL
)
RETURNS TABLE(
  success boolean,
  new_balance bigint,
  message text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_balance bigint;
  v_points_change integer;
  v_new_balance bigint;
  v_admin_id uuid := auth.uid();
BEGIN
  -- Check if caller is admin
  IF NOT is_admin(v_admin_id) THEN
    RETURN QUERY SELECT false, 0::bigint, 'Unauthorized: Admin access required'::text;
    RETURN;
  END IF;

  -- Get current balance
  SELECT COALESCE(SUM(points_change), 0) INTO v_current_balance
  FROM points_history
  WHERE user_id = p_target_user_id;

  -- Calculate points change based on adjustment type
  CASE p_adjustment_type
    WHEN 'add' THEN
      v_points_change := p_points;
    WHEN 'subtract' THEN
      v_points_change := -p_points;
    WHEN 'set' THEN
      v_points_change := p_points - v_current_balance::integer;
    ELSE
      RETURN QUERY SELECT false, v_current_balance, 'Invalid adjustment type'::text;
      RETURN;
  END CASE;

  v_new_balance := v_current_balance + v_points_change;

  -- Insert points history record
  INSERT INTO points_history (
    user_id,
    points_change,
    balance_after,
    event_type,
    notes,
    created_by_admin,
    created_at
  ) VALUES (
    p_target_user_id,
    v_points_change,
    v_new_balance,
    'admin_adjustment',
    COALESCE(p_notes, p_reason),
    v_admin_id,
    NOW()
  );

  -- Log security audit
  PERFORM log_security_audit_event(
    'points_adjustment',
    v_admin_id,
    'user_points',
    p_target_user_id::text,
    p_adjustment_type,
    NULL,
    NULL,
    jsonb_build_object(
      'target_user_id', p_target_user_id,
      'points_change', v_points_change,
      'new_balance', v_new_balance,
      'reason', p_reason
    ),
    'medium'
  );

  RETURN QUERY SELECT true, v_new_balance, 'Points adjusted successfully'::text;
END;
$$;

-- Create admin points delegation function
CREATE OR REPLACE FUNCTION public.admin_delegate_points(
  p_from_user_id uuid,
  p_to_user_id uuid,
  p_points integer,
  p_reason text,
  p_notes text DEFAULT NULL
)
RETURNS TABLE(
  success boolean,
  from_new_balance bigint,
  to_new_balance bigint,
  message text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_from_balance bigint;
  v_to_balance bigint;
  v_from_new_balance bigint;
  v_to_new_balance bigint;
  v_admin_id uuid := auth.uid();
BEGIN
  -- Check if caller is admin
  IF NOT is_admin(v_admin_id) THEN
    RETURN QUERY SELECT false, 0::bigint, 0::bigint, 'Unauthorized: Admin access required'::text;
    RETURN;
  END IF;

  -- Get current balances
  SELECT COALESCE(SUM(points_change), 0) INTO v_from_balance
  FROM points_history WHERE user_id = p_from_user_id;
  
  SELECT COALESCE(SUM(points_change), 0) INTO v_to_balance
  FROM points_history WHERE user_id = p_to_user_id;

  -- Check if source user has enough points
  IF v_from_balance < p_points THEN
    RETURN QUERY SELECT false, v_from_balance, v_to_balance, 
      'Insufficient points: user has ' || v_from_balance || ' points'::text;
    RETURN;
  END IF;

  v_from_new_balance := v_from_balance - p_points;
  v_to_new_balance := v_to_balance + p_points;

  -- Insert points history records
  INSERT INTO points_history (
    user_id, points_change, balance_after, event_type, notes, created_by_admin, created_at
  ) VALUES 
  (p_from_user_id, -p_points, v_from_new_balance, 'admin_delegation_out', 
   COALESCE(p_notes, p_reason), v_admin_id, NOW()),
  (p_to_user_id, p_points, v_to_new_balance, 'admin_delegation_in', 
   COALESCE(p_notes, p_reason), v_admin_id, NOW());

  -- Log security audit
  PERFORM log_security_audit_event(
    'points_delegation',
    v_admin_id,
    'user_points',
    p_from_user_id::text,
    'delegate_points',
    NULL,
    NULL,
    jsonb_build_object(
      'from_user_id', p_from_user_id,
      'to_user_id', p_to_user_id,
      'points', p_points,
      'reason', p_reason
    ),
    'medium'
  );

  RETURN QUERY SELECT true, v_from_new_balance, v_to_new_balance, 'Points delegated successfully'::text;
END;
$$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_search ON profiles USING gin(
  (first_name || ' ' || last_name || ' ' || COALESCE(company_name, '')) gin_trgm_ops
);

CREATE INDEX IF NOT EXISTS idx_points_history_user_id_created_at ON points_history(user_id, created_at DESC);

-- Enable trigram extension if not already enabled (for better search)
CREATE EXTENSION IF NOT EXISTS pg_trgm;
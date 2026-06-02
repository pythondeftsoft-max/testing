-- Create RPC function to get user assets across portfolios
CREATE OR REPLACE FUNCTION public.get_user_assets(user_id_param uuid DEFAULT NULL)
RETURNS TABLE(
  id uuid,
  portfolio_id uuid,
  asset_category_id uuid,
  asset_name text,
  asset_description text,
  asset_value numeric,
  acquisition_date date,
  acquisition_cost numeric,
  current_value numeric,
  annual_income numeric,
  annual_expenses numeric,
  metadata jsonb,
  tags text[],
  is_active boolean,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  category_name text,
  category_display_name text,
  category_color_theme text
)
LANGUAGE sql
STABLE SECURITY DEFINER
AS $function$
  SELECT 
    pa.id,
    pa.portfolio_id,
    pa.asset_category_id,
    pa.asset_name,
    pa.asset_description,
    pa.asset_value,
    pa.acquisition_date,
    pa.acquisition_cost,
    pa.current_value,
    pa.annual_income,
    pa.annual_expenses,
    pa.metadata,
    pa.tags,
    pa.is_active,
    pa.created_at,
    pa.updated_at,
    ac.name as category_name,
    ac.display_name as category_display_name,
    ac.color_theme as category_color_theme
  FROM public.portfolio_assets pa
  LEFT JOIN public.asset_categories ac ON pa.asset_category_id = ac.id
  WHERE pa.is_active = true
  AND (
    user_id_param IS NULL OR
    has_portfolio_role(pa.portfolio_id, COALESCE(user_id_param, auth.uid()), ARRAY['admin_partner'::portfolio_role_type, 'editor'::portfolio_role_type, 'viewer'::portfolio_role_type])
  )
  ORDER BY pa.updated_at DESC;
$function$;
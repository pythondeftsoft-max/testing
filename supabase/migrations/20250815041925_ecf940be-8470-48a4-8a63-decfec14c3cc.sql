-- Fix the get_portfolio_asset_summary RPC function to avoid nested aggregates
DROP FUNCTION IF EXISTS public.get_portfolio_asset_summary(uuid);

CREATE OR REPLACE FUNCTION public.get_portfolio_asset_summary(p_portfolio_id uuid)
RETURNS TABLE(
  total_assets integer, 
  total_value numeric, 
  total_annual_income numeric, 
  total_annual_expenses numeric, 
  net_annual_income numeric, 
  asset_categories jsonb
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  WITH asset_stats AS (
    SELECT 
      COUNT(*)::INTEGER as total_count,
      COALESCE(SUM(COALESCE(current_value, asset_value)), 0) as total_val,
      COALESCE(SUM(annual_income), 0) as total_income,
      COALESCE(SUM(annual_expenses), 0) as total_expenses
    FROM public.portfolio_assets pa
    WHERE pa.portfolio_id = p_portfolio_id
      AND pa.is_active = true
  ),
  category_stats AS (
    SELECT 
      ac.id as category_id,
      ac.name as category_name,
      ac.display_name,
      ac.color_theme,
      COUNT(pa.id)::INTEGER as asset_count,
      COALESCE(SUM(COALESCE(pa.current_value, pa.asset_value)), 0) as category_value
    FROM public.asset_categories ac
    LEFT JOIN public.portfolio_assets pa ON ac.id = pa.asset_category_id 
      AND pa.portfolio_id = p_portfolio_id 
      AND pa.is_active = true
    WHERE ac.is_active = true
    GROUP BY ac.id, ac.name, ac.display_name, ac.color_theme
  ),
  category_breakdown AS (
    SELECT jsonb_agg(
      jsonb_build_object(
        'category_id', cs.category_id,
        'category_name', cs.category_name,
        'display_name', cs.display_name,
        'count', cs.asset_count,
        'total_value', cs.category_value,
        'color_theme', cs.color_theme
      )
    ) as categories
    FROM category_stats cs
  )
  SELECT 
    ast.total_count,
    ast.total_val,
    ast.total_income,
    ast.total_expenses,
    (ast.total_income - ast.total_expenses) as net_income,
    COALESCE(cb.categories, '[]'::jsonb)
  FROM asset_stats ast
  CROSS JOIN category_breakdown cb;
END;
$function$;
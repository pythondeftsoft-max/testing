-- Create asset categories table
CREATE TABLE public.asset_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  description TEXT,
  icon_name TEXT,
  color_theme TEXT DEFAULT 'blue',
  is_active BOOLEAN NOT NULL DEFAULT true,
  metadata_schema JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create portfolio assets table
CREATE TABLE public.portfolio_assets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  portfolio_id UUID NOT NULL,
  asset_category_id UUID NOT NULL REFERENCES public.asset_categories(id),
  asset_name TEXT NOT NULL,
  asset_description TEXT,
  asset_value NUMERIC DEFAULT 0,
  acquisition_date DATE,
  acquisition_cost NUMERIC,
  current_value NUMERIC,
  annual_income NUMERIC DEFAULT 0,
  annual_expenses NUMERIC DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  tags TEXT[] DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Create asset relationships table
CREATE TABLE public.asset_relationships (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  parent_asset_id UUID NOT NULL REFERENCES public.portfolio_assets(id) ON DELETE CASCADE,
  child_asset_id UUID NOT NULL REFERENCES public.portfolio_assets(id) ON DELETE CASCADE,
  relationship_type TEXT NOT NULL DEFAULT 'owns',
  relationship_data JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(parent_asset_id, child_asset_id, relationship_type)
);

-- Create asset valuations table for tracking value over time
CREATE TABLE public.asset_valuations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  asset_id UUID NOT NULL REFERENCES public.portfolio_assets(id) ON DELETE CASCADE,
  valuation_date DATE NOT NULL DEFAULT CURRENT_DATE,
  market_value NUMERIC NOT NULL,
  appraised_value NUMERIC,
  valuation_method TEXT DEFAULT 'market',
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add foreign key constraint for portfolio_assets
ALTER TABLE public.portfolio_assets
ADD CONSTRAINT fk_portfolio_assets_portfolio
FOREIGN KEY (portfolio_id) REFERENCES public.portfolios(id) ON DELETE CASCADE;

-- Enable RLS on all tables
ALTER TABLE public.asset_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolio_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_valuations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for asset_categories
CREATE POLICY "Anyone can view active asset categories"
ON public.asset_categories FOR SELECT
USING (is_active = true);

-- RLS Policies for portfolio_assets
CREATE POLICY "Portfolio managers can manage portfolio assets"
ON public.portfolio_assets FOR ALL
USING (has_portfolio_role(portfolio_id, auth.uid(), ARRAY['admin_partner'::portfolio_role_type, 'editor'::portfolio_role_type]));

CREATE POLICY "Portfolio viewers can view portfolio assets"
ON public.portfolio_assets FOR SELECT
USING (has_portfolio_role(portfolio_id, auth.uid(), ARRAY['admin_partner'::portfolio_role_type, 'editor'::portfolio_role_type, 'viewer'::portfolio_role_type]));

-- RLS Policies for asset_relationships
CREATE POLICY "Portfolio managers can manage asset relationships"
ON public.asset_relationships FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.portfolio_assets pa
    WHERE pa.id = parent_asset_id
    AND has_portfolio_role(pa.portfolio_id, auth.uid(), ARRAY['admin_partner'::portfolio_role_type, 'editor'::portfolio_role_type])
  )
);

CREATE POLICY "Portfolio viewers can view asset relationships"
ON public.asset_relationships FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.portfolio_assets pa
    WHERE pa.id = parent_asset_id
    AND has_portfolio_role(pa.portfolio_id, auth.uid(), ARRAY['admin_partner'::portfolio_role_type, 'editor'::portfolio_role_type, 'viewer'::portfolio_role_type])
  )
);

-- RLS Policies for asset_valuations
CREATE POLICY "Portfolio managers can manage asset valuations"
ON public.asset_valuations FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.portfolio_assets pa
    WHERE pa.id = asset_id
    AND has_portfolio_role(pa.portfolio_id, auth.uid(), ARRAY['admin_partner'::portfolio_role_type, 'editor'::portfolio_role_type])
  )
);

CREATE POLICY "Portfolio viewers can view asset valuations"
ON public.asset_valuations FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.portfolio_assets pa
    WHERE pa.id = asset_id
    AND has_portfolio_role(pa.portfolio_id, auth.uid(), ARRAY['admin_partner'::portfolio_role_type, 'editor'::portfolio_role_type, 'viewer'::portfolio_role_type])
  )
);

-- Insert default asset categories
INSERT INTO public.asset_categories (name, display_name, description, icon_name, color_theme, metadata_schema) VALUES
('property', 'Real Estate', 'Residential and commercial properties', 'Building', 'blue', '{"required_fields": ["address", "property_type"], "optional_fields": ["square_footage", "year_built"]}'),
('business', 'Business Holdings', 'Operating businesses and business interests', 'Briefcase', 'green', '{"required_fields": ["business_type", "industry"], "optional_fields": ["employees", "revenue"]}'),
('vehicle', 'Vehicles & Equipment', 'Cars, trucks, machinery, and equipment', 'Car', 'orange', '{"required_fields": ["make", "model", "year"], "optional_fields": ["mileage", "condition"]}'),
('investment', 'Investments', 'Stocks, bonds, and financial instruments', 'TrendingUp', 'purple', '{"required_fields": ["investment_type"], "optional_fields": ["ticker_symbol", "shares"]}'),
('collectible', 'Collectibles & Art', 'Art, antiques, and collectible items', 'Palette', 'pink', '{"required_fields": ["item_type"], "optional_fields": ["artist", "year_created"]}'),
('other', 'Other Assets', 'Miscellaneous assets and holdings', 'Package', 'gray', '{"required_fields": ["asset_type"], "optional_fields": []}');

-- Create function to update portfolio_assets updated_at
CREATE OR REPLACE FUNCTION public.update_portfolio_assets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for portfolio_assets
CREATE TRIGGER update_portfolio_assets_updated_at
  BEFORE UPDATE ON public.portfolio_assets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_portfolio_assets_updated_at();

-- Create function to get portfolio asset summary
CREATE OR REPLACE FUNCTION public.get_portfolio_asset_summary(p_portfolio_id UUID)
RETURNS TABLE(
  total_assets INTEGER,
  total_value NUMERIC,
  total_annual_income NUMERIC,
  total_annual_expenses NUMERIC,
  net_annual_income NUMERIC,
  asset_categories JSONB
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  WITH asset_stats AS (
    SELECT 
      COUNT(*)::INTEGER as total_count,
      COALESCE(SUM(current_value), 0) as total_val,
      COALESCE(SUM(annual_income), 0) as total_income,
      COALESCE(SUM(annual_expenses), 0) as total_expenses,
      COALESCE(SUM(annual_income) - SUM(annual_expenses), 0) as net_income
    FROM public.portfolio_assets pa
    WHERE pa.portfolio_id = p_portfolio_id
      AND pa.is_active = true
  ),
  category_breakdown AS (
    SELECT jsonb_agg(
      jsonb_build_object(
        'category_id', ac.id,
        'category_name', ac.name,
        'display_name', ac.display_name,
        'count', COUNT(pa.id),
        'total_value', COALESCE(SUM(pa.current_value), 0),
        'color_theme', ac.color_theme
      )
    ) as categories
    FROM public.asset_categories ac
    LEFT JOIN public.portfolio_assets pa ON ac.id = pa.asset_category_id 
      AND pa.portfolio_id = p_portfolio_id 
      AND pa.is_active = true
    WHERE ac.is_active = true
    GROUP BY ac.id, ac.name, ac.display_name, ac.color_theme
  )
  SELECT 
    ast.total_count,
    ast.total_val,
    ast.total_income,
    ast.total_expenses,
    ast.net_income,
    COALESCE(cb.categories, '[]'::jsonb)
  FROM asset_stats ast
  CROSS JOIN category_breakdown cb;
END;
$$;
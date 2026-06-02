
-- Create portfolio_points_distribution table
CREATE TABLE public.portfolio_points_distribution (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  portfolio_id UUID NOT NULL REFERENCES public.portfolios(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  distribution_percent NUMERIC(5,2) NOT NULL CHECK (distribution_percent >= 0 AND distribution_percent <= 100),
  role_tag TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Ensure unique user-portfolio combinations for active distributions
  UNIQUE(portfolio_id, user_id)
);

-- Add RLS policies for portfolio_points_distribution
ALTER TABLE public.portfolio_points_distribution ENABLE ROW LEVEL SECURITY;

-- Portfolio admin_partners can manage distribution settings
CREATE POLICY "Portfolio admin_partners can manage points distribution" ON public.portfolio_points_distribution
  FOR ALL USING (
    has_portfolio_role(portfolio_id, auth.uid(), ARRAY['admin_partner']::portfolio_role_type[])
  );

-- Portfolio members can view distribution settings (transparency)
CREATE POLICY "Portfolio members can view points distribution" ON public.portfolio_points_distribution
  FOR SELECT USING (
    has_portfolio_role(portfolio_id, auth.uid(), ARRAY['admin_partner', 'editor', 'viewer']::portfolio_role_type[])
  );

-- Create function to validate that percentages add up to 100% for a portfolio
CREATE OR REPLACE FUNCTION public.validate_portfolio_distribution_total(p_portfolio_id UUID)
RETURNS BOOLEAN
LANGUAGE PLPGSQL
STABLE
SECURITY DEFINER
AS $$
DECLARE
  total_percent NUMERIC;
BEGIN
  -- Calculate total percentage for active distributions in the portfolio
  SELECT COALESCE(SUM(distribution_percent), 0) INTO total_percent
  FROM public.portfolio_points_distribution
  WHERE portfolio_id = p_portfolio_id
  AND active = true;
  
  -- Return true if total equals 100%, false otherwise
  RETURN total_percent = 100.00;
END;
$$;

-- Create function to get remaining percentage available for a portfolio
CREATE OR REPLACE FUNCTION public.get_portfolio_remaining_percent(p_portfolio_id UUID)
RETURNS NUMERIC
LANGUAGE PLPGSQL
STABLE
SECURITY DEFINER
AS $$
DECLARE
  total_percent NUMERIC;
BEGIN
  -- Calculate total percentage for active distributions in the portfolio
  SELECT COALESCE(SUM(distribution_percent), 0) INTO total_percent
  FROM public.portfolio_points_distribution
  WHERE portfolio_id = p_portfolio_id
  AND active = true;
  
  -- Return remaining percentage (100 - total)
  RETURN 100.00 - total_percent;
END;
$$;

-- Create validation trigger function
CREATE OR REPLACE FUNCTION public.validate_distribution_before_save()
RETURNS TRIGGER
LANGUAGE PLPGSQL
AS $$
DECLARE
  new_total NUMERIC;
  old_total NUMERIC;
BEGIN
  -- For INSERT operations
  IF TG_OP = 'INSERT' THEN
    -- Calculate what the total would be with the new record
    SELECT COALESCE(SUM(distribution_percent), 0) + NEW.distribution_percent INTO new_total
    FROM public.portfolio_points_distribution
    WHERE portfolio_id = NEW.portfolio_id
    AND active = true;
    
    -- Check if total would exceed 100%
    IF new_total > 100.00 THEN
      RAISE EXCEPTION 'Distribution total cannot exceed 100%%. Current total would be: %', new_total;
    END IF;
    
    RETURN NEW;
  END IF;
  
  -- For UPDATE operations
  IF TG_OP = 'UPDATE' THEN
    -- Only validate if the distribution_percent or active status changed
    IF OLD.distribution_percent != NEW.distribution_percent OR OLD.active != NEW.active THEN
      -- Calculate what the total would be with the updated record
      SELECT COALESCE(SUM(distribution_percent), 0) INTO new_total
      FROM public.portfolio_points_distribution
      WHERE portfolio_id = NEW.portfolio_id
      AND active = true
      AND id != NEW.id; -- Exclude the record being updated
      
      -- Add the new percentage if the record will be active
      IF NEW.active THEN
        new_total := new_total + NEW.distribution_percent;
      END IF;
      
      -- Check if total would exceed 100%
      IF new_total > 100.00 THEN
        RAISE EXCEPTION 'Distribution total cannot exceed 100%%. Current total would be: %', new_total;
      END IF;
    END IF;
    
    RETURN NEW;
  END IF;
  
  RETURN NULL;
END;
$$;

-- Add validation trigger
CREATE TRIGGER validate_portfolio_distribution_trigger
  BEFORE INSERT OR UPDATE ON public.portfolio_points_distribution
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_distribution_before_save();

-- Create updated_at trigger for portfolio_points_distribution
CREATE TRIGGER update_portfolio_points_distribution_updated_at
  BEFORE UPDATE ON public.portfolio_points_distribution
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create helper function to get all distributions for a portfolio
CREATE OR REPLACE FUNCTION public.get_portfolio_distributions(p_portfolio_id UUID)
RETURNS TABLE(
  id UUID,
  user_id UUID,
  user_name TEXT,
  distribution_percent NUMERIC,
  role_tag TEXT,
  active BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT 
    ppd.id,
    ppd.user_id,
    CONCAT(p.first_name, ' ', p.last_name) as user_name,
    ppd.distribution_percent,
    ppd.role_tag,
    ppd.active,
    ppd.created_at,
    ppd.updated_at
  FROM public.portfolio_points_distribution ppd
  JOIN public.profiles p ON ppd.user_id = p.id
  WHERE ppd.portfolio_id = p_portfolio_id
  ORDER BY ppd.distribution_percent DESC, ppd.created_at ASC;
$$;

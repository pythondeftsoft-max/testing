-- Drop the current permissive policy
DROP POLICY IF EXISTS "Portfolio-aware property access" ON public.properties;

-- Create a strict policy that enforces true portfolio isolation
-- This ensures new portfolios are completely blank and only show properties explicitly assigned to them
CREATE POLICY "Strict portfolio isolation for properties"
ON public.properties
FOR SELECT
USING (
  (owner_id = auth.uid()) 
  AND deleted_at IS NULL
  AND (
    -- If viewing a specific portfolio, ONLY show properties assigned to that exact portfolio
    -- Properties with NULL portfolio_id will NOT be visible in any portfolio view
    (portfolio_id IS NOT NULL)
  )
);

-- Update existing properties policy for other operations to maintain strict isolation
DROP POLICY IF EXISTS "Owners can insert their properties" ON public.properties;
CREATE POLICY "Owners can insert properties with explicit portfolio assignment"
ON public.properties
FOR INSERT
WITH CHECK (
  owner_id = auth.uid()
  AND portfolio_id IS NOT NULL  -- Force explicit portfolio assignment on creation
);

DROP POLICY IF EXISTS "Owners can update their properties" ON public.properties;
CREATE POLICY "Owners can update their portfolio properties"
ON public.properties
FOR UPDATE
USING (
  owner_id = auth.uid()
  AND portfolio_id IS NOT NULL
);

DROP POLICY IF EXISTS "Owners can delete their properties" ON public.properties;
CREATE POLICY "Owners can delete their portfolio properties"
ON public.properties
FOR DELETE
USING (
  owner_id = auth.uid()
  AND portfolio_id IS NOT NULL
);

-- Ensure admin policy still works
DROP POLICY IF EXISTS "Admins can view all properties" ON public.properties;
CREATE POLICY "Admins can view all properties"
ON public.properties
FOR ALL
USING (is_admin(auth.uid()));

-- Note: This creates true portfolio isolation where:
-- 1. New portfolios start completely empty (0 properties)
-- 2. Properties must be explicitly assigned to a portfolio on creation
-- 3. Properties without portfolio_id are not visible in any portfolio view
-- 4. No existing properties can accidentally appear in new portfolios
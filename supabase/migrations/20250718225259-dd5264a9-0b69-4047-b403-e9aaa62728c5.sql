
-- Step 1: Disable RLS completely on portfolio_roles table
ALTER TABLE public.portfolio_roles DISABLE ROW LEVEL SECURITY;

-- Step 2: Drop ALL existing policies using dynamic script
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'portfolio_roles'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.portfolio_roles CASCADE;', pol.policyname);
  END LOOP;
END;
$$;

-- Step 3: Re-enable RLS on the table
ALTER TABLE public.portfolio_roles ENABLE ROW LEVEL SECURITY;

-- Step 4: Create only two clean, non-recursive policies

-- Portfolio owners (via portfolios table) can manage roles - NO self-reference
CREATE POLICY "manage_portfolio_roles" ON public.portfolio_roles
  FOR ALL
  USING ( is_portfolio_owner(portfolio_id, auth.uid()) );

-- Users can view their own portfolio roles - simple check
CREATE POLICY "select_own_portfolio_roles" ON public.portfolio_roles
  FOR SELECT
  USING ( user_id = auth.uid() );

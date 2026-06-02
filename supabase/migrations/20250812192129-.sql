-- Rollback Migration: Remove all Investment Hub components
-- Drop tables in reverse dependency order to avoid foreign key constraints

-- Drop analytics table (no dependencies)
DROP TABLE IF EXISTS public.investment_analytics CASCADE;

-- Drop dividend payments (depends on distributions and holdings)
DROP TABLE IF EXISTS public.dividend_payments CASCADE;

-- Drop dividend distributions (depends on offerings)
DROP TABLE IF EXISTS public.dividend_distributions CASCADE;

-- Drop investment trades (depends on offerings and holdings)
DROP TABLE IF EXISTS public.investment_trades CASCADE;

-- Drop investment orders (depends on offerings and profiles)
DROP TABLE IF EXISTS public.investment_orders CASCADE;

-- Drop investment holdings (depends on offerings and profiles)
DROP TABLE IF EXISTS public.investment_holdings CASCADE;

-- Drop investment offerings (depends on profiles)
DROP TABLE IF EXISTS public.investment_offerings CASCADE;

-- Drop KYC verifications (depends on profiles)
DROP TABLE IF EXISTS public.kyc_verifications CASCADE;

-- Drop investment profiles (base table)
DROP TABLE IF EXISTS public.investment_profiles CASCADE;

-- Drop all related enum types
DROP TYPE IF EXISTS public.investment_profile_status CASCADE;
DROP TYPE IF EXISTS public.kyc_status CASCADE;
DROP TYPE IF EXISTS public.offering_status CASCADE;
DROP TYPE IF EXISTS public.offering_type CASCADE;
DROP TYPE IF EXISTS public.order_status CASCADE;
DROP TYPE IF EXISTS public.trade_status CASCADE;
DROP TYPE IF EXISTS public.dividend_status CASCADE;
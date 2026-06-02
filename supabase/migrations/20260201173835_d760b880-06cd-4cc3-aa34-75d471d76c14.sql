-- Drop duplicate policy that uses 'public' role instead of 'authenticated'
DROP POLICY IF EXISTS "Users can manage their own applications" 
ON public.marketplace_applications;

-- Revoke unnecessary SELECT grants from anon role on sensitive tables
-- (RLS already blocks access, but this adds defense-in-depth)
REVOKE SELECT ON public.profiles FROM anon;
REVOKE SELECT ON public.profiles_public FROM anon;
REVOKE SELECT ON public.marketplace_applications FROM anon;
REVOKE SELECT ON public.tenant_profiles FROM anon;
REVOKE SELECT ON public.property_applications FROM anon;
REVOKE SELECT ON public.user_bank_accounts FROM anon;
REVOKE SELECT ON public.payment_methods FROM anon;
REVOKE SELECT ON public.rent_payments FROM anon;
REVOKE SELECT ON public.background_checks FROM anon;

-- Fix B: Move "System can insert" audit policies to service_role
DO $$
DECLARE
  tbl RECORD;
BEGIN
  FOR tbl IN
    SELECT tablename, policyname
    FROM pg_policies
    WHERE roles = '{public}'
      AND cmd = 'INSERT'
      AND with_check = 'true'
      AND (policyname LIKE 'System can%')
  LOOP
    EXECUTE format('DROP POLICY %I ON public.%I', tbl.policyname, tbl.tablename);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR INSERT TO service_role WITH CHECK (true)',
      tbl.policyname, tbl.tablename
    );
  END LOOP;
END $$;

-- Fix B continued: Move service_role ALL policies
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT tablename, policyname
    FROM pg_policies
    WHERE roles = '{public}'
      AND cmd = 'ALL'
      AND qual LIKE '%service_role%'
  LOOP
    EXECUTE format('DROP POLICY %I ON public.%I', r.policyname, r.tablename);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO service_role USING (true) WITH CHECK (true)',
      r.policyname, r.tablename
    );
  END LOOP;
END $$;

-- Fix C: Move auth-dependent properties policies to authenticated
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT tablename, policyname, qual
    FROM pg_policies
    WHERE roles = '{public}'
      AND tablename = 'properties'
      AND policyname LIKE 'Tenants can%'
  LOOP
    EXECUTE format('DROP POLICY %I ON public.%I', r.policyname, r.tablename);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (%s)',
      r.policyname, r.tablename, r.qual
    );
  END LOOP;
END $$;

-- Fix C: subscription_plans
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can view subscription plans' AND tablename = 'subscription_plans') THEN
    DROP POLICY "Authenticated users can view subscription plans" ON public.subscription_plans;
    CREATE POLICY "Authenticated users can view subscription plans"
      ON public.subscription_plans FOR SELECT TO authenticated
      USING (auth.role() = 'authenticated');
  END IF;
END $$;

-- Fix C: storage objects upload policy
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can upload property images' AND schemaname = 'storage') THEN
    DROP POLICY "Authenticated users can upload property images" ON storage.objects;
    CREATE POLICY "Authenticated users can upload property images"
      ON storage.objects FOR INSERT TO authenticated
      WITH CHECK (bucket_id = 'property-images' AND auth.role() = 'authenticated');
  END IF;
END $$;

-- Fix C: maintenance_costs vendor submission
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Vendors can submit costs for their jobs' AND tablename = 'maintenance_costs' AND roles = '{public}') THEN
    DROP POLICY "Vendors can submit costs for their jobs" ON public.maintenance_costs;
    CREATE POLICY "Vendors can submit costs for their jobs"
      ON public.maintenance_costs FOR INSERT TO authenticated
      WITH CHECK (
        vendor_id IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM maintenance_requests mr
          WHERE mr.id = maintenance_costs.maintenance_request_id
            AND mr.vendor_access_token IS NOT NULL
            AND mr.vendor_access_expires_at > now()
        )
      );
  END IF;
END $$;

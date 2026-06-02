
-- 1. Drop duplicate admin_messages policy
DROP POLICY IF EXISTS "Admins can view all admin messages" ON public.admin_messages;

-- 2. Revoke API access to referral_performance_analytics
REVOKE SELECT ON public.referral_performance_analytics FROM anon, authenticated;

-- 3. Add service_role policy to pending_signups
CREATE POLICY "Service role can manage pending signups"
  ON public.pending_signups FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- 4. Bulk migrate policies from {public} to {authenticated}
DO $$
DECLARE
  r RECORD;
  sql_stmt TEXT;
BEGIN
  FOR r IN
    SELECT schemaname, tablename, policyname, cmd, qual, with_check
    FROM pg_policies
    WHERE roles = '{public}'
      AND (qual LIKE '%auth.uid()%' OR with_check LIKE '%auth.uid()%')
  LOOP
    EXECUTE format('DROP POLICY %I ON %I.%I',
      r.policyname, r.schemaname, r.tablename);
    
    IF r.cmd = 'INSERT' THEN
      -- INSERT policies only support WITH CHECK, not USING
      sql_stmt := format(
        'CREATE POLICY %I ON %I.%I FOR INSERT TO authenticated WITH CHECK (%s)',
        r.policyname, r.schemaname, r.tablename,
        COALESCE(r.with_check, r.qual, 'true')
      );
    ELSE
      -- SELECT, UPDATE, DELETE support USING (and optionally WITH CHECK for UPDATE)
      sql_stmt := format(
        'CREATE POLICY %I ON %I.%I FOR %s TO authenticated USING (%s)',
        r.policyname, r.schemaname, r.tablename, r.cmd,
        COALESCE(r.qual, 'true')
      );
      IF r.with_check IS NOT NULL THEN
        sql_stmt := sql_stmt || format(' WITH CHECK (%s)', r.with_check);
      END IF;
    END IF;
    
    EXECUTE sql_stmt;
  END LOOP;
END $$;

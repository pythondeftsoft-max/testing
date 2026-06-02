
-- 1. agent_reports
DROP POLICY IF EXISTS "Service can insert agent_reports" ON public.agent_reports;
CREATE POLICY "Admins and service can insert agent_reports"
ON public.agent_reports
FOR INSERT
TO authenticated
WITH CHECK (
  is_admin(auth.uid()) OR (SELECT auth.role()) = 'service_role'
);

-- 2. match_compute_queue
DROP POLICY IF EXISTS "Authenticated users can insert into compute queue" ON public.match_compute_queue;
CREATE POLICY "Admins and service can insert into compute queue"
ON public.match_compute_queue
FOR INSERT
TO authenticated
WITH CHECK (
  is_admin(auth.uid()) OR (SELECT auth.role()) = 'service_role'
);

-- 3. placement_fee_payment_links
DROP POLICY IF EXISTS "Authenticated users can create payment links" ON public.placement_fee_payment_links;
CREATE POLICY "Admins and service can create payment links"
ON public.placement_fee_payment_links
FOR INSERT
TO authenticated
WITH CHECK (
  is_admin(auth.uid()) OR (SELECT auth.role()) = 'service_role'
);

-- 4. Harden increment_content_view_count (preserve original parameter name `content_id`)
CREATE OR REPLACE FUNCTION public.increment_content_view_count(content_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.content
  SET view_count = COALESCE(view_count, 0) + 1
  WHERE id = content_id;
END;
$$;

-- 5. application_number_sequences lockdown
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'application_number_sequences') THEN
    EXECUTE 'ALTER TABLE public.application_number_sequences ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "Deny all client access to sequences" ON public.application_number_sequences';
    EXECUTE 'CREATE POLICY "Deny all client access to sequences" ON public.application_number_sequences FOR ALL TO authenticated, anon USING (false) WITH CHECK (false)';
  END IF;
END $$;

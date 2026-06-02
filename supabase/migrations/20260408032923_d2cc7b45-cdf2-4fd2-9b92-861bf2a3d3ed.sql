
-- Drop existing broken policies if any
DROP POLICY IF EXISTS "Agency staff can view hap_payments" ON public.hap_payments;
DROP POLICY IF EXISTS "Agency admins can insert hap_payments" ON public.hap_payments;
DROP POLICY IF EXISTS "Agency admins can update hap_payments" ON public.hap_payments;

-- RLS: Agency staff can view their agency's HAP payments
CREATE POLICY "Agency staff can view hap_payments"
  ON public.hap_payments FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.agency_staff s
      WHERE s.agency_id = agency_id
        AND s.user_id = auth.uid()
        AND s.is_active = true
    )
  );

-- RLS: Agency admins/caseworkers can insert HAP payments
CREATE POLICY "Agency staff can insert hap_payments"
  ON public.hap_payments FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.agency_staff s
      WHERE s.agency_id = agency_id
        AND s.user_id = auth.uid()
        AND s.is_active = true
        AND s.role IN ('agency_admin', 'caseworker')
    )
  );

-- RLS: Agency admins can update HAP payments
CREATE POLICY "Agency admins can update hap_payments"
  ON public.hap_payments FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.agency_staff s
      WHERE s.agency_id = agency_id
        AND s.user_id = auth.uid()
        AND s.is_active = true
        AND s.role = 'agency_admin'
    )
  );

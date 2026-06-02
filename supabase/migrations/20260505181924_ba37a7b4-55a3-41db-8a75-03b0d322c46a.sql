
DROP POLICY IF EXISTS "Authenticated users can view PHA contacts" ON public.pha_contacts;
CREATE POLICY "Admins can view PHA contacts" ON public.pha_contacts FOR SELECT USING (public.is_admin(auth.uid()));

REVOKE SELECT (email, phone) ON public.housing_authorities FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_housing_authority_contact(_id uuid)
RETURNS TABLE(email text, phone text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT ha.email, ha.phone FROM public.housing_authorities ha
  WHERE ha.id = _id AND (public.is_admin(auth.uid()) OR public.is_agency_staff(auth.uid(), _id));
$$;
REVOKE EXECUTE ON FUNCTION public.get_housing_authority_contact(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_housing_authority_contact(uuid) TO authenticated;

CREATE OR REPLACE VIEW public.housing_authorities_public WITH (security_invoker = on) AS
SELECT id, slug, name, city, state, country, website, address, zipcode, zip,
       pha_code, latitude, longitude, is_active, is_onboarded,
       public_waitlist_open, public_waitlist_message,
       direct_apply_open, direct_apply_message
FROM public.housing_authorities;
GRANT SELECT ON public.housing_authorities_public TO anon, authenticated;

DROP POLICY IF EXISTS "Agency staff read tax docs for their landlords" ON storage.objects;
CREATE POLICY "Agency staff read tax docs for own agency folder"
ON storage.objects FOR SELECT USING (
  bucket_id = 'tax-documents' AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (SELECT 1 FROM public.agency_staff s WHERE s.user_id = auth.uid() AND s.is_active = true AND s.agency_id::text = (storage.foldername(name))[1])
  )
);

DROP POLICY IF EXISTS "Authenticated users can view inspection photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload inspection photos" ON storage.objects;
CREATE POLICY "Owner or staff can view inspection photos"
ON storage.objects FOR SELECT USING (
  bucket_id = 'inspection-photos' AND (
    public.is_admin(auth.uid())
    OR (storage.foldername(name))[1] = auth.uid()::text
    OR EXISTS (SELECT 1 FROM public.agency_staff s WHERE s.user_id = auth.uid() AND s.is_active = true)
  )
);
CREATE POLICY "Authed users upload inspection photos to own folder"
ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'inspection-photos' AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Agency staff can upload to agency-documents" ON storage.objects;
DROP POLICY IF EXISTS "Agency staff can view agency-documents" ON storage.objects;
CREATE POLICY "Agency staff view own agency-documents"
ON storage.objects FOR SELECT USING (
  bucket_id = 'agency-documents' AND (
    public.is_admin(auth.uid())
    OR EXISTS (SELECT 1 FROM public.agency_staff s WHERE s.user_id = auth.uid() AND s.is_active = true AND s.agency_id::text = (storage.foldername(name))[1])
  )
);
CREATE POLICY "Agency staff upload own agency-documents"
ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'agency-documents' AND (
    public.is_admin(auth.uid())
    OR EXISTS (SELECT 1 FROM public.agency_staff s WHERE s.user_id = auth.uid() AND s.is_active = true AND s.agency_id::text = (storage.foldername(name))[1])
  )
);

DROP POLICY IF EXISTS "Portfolio editors can upload asset documents" ON storage.objects;
CREATE POLICY "Portfolio editors can upload asset documents"
ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'asset-documents' AND auth.uid() IS NOT NULL AND (
    public.is_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.portfolio_roles pr
      WHERE pr.user_id = auth.uid()
        AND pr.is_active = true
        AND pr.role_name IN ('admin_partner','editor')
        AND pr.portfolio_id::text = (storage.foldername(storage.objects.name))[1]
    )
  )
);

DROP POLICY IF EXISTS "Anyone can view message attachments" ON storage.objects;
CREATE POLICY "Conversation participants view message attachments"
ON storage.objects FOR SELECT USING (
  bucket_id = 'message-attachments' AND auth.uid() IS NOT NULL AND (
    public.is_admin(auth.uid())
    OR (storage.foldername(name))[1] = auth.uid()::text
    OR EXISTS (
      SELECT 1 FROM public.sms_conversations c
      WHERE c.id::text = (storage.foldername(name))[1]
        AND (c.contact_user_id = auth.uid() OR c.assigned_worker_id = auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM public.messages m
      WHERE m.id::text = (storage.foldername(name))[1]
        AND (m.sender_id = auth.uid() OR m.tenant_id = auth.uid() OR m.landlord_id = auth.uid())
    )
  )
);

ALTER PUBLICATION supabase_realtime DROP TABLE public.access_requests;
ALTER PUBLICATION supabase_realtime DROP TABLE public.access_grants;
ALTER PUBLICATION supabase_realtime DROP TABLE public.email_queue;

ALTER VIEW public.pha_enrichment_jobs_view SET (security_invoker = on);

DROP POLICY IF EXISTS "Allow authenticated users to read notification configurations" ON public.notification_configurations;
CREATE POLICY "Admins read notification configurations" ON public.notification_configurations FOR SELECT USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Authenticated can view role permissions" ON public.role_permissions;
CREATE POLICY "Account admins view role permissions" ON public.role_permissions FOR SELECT USING (
  public.is_admin(auth.uid())
  OR public.has_account_role(auth.uid(), ARRAY['owner'::account_role_type, 'admin_partner'::account_role_type])
);

DROP POLICY IF EXISTS "Authenticated users can view portfolio role permissions" ON public.portfolio_role_permissions;
CREATE POLICY "Portfolio members view portfolio role permissions" ON public.portfolio_role_permissions FOR SELECT USING (
  public.is_admin(auth.uid())
  OR public.has_account_role(auth.uid(), ARRAY['owner'::account_role_type, 'admin_partner'::account_role_type])
  OR EXISTS (SELECT 1 FROM public.portfolio_roles pr WHERE pr.user_id = auth.uid() AND pr.is_active = true)
);

DROP POLICY IF EXISTS "Auth read perms" ON public.agency_role_permissions;
CREATE POLICY "Agency staff view agency role permissions" ON public.agency_role_permissions FOR SELECT USING (
  public.is_admin(auth.uid())
  OR EXISTS (SELECT 1 FROM public.agency_staff s WHERE s.user_id = auth.uid() AND s.is_active = true)
);

DROP POLICY IF EXISTS "Admins can view seo_location_queue" ON public.seo_location_queue;
CREATE POLICY "Admins view seo_location_queue" ON public.seo_location_queue FOR SELECT USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Authenticated users can view industry benchmarks" ON public.industry_benchmarks;
CREATE POLICY "Admins and portfolio members view industry benchmarks" ON public.industry_benchmarks FOR SELECT USING (
  public.is_admin(auth.uid())
  OR EXISTS (SELECT 1 FROM public.portfolio_roles pr WHERE pr.user_id = auth.uid() AND pr.is_active = true)
);

DROP POLICY IF EXISTS "Allow authenticated users to view territory workers" ON public.territory_workers;
CREATE POLICY "Admins view territory workers" ON public.territory_workers FOR SELECT USING (
  public.is_admin(auth.uid())
  OR EXISTS (SELECT 1 FROM public.system_admins sa WHERE sa.user_id = auth.uid() AND sa.is_active = true
    AND sa.role_name = ANY (ARRAY['super_admin'::system_admin_role_type, 'operations_admin'::system_admin_role_type]))
);

DROP POLICY IF EXISTS "Anyone can access valid payment links" ON public.placement_fee_payment_links;
CREATE POLICY "Admins view payment links" ON public.placement_fee_payment_links FOR SELECT USING (public.is_admin(auth.uid()));

CREATE OR REPLACE FUNCTION public.resolve_placement_fee_payment_link(_slug text)
RETURNS TABLE(stripe_checkout_url text, expires_at timestamptz)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.placement_fee_payment_links
  SET accessed_count = COALESCE(accessed_count, 0) + 1, last_accessed_at = now()
  WHERE slug = _slug AND expires_at > now()
  RETURNING stripe_checkout_url, expires_at;
$$;
GRANT EXECUTE ON FUNCTION public.resolve_placement_fee_payment_link(text) TO anon, authenticated;

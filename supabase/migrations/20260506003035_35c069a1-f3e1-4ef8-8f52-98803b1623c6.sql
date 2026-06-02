
-- 1. PHA contacts lockdown
DROP POLICY IF EXISTS "Property owners can manage PHA contacts" ON public.pha_contacts;

-- Keep admin manage policies; ensure admins can also INSERT/UPDATE/DELETE
DROP POLICY IF EXISTS "Admins manage PHA contacts" ON public.pha_contacts;
CREATE POLICY "Admins manage PHA contacts"
  ON public.pha_contacts
  FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- 2. Realtime channel authorization
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth users can read own user channel" ON realtime.messages;
CREATE POLICY "auth users can read own user channel"
  ON realtime.messages
  FOR SELECT
  TO authenticated
  USING (
    public.is_admin(auth.uid())
    OR topic = ('user:' || auth.uid()::text)
    OR topic LIKE ('user:' || auth.uid()::text || ':%')
  );

DROP POLICY IF EXISTS "auth users can broadcast own user channel" ON realtime.messages;
CREATE POLICY "auth users can broadcast own user channel"
  ON realtime.messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_admin(auth.uid())
    OR topic = ('user:' || auth.uid()::text)
    OR topic LIKE ('user:' || auth.uid()::text || ':%')
  );

-- 3. Public bucket listing lockdown
-- Replace the broad anyone-can-select policies. Files remain accessible via the
-- public CDN URL (which bypasses RLS for public buckets); only API enumeration
-- is restricted.
DROP POLICY IF EXISTS "Anyone can view property images" ON storage.objects;
CREATE POLICY "Authenticated can list property images"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'property-images');

DROP POLICY IF EXISTS "Vacancy photos publicly viewable" ON storage.objects;
CREATE POLICY "Authenticated can list vacancy photos"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'vacancy-photos');

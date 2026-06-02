
DROP POLICY IF EXISTS "Admins and agency staff view housing authorities" ON public.housing_authorities;

CREATE POLICY "Anyone authenticated can view active housing authorities"
ON public.housing_authorities FOR SELECT TO authenticated
USING (is_active = true);

CREATE POLICY "Anyone can view active housing authorities"
ON public.housing_authorities FOR SELECT TO anon
USING (is_active = true);

REVOKE SELECT (email, phone) ON public.housing_authorities FROM anon, authenticated;

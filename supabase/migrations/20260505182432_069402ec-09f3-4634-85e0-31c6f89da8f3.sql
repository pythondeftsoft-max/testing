
GRANT SELECT (email, phone) ON public.housing_authorities TO authenticated;
GRANT SELECT (email, phone) ON public.housing_authorities TO anon;

DROP POLICY IF EXISTS "Anyone authenticated can view active housing authorities" ON public.housing_authorities;
DROP POLICY IF EXISTS "Anyone can view active housing authorities" ON public.housing_authorities;

CREATE POLICY "Admins and agency staff view housing authorities"
ON public.housing_authorities FOR SELECT
USING (
  public.is_admin(auth.uid())
  OR public.is_agency_staff(auth.uid(), id)
);

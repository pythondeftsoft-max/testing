
CREATE OR REPLACE FUNCTION public.get_my_pha_contact(_id uuid)
RETURNS TABLE(email text, phone text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT ha.email, ha.phone
  FROM public.housing_authorities ha
  WHERE ha.id = _id
    AND (
      public.is_admin(auth.uid())
      OR public.is_agency_staff(auth.uid(), _id)
      OR EXISTS (
        SELECT 1 FROM public.tenant_profiles tp
        WHERE tp.user_id = auth.uid() AND tp.housing_authority_id = _id
      )
    );
$$;
GRANT EXECUTE ON FUNCTION public.get_my_pha_contact(uuid) TO authenticated;

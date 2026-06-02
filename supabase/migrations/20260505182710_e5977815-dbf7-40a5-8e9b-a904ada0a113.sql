
CREATE OR REPLACE FUNCTION public.admin_get_housing_authority_contacts(_ids uuid[])
RETURNS TABLE(id uuid, email text, phone text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT ha.id, ha.email, ha.phone
  FROM public.housing_authorities ha
  WHERE ha.id = ANY(_ids)
    AND public.is_admin(auth.uid());
$$;
REVOKE EXECUTE ON FUNCTION public.admin_get_housing_authority_contacts(uuid[]) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_get_housing_authority_contacts(uuid[]) TO authenticated;

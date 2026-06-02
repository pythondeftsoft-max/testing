CREATE POLICY "Anyone can view active housing authorities"
ON public.housing_authorities
FOR SELECT
TO anon
USING (is_active = true);
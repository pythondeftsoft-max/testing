-- Add SELECT policies on properties table to fix cascading RLS issue
-- These allow INSERT policies on maintenance_appointments to verify ownership

-- Allow property owners to view ALL their properties (any status)
CREATE POLICY "Property owners can view all their properties"
ON public.properties
FOR SELECT
USING (owner_id = auth.uid() AND deleted_at IS NULL);

-- Allow admins to view all properties
CREATE POLICY "Admins can view all properties"
ON public.properties
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.user_type = 'admin'
  )
);
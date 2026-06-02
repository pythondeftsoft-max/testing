
-- Add admin-only SELECT policy so admins can see drafts/scheduled content
CREATE POLICY "Admins can read all content"
ON public.content
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

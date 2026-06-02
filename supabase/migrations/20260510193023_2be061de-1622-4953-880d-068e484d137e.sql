-- Add auto_renew to agency_contracts
ALTER TABLE public.agency_contracts ADD COLUMN IF NOT EXISTS auto_renew BOOLEAN NOT NULL DEFAULT true;

-- Create private storage bucket for signed contracts
INSERT INTO storage.buckets (id, name, public)
VALUES ('agency-contracts', 'agency-contracts', false)
ON CONFLICT (id) DO NOTHING;

-- Admin-only RLS on bucket
DROP POLICY IF EXISTS "Admins can read agency contracts" ON storage.objects;
CREATE POLICY "Admins can read agency contracts"
ON storage.objects FOR SELECT
USING (bucket_id = 'agency-contracts' AND public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can upload agency contracts" ON storage.objects;
CREATE POLICY "Admins can upload agency contracts"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'agency-contracts' AND public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can update agency contracts" ON storage.objects;
CREATE POLICY "Admins can update agency contracts"
ON storage.objects FOR UPDATE
USING (bucket_id = 'agency-contracts' AND public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can delete agency contracts" ON storage.objects;
CREATE POLICY "Admins can delete agency contracts"
ON storage.objects FOR DELETE
USING (bucket_id = 'agency-contracts' AND public.is_admin(auth.uid()));
-- Create unit-documents storage bucket (private) if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'unit-documents',
  'unit-documents',
  false,
  52428800, -- 50MB limit
  ARRAY['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain']
)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS for unit-documents bucket (only add if not exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'storage' 
        AND tablename = 'objects' 
        AND policyname = 'Property owners can manage unit document files'
    ) THEN
        CREATE POLICY "Property owners can manage unit document files"
        ON storage.objects
        FOR ALL
        USING (
          bucket_id = 'unit-documents' AND
          EXISTS (
            SELECT 1 FROM public.property_units pu
            JOIN public.properties p ON pu.property_id = p.id
            WHERE pu.id::text = (storage.foldername(name))[1]
            AND (p.owner_id = auth.uid() OR (p.portfolio_id IS NOT NULL AND has_portfolio_role(p.portfolio_id, auth.uid(), ARRAY['admin_partner'::portfolio_role_type, 'editor'::portfolio_role_type])))
          )
        );
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'storage' 
        AND tablename = 'objects' 
        AND policyname = 'Approved tenants can view unit document files'
    ) THEN
        CREATE POLICY "Approved tenants can view unit document files"
        ON storage.objects
        FOR SELECT
        USING (
          bucket_id = 'unit-documents' AND
          EXISTS (
            SELECT 1 FROM public.property_units pu
            JOIN public.properties p ON pu.property_id = p.id
            LEFT JOIN public.property_applications pa ON p.id = pa.property_id
            WHERE pu.id::text = (storage.foldername(name))[1]
            AND pa.tenant_id = auth.uid()
            AND pa.status = 'approved'
          )
        );
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'storage' 
        AND tablename = 'objects' 
        AND policyname = 'Admins can manage all unit document files'
    ) THEN
        CREATE POLICY "Admins can manage all unit document files"
        ON storage.objects
        FOR ALL
        USING (bucket_id = 'unit-documents' AND is_admin(auth.uid()));
    END IF;
END $$;
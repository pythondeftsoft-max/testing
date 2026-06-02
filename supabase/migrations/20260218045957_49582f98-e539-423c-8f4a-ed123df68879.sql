
-- =============================================
-- Phase 3: self_reported_rent table + rent-proof storage bucket
-- =============================================

-- 1. Create the self_reported_rent table
CREATE TABLE public.self_reported_rent (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  address_text text NOT NULL,
  landlord_name text,
  monthly_rent numeric NOT NULL,
  currency_code text NOT NULL DEFAULT 'USD',
  month integer NOT NULL CHECK (month >= 1 AND month <= 12),
  year integer NOT NULL CHECK (year >= 1900 AND year <= 2100),
  payment_date date,
  proof_url text,
  verification_status text NOT NULL DEFAULT 'unverified'
    CHECK (verification_status IN ('unverified', 'document_verified', 'bank_verified', 'rejected')),
  verified_by uuid,
  verified_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, address_text, month, year)
);

-- 2. Enable RLS
ALTER TABLE public.self_reported_rent ENABLE ROW LEVEL SECURITY;

-- 3. RLS: Tenants can view their own rows
CREATE POLICY "Users can view own rent entries"
  ON public.self_reported_rent
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- 4. RLS: Tenants can insert their own rows
CREATE POLICY "Users can insert own rent entries"
  ON public.self_reported_rent
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 5. RLS: Tenants can update their own unverified rows
CREATE POLICY "Users can update own unverified rent entries"
  ON public.self_reported_rent
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id AND verification_status = 'unverified');

-- 6. RLS: Admins can view all rows
CREATE POLICY "Admins can view all rent entries"
  ON public.self_reported_rent
  FOR SELECT
  TO authenticated
  USING (is_admin(auth.uid()));

-- 7. RLS: Admins can update verification fields
CREATE POLICY "Admins can update rent verification"
  ON public.self_reported_rent
  FOR UPDATE
  TO authenticated
  USING (is_admin(auth.uid()));

-- 8. Indexes
CREATE INDEX idx_self_reported_rent_user_id ON public.self_reported_rent(user_id);
CREATE INDEX idx_self_reported_rent_verification ON public.self_reported_rent(verification_status);
CREATE INDEX idx_self_reported_rent_year_month ON public.self_reported_rent(year DESC, month DESC);

-- 9. Create rent-proof storage bucket (private)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'rent-proof',
  'rent-proof',
  false,
  10485760,
  ARRAY['application/pdf', 'image/jpeg', 'image/png']
);

-- 10. Storage RLS: tenants can upload to their own folder
CREATE POLICY "Tenants can upload rent proof"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'rent-proof'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- 11. Storage RLS: tenants can view their own proof files
CREATE POLICY "Tenants can view own rent proof"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'rent-proof'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- 12. Storage RLS: admins can view all rent proof
CREATE POLICY "Admins can view all rent proof"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'rent-proof'
    AND is_admin(auth.uid())
  );

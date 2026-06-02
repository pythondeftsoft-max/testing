-- Create table for payment link redirects
CREATE TABLE public.placement_fee_payment_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  stripe_checkout_url TEXT NOT NULL,
  placement_fee_id UUID NOT NULL REFERENCES public.landlord_placement_fees(id) ON DELETE CASCADE,
  property_address TEXT NOT NULL,
  payment_date TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '30 days'),
  accessed_count INTEGER DEFAULT 0,
  last_accessed_at TIMESTAMPTZ
);

-- Create index for fast slug lookups
CREATE INDEX idx_placement_fee_payment_links_slug ON public.placement_fee_payment_links(slug);
CREATE INDEX idx_placement_fee_payment_links_placement_fee_id ON public.placement_fee_payment_links(placement_fee_id);

-- Enable RLS
ALTER TABLE public.placement_fee_payment_links ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read active links (needed for redirect)
CREATE POLICY "Anyone can access valid payment links"
  ON public.placement_fee_payment_links
  FOR SELECT
  USING (expires_at > now());

-- Allow authenticated users to insert
CREATE POLICY "Authenticated users can create payment links"
  ON public.placement_fee_payment_links
  FOR INSERT
  TO authenticated
  WITH CHECK (true);
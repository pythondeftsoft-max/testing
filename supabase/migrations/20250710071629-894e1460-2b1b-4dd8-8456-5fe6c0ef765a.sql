-- Add Section 8 and voucher-specific fields to properties table
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS min_voucher_amount numeric;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS max_voucher_amount numeric;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS min_tenant_contribution numeric;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS credit_score_required integer;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS eviction_policy text;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS pha_payment_standard numeric;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS voucher_programs_accepted text[] DEFAULT '{}';
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS accessibility_features text[] DEFAULT '{}';
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS application_fee numeric DEFAULT 0;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS waives_fee_for_vouchers boolean DEFAULT false;

-- Update existing properties with sample Section 8 data
UPDATE public.properties SET
  min_voucher_amount = 600,
  max_voucher_amount = 1100,
  min_tenant_contribution = 200,
  credit_score_required = 580,
  eviction_policy = 'No evictions in last 3 years',
  pha_payment_standard = 1200,
  voucher_programs_accepted = ARRAY['Housing Choice Voucher (Section 8)', 'VASH', 'Mainstream'],
  accessibility_features = ARRAY['Wheelchair accessible entrance', 'Wide doorways', 'Accessible parking'],
  application_fee = 25,
  waives_fee_for_vouchers = true
WHERE id IN (
  SELECT id FROM public.properties 
  WHERE has_voucher = true 
  LIMIT 3
);

-- Update remaining properties with different voucher scenarios
UPDATE public.properties SET
  min_voucher_amount = 500,
  max_voucher_amount = 950,
  min_tenant_contribution = 150,
  credit_score_required = 600,
  eviction_policy = 'Case by case review',
  pha_payment_standard = 1000,
  voucher_programs_accepted = ARRAY['Housing Choice Voucher (Section 8)'],
  accessibility_features = ARRAY['Ground floor available', 'Service animal friendly'],
  application_fee = 35,
  waives_fee_for_vouchers = false
WHERE id NOT IN (
  SELECT id FROM public.properties 
  WHERE min_voucher_amount IS NOT NULL
) AND has_voucher = true;
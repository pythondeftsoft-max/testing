
-- Add missing columns to tenant_profiles table for Tally form integration
ALTER TABLE public.tenant_profiles 
ADD COLUMN phone_type text DEFAULT 'mobile',
ADD COLUMN city text,
ADD COLUMN zip_code text,
ADD COLUMN voucher_status text CHECK (voucher_status IN ('yes', 'in-progress', 'no')),
ADD COLUMN rent_range_min numeric,
ADD COLUMN rent_range_max numeric,
ADD COLUMN housing_authority text,
ADD COLUMN bedrooms_approved text[],
ADD COLUMN move_in_window text CHECK (move_in_window IN ('asap', '30-days', '1-2-months')),
ADD COLUMN credit_score_range text CHECK (credit_score_range IN ('below-500', '500-579', '580-639', '640-699', '700+', 'not-specified')),
ADD COLUMN has_eviction boolean DEFAULT false,
ADD COLUMN eviction_details text,
ADD COLUMN has_pets boolean DEFAULT false,
ADD COLUMN pet_type text,
ADD COLUMN has_accessibility_needs boolean DEFAULT false,
ADD COLUMN accessibility_details text,
ADD COLUMN has_felonies boolean DEFAULT false,
ADD COLUMN felony_details text;

-- Update existing records to have sensible defaults
UPDATE public.tenant_profiles 
SET 
  phone_type = 'mobile',
  voucher_status = CASE 
    WHEN voucher_holder = true THEN 'yes'
    ELSE 'no'
  END,
  move_in_window = 'asap',
  credit_score_range = CASE 
    WHEN credit_score >= 700 THEN '700+'
    WHEN credit_score >= 640 THEN '640-699'
    WHEN credit_score >= 580 THEN '580-639'
    WHEN credit_score >= 500 THEN '500-579'
    WHEN credit_score < 500 THEN 'below-500'
    ELSE 'not-specified'
  END,
  has_eviction = false,
  has_pets = false,
  has_accessibility_needs = false,
  has_felonies = false
WHERE phone_type IS NULL;

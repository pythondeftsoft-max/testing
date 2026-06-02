
INSERT INTO public.unit_applications (
  tenant_id, unit_id, status, priority_payment_made,
  payment_received_date, lease_signed_date, payment_method,
  stripe_payment_intent_id, payment_notes, is_primary_applicant,
  created_at, updated_at
)
SELECT
  lpf.tenant_id, lpf.unit_id, 'approved', true,
  COALESCE(lpf.payment_date, now()),
  COALESCE(lpf.payment_date, now()),
  COALESCE(lpf.payment_method, 'stripe'),
  lpf.stripe_payment_intent_id,
  'Created by data backfill from paid placement fee ' || lpf.id::text,
  true,
  COALESCE(lpf.payment_date, now()),
  now()
FROM public.landlord_placement_fees lpf
WHERE lpf.payment_status = 'paid'
  AND lpf.tenant_id IS NOT NULL
  AND lpf.unit_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.unit_applications ua
    WHERE ua.tenant_id = lpf.tenant_id AND ua.unit_id = lpf.unit_id
  );

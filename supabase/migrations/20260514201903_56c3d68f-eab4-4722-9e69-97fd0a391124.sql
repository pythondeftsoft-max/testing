
UPDATE public.unit_applications ua
SET
  priority_payment_made = true,
  payment_received_date = COALESCE(ua.payment_received_date, lpf.payment_date, now()),
  lease_signed_date     = COALESCE(ua.lease_signed_date, lpf.payment_date, ua.payment_received_date, now()),
  payment_method        = COALESCE(ua.payment_method, lpf.payment_method),
  updated_at            = now()
FROM public.landlord_placement_fees lpf
WHERE lpf.payment_status = 'paid'
  AND lpf.tenant_id = ua.tenant_id
  AND lpf.unit_id   = ua.unit_id
  AND ua.payment_received_date IS NULL;

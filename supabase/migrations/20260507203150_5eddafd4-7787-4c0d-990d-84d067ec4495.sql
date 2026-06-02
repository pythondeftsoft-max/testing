ALTER TABLE public.agency_payment_settings DROP CONSTRAINT IF EXISTS agency_payment_settings_primary_rail_check;
ALTER TABLE public.agency_payment_settings ADD CONSTRAINT agency_payment_settings_primary_rail_check
  CHECK (primary_rail = ANY (ARRAY['nacha','manual','ap_export','checkbook']));
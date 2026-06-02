-- Add payment timing fields to rent_splits table
ALTER TABLE public.rent_splits 
ADD COLUMN hap_payment_day INTEGER DEFAULT 1 CHECK (hap_payment_day >= 1 AND hap_payment_day <= 28),
ADD COLUMN tenant_payment_day INTEGER DEFAULT 1 CHECK (tenant_payment_day >= 1 AND tenant_payment_day <= 28);
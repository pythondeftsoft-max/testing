
ALTER TABLE public.housing_authorities
ADD COLUMN IF NOT EXISTS default_required_docs text[] DEFAULT NULL,
ADD COLUMN IF NOT EXISTS accepted_payment_methods text[] DEFAULT '{ach,digital_check}',
ADD COLUMN IF NOT EXISTS default_requirements_notes text DEFAULT NULL;

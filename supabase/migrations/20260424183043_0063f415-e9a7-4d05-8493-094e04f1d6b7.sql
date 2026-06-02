ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS pm_mode_enabled boolean NOT NULL DEFAULT false;

UPDATE public.profiles
SET pm_mode_enabled = true
WHERE user_type = 'landlord';
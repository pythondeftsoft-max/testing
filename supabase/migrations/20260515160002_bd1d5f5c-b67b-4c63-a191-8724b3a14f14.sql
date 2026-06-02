ALTER TABLE public.placement_fee_payment_links
  ADD COLUMN IF NOT EXISTS paid_at timestamptz,
  ADD COLUMN IF NOT EXISTS superseded_at timestamptz,
  ADD COLUMN IF NOT EXISTS superseded_by_slug text;

CREATE UNIQUE INDEX IF NOT EXISTS placement_fee_payment_links_active_per_fee_idx
  ON public.placement_fee_payment_links (placement_fee_id)
  WHERE paid_at IS NULL AND superseded_at IS NULL;

DROP FUNCTION IF EXISTS public.resolve_placement_fee_payment_link(text);

CREATE OR REPLACE FUNCTION public.resolve_placement_fee_payment_link(_slug text)
RETURNS TABLE(
  stripe_checkout_url text,
  expires_at timestamptz,
  paid_at timestamptz,
  superseded_at timestamptz,
  property_address text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  UPDATE public.placement_fee_payment_links
  SET accessed_count = COALESCE(accessed_count, 0) + 1,
      last_accessed_at = now()
  WHERE slug = _slug
  RETURNING stripe_checkout_url, expires_at, paid_at, superseded_at, property_address;
$function$;
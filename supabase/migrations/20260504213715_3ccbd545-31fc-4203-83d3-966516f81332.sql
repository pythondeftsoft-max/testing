UPDATE public.landlord_placement_fees
SET stripe_checkout_url = REPLACE(stripe_checkout_url, 'https://b3ed1340-284d-495e-8589-41c8e94a2dae.lovableproject.com', 'https://openkeyhousing.com')
WHERE stripe_checkout_url LIKE 'https://b3ed1340-284d-495e-8589-41c8e94a2dae.lovableproject.com/pay/%';

UPDATE public.landlord_placement_fees
SET stripe_checkout_url = REPLACE(stripe_checkout_url, 'https://kixsdhnfzjnxikmnbipi.supabase.co', 'https://openkeyhousing.com')
WHERE stripe_checkout_url LIKE 'https://kixsdhnfzjnxikmnbipi.supabase.co/pay/%';
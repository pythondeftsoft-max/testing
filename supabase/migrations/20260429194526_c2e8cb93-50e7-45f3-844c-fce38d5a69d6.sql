-- Explicitly set every relevant column; PostgreSQL writes NEW.* per trigger return.
UPDATE public.pha_enrichment 
SET authorized_units = COALESCE(authorized_units, leased_units),
    leased_units = leased_units;

-- Phase 1: DB foundations for reminders and owner-operated flag

-- 1) Add reminder-related columns to portfolio_assets
ALTER TABLE public.portfolio_assets
  ADD COLUMN IF NOT EXISTS update_reminder_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS update_reminder_frequency text
    CHECK (update_reminder_frequency IN ('quarterly','semi-annual','annual')),
  ADD COLUMN IF NOT EXISTS last_financial_update timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS next_reminder_date date;

COMMENT ON COLUMN public.portfolio_assets.update_reminder_enabled IS 'If true, user wants optional reminders to review/update financials';
COMMENT ON COLUMN public.portfolio_assets.update_reminder_frequency IS 'Optional reminder cadence: quarterly | semi-annual | annual';
COMMENT ON COLUMN public.portfolio_assets.last_financial_update IS 'Timestamp of the most recent financial update (manual or programmatic)';
COMMENT ON COLUMN public.portfolio_assets.next_reminder_date IS 'Next date a reminder should be generated, if enabled';


-- 2) Add owner-operated flag + reminder columns to properties
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS is_owner_operated boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS update_reminder_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS update_reminder_frequency text
    CHECK (update_reminder_frequency IN ('quarterly','semi-annual','annual')),
  ADD COLUMN IF NOT EXISTS last_financial_update timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS next_reminder_date date;

COMMENT ON COLUMN public.properties.is_owner_operated IS 'True when property operates as a business asset with no tenant management (e.g., hotel, restaurant, prison, medical facility, golf course)';
COMMENT ON COLUMN public.properties.update_reminder_enabled IS 'If true, user wants optional reminders to review/update financials';
COMMENT ON COLUMN public.properties.update_reminder_frequency IS 'Optional reminder cadence: quarterly | semi-annual | annual';
COMMENT ON COLUMN public.properties.last_financial_update IS 'Timestamp of the most recent financial update (manual or programmatic)';
COMMENT ON COLUMN public.properties.next_reminder_date IS 'Next date a reminder should be generated, if enabled';


-- 3) Helper to compute next reminder date from last update + frequency
CREATE OR REPLACE FUNCTION public.compute_next_reminder_date(last_update timestamptz, frequency text)
RETURNS date
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  IF frequency IS NULL THEN
    RETURN NULL;
  END IF;

  CASE frequency
    WHEN 'quarterly' THEN
      RETURN (last_update::date + INTERVAL '3 months')::date;
    WHEN 'semi-annual' THEN
      RETURN (last_update::date + INTERVAL '6 months')::date;
    WHEN 'annual' THEN
      RETURN (last_update::date + INTERVAL '12 months')::date;
    ELSE
      RETURN NULL;
  END CASE;
END;
$$;


-- 4) Generic trigger function to maintain reminder fields
CREATE OR REPLACE FUNCTION public.set_financial_reminder_fields()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Ensure last_financial_update is set
  IF NEW.last_financial_update IS NULL THEN
    NEW.last_financial_update := now();
  END IF;

  -- If reminders disabled or no frequency, clear next_reminder_date
  IF COALESCE(NEW.update_reminder_enabled, false) = false OR NEW.update_reminder_frequency IS NULL THEN
    NEW.next_reminder_date := NULL;
  ELSE
    NEW.next_reminder_date := public.compute_next_reminder_date(NEW.last_financial_update, NEW.update_reminder_frequency);
  END IF;

  RETURN NEW;
END;
$$;


-- 5) Triggers to apply the above logic to portfolio_assets
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'trg_portfolio_assets_set_reminder_fields'
  ) THEN
    DROP TRIGGER trg_portfolio_assets_set_reminder_fields ON public.portfolio_assets;
  END IF;
END;
$$;

CREATE TRIGGER trg_portfolio_assets_set_reminder_fields
BEFORE INSERT OR UPDATE OF update_reminder_enabled, update_reminder_frequency, last_financial_update
ON public.portfolio_assets
FOR EACH ROW
EXECUTE FUNCTION public.set_financial_reminder_fields();


-- 6) Triggers to apply the above logic to properties
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'trg_properties_set_reminder_fields'
  ) THEN
    DROP TRIGGER trg_properties_set_reminder_fields ON public.properties;
  END IF;
END;
$$;

CREATE TRIGGER trg_properties_set_reminder_fields
BEFORE INSERT OR UPDATE OF update_reminder_enabled, update_reminder_frequency, last_financial_update
ON public.properties
FOR EACH ROW
EXECUTE FUNCTION public.set_financial_reminder_fields();


-- 7) Indexes to help find due reminders efficiently
CREATE INDEX IF NOT EXISTS idx_portfolio_assets_next_reminder_due
  ON public.portfolio_assets (next_reminder_date)
  WHERE update_reminder_enabled = true;

CREATE INDEX IF NOT EXISTS idx_properties_next_reminder_due
  ON public.properties (next_reminder_date)
  WHERE update_reminder_enabled = true;

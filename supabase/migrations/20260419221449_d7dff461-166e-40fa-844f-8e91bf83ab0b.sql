CREATE OR REPLACE FUNCTION public.validate_inspection_type()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.inspection_type NOT IN ('initial','annual','special','reinspection','quality_control','move_in','move_out') THEN
    RAISE EXCEPTION 'Invalid inspection_type: %', NEW.inspection_type;
  END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.set_deficiency_cure_deadline()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.cure_deadline IS NULL THEN
    NEW.cure_deadline := CASE NEW.severity
      WHEN 'life_threatening' THEN now() + interval '24 hours'
      WHEN 'severe' THEN now() + interval '72 hours'
      WHEN 'moderate' THEN now() + interval '14 days'
      ELSE now() + interval '30 days'
    END;
  END IF;
  RETURN NEW;
END $$;
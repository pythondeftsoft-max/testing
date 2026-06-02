-- Fix security definer functions to use proper search path
CREATE OR REPLACE FUNCTION public.validate_deposit_allocation()
RETURNS TRIGGER AS $$
DECLARE
  deposit_amount NUMERIC;
  current_total_allocated NUMERIC;
BEGIN
  -- Get the deposit amount
  SELECT amount INTO deposit_amount
  FROM public.deposits
  WHERE id = NEW.deposit_id;
  
  -- Calculate total allocated (excluding this allocation if it's an update)
  SELECT COALESCE(SUM(amount), 0) INTO current_total_allocated
  FROM public.deposit_allocations
  WHERE deposit_id = NEW.deposit_id
  AND (TG_OP = 'INSERT' OR id != NEW.id);
  
  -- Add the current allocation amount
  current_total_allocated := current_total_allocated + NEW.amount;
  
  -- Check if over-allocated
  IF current_total_allocated > deposit_amount THEN
    RAISE EXCEPTION 'Total allocations (%) cannot exceed deposit amount (%)', current_total_allocated, deposit_amount;
  END IF;
  
  -- Update the deposits table with new total_allocated
  UPDATE public.deposits
  SET total_allocated = current_total_allocated
  WHERE id = NEW.deposit_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Fix activity logging function
CREATE OR REPLACE FUNCTION public.log_payment_activity()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.payment_activity_log (user_id, entity_type, entity_id, action, new_values)
    VALUES (
      auth.uid(),
      TG_TABLE_NAME::TEXT,
      NEW.id,
      'created',
      to_jsonb(NEW)
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.payment_activity_log (user_id, entity_type, entity_id, action, old_values, new_values)
    VALUES (
      auth.uid(),
      TG_TABLE_NAME::TEXT,
      NEW.id,
      'updated',
      to_jsonb(OLD),
      to_jsonb(NEW)
    );
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.payment_activity_log (user_id, entity_type, entity_id, action, old_values)
    VALUES (
      auth.uid(),
      TG_TABLE_NAME::TEXT,
      OLD.id,
      'deleted',
      to_jsonb(OLD)
    );
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
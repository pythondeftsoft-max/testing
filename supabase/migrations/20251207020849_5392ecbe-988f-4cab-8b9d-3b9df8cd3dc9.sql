-- Fix log_account_role_changes() trigger function - remove references to non-existent permissions_level column
CREATE OR REPLACE FUNCTION public.log_account_role_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.rbac_change_logs (
      user_id,
      changed_by,
      change_type,
      old_values,
      new_values
    ) VALUES (
      NEW.user_id,
      COALESCE(auth.uid(), NEW.added_by),
      'role_added',
      NULL,
      jsonb_build_object(
        'role_name', NEW.role_name,
        'is_active', NEW.is_active
      )
    );
    RETURN NEW;
    
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.rbac_change_logs (
      user_id,
      changed_by,
      change_type,
      old_values,
      new_values
    ) VALUES (
      NEW.user_id,
      auth.uid(),
      'role_updated',
      jsonb_build_object(
        'role_name', OLD.role_name,
        'is_active', OLD.is_active
      ),
      jsonb_build_object(
        'role_name', NEW.role_name,
        'is_active', NEW.is_active
      )
    );
    RETURN NEW;
    
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.rbac_change_logs (
      user_id,
      changed_by,
      change_type,
      old_values,
      new_values
    ) VALUES (
      OLD.user_id,
      auth.uid(),
      'role_removed',
      jsonb_build_object(
        'role_name', OLD.role_name,
        'is_active', OLD.is_active
      ),
      NULL
    );
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$function$;
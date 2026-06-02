-- Fix log_account_role_changes() trigger function - use correct change_type values that satisfy the check constraint
CREATE OR REPLACE FUNCTION public.log_account_role_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.rbac_change_logs (
      target_user_id,
      actor_user_id,
      change_type,
      scope,
      object,
      old_value,
      new_value
    ) VALUES (
      NEW.user_id,
      COALESCE(auth.uid(), NEW.added_by),
      'role_insert',
      'account',
      'account_roles',
      NULL,
      jsonb_build_object(
        'role_name', NEW.role_name,
        'is_active', NEW.is_active
      )
    );
    RETURN NEW;
    
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.rbac_change_logs (
      target_user_id,
      actor_user_id,
      change_type,
      scope,
      object,
      old_value,
      new_value
    ) VALUES (
      NEW.user_id,
      auth.uid(),
      'role_update',
      'account',
      'account_roles',
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
      target_user_id,
      actor_user_id,
      change_type,
      scope,
      object,
      old_value,
      new_value
    ) VALUES (
      OLD.user_id,
      auth.uid(),
      'role_delete',
      'account',
      'account_roles',
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
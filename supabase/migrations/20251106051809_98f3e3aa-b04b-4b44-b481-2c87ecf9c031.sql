-- Fix portfolio deletion by updating trigger functions to handle portfolio deletion gracefully
-- The triggers will check if the portfolio exists before inserting logs
-- If the portfolio is being deleted, it will use NULL for portfolio_id to avoid FK violations

CREATE OR REPLACE FUNCTION public.log_portfolio_role_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  safe_portfolio_id UUID;
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Check if portfolio exists, use NULL if being deleted
    SELECT id INTO safe_portfolio_id 
    FROM public.portfolios 
    WHERE id = NEW.portfolio_id;
    
    INSERT INTO public.rbac_change_logs (
      actor_user_id, target_user_id, change_type, scope, object, portfolio_id,
      new_value
    ) VALUES (
      COALESCE(auth.uid(), NEW.added_by),
      NEW.user_id, 'role_insert', 'portfolio', 'portfolio_roles', 
      safe_portfolio_id,
      jsonb_build_object(
        'role_name', NEW.role_name,
        'is_active', NEW.is_active,
        'permissions_level', NEW.permissions_level
      )
    );
    RETURN NEW;
    
  ELSIF TG_OP = 'UPDATE' THEN
    SELECT id INTO safe_portfolio_id 
    FROM public.portfolios 
    WHERE id = OLD.portfolio_id;
    
    INSERT INTO public.rbac_change_logs (
      actor_user_id, target_user_id, change_type, scope, object, portfolio_id,
      old_value, new_value
    ) VALUES (
      COALESCE(auth.uid(), OLD.added_by),
      OLD.user_id, 'role_update', 'portfolio', 'portfolio_roles',
      safe_portfolio_id,
      jsonb_build_object(
        'role_name', OLD.role_name,
        'is_active', OLD.is_active,
        'permissions_level', OLD.permissions_level
      ),
      jsonb_build_object(
        'role_name', NEW.role_name,
        'is_active', NEW.is_active,
        'permissions_level', NEW.permissions_level
      )
    );
    RETURN NEW;
    
  ELSIF TG_OP = 'DELETE' THEN
    -- Check if portfolio exists, use NULL if being deleted
    SELECT id INTO safe_portfolio_id 
    FROM public.portfolios 
    WHERE id = OLD.portfolio_id;
    
    INSERT INTO public.rbac_change_logs (
      actor_user_id, target_user_id, change_type, scope, object, portfolio_id,
      old_value
    ) VALUES (
      COALESCE(auth.uid(), OLD.added_by),
      OLD.user_id, 'role_delete', 'portfolio', 'portfolio_roles',
      safe_portfolio_id,
      jsonb_build_object(
        'role_name', OLD.role_name,
        'is_active', OLD.is_active,
        'permissions_level', OLD.permissions_level
      )
    );
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- Also update account role changes trigger for consistency
CREATE OR REPLACE FUNCTION public.log_account_role_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.rbac_change_logs (
      actor_user_id, target_user_id, change_type, scope, object,
      new_value
    ) VALUES (
      COALESCE(auth.uid(), NEW.added_by),
      NEW.user_id, 'role_insert', 'account', 'account_roles',
      jsonb_build_object(
        'role_name', NEW.role_name,
        'is_active', NEW.is_active,
        'permissions_level', NEW.permissions_level
      )
    );
    RETURN NEW;
    
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.rbac_change_logs (
      actor_user_id, target_user_id, change_type, scope, object,
      old_value, new_value
    ) VALUES (
      COALESCE(auth.uid(), OLD.added_by),
      OLD.user_id, 'role_update', 'account', 'account_roles',
      jsonb_build_object(
        'role_name', OLD.role_name,
        'is_active', OLD.is_active,
        'permissions_level', OLD.permissions_level
      ),
      jsonb_build_object(
        'role_name', NEW.role_name,
        'is_active', NEW.is_active,
        'permissions_level', NEW.permissions_level
      )
    );
    RETURN NEW;
    
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.rbac_change_logs (
      actor_user_id, target_user_id, change_type, scope, object,
      old_value
    ) VALUES (
      COALESCE(auth.uid(), OLD.added_by),
      OLD.user_id, 'role_delete', 'account', 'account_roles',
      jsonb_build_object(
        'role_name', OLD.role_name,
        'is_active', OLD.is_active,
        'permissions_level', OLD.permissions_level
      )
    );
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;
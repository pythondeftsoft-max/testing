
-- Step 3.1: Database Foundation for Account-Level RBAC

-- 1. Create account_role_type enum for account-level roles
CREATE TYPE public.account_role_type AS ENUM (
  'owner',           -- Account creator, full permissions
  'co_owner',        -- Same as owner, can manage everything  
  'admin_partner',   -- Everything except billing and owner management
  'support_assistant' -- View-only with limited edit permissions
);

-- 2. Create account_roles table for proper RBAC
CREATE TABLE public.account_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_name account_role_type NOT NULL,
  granted_by UUID REFERENCES auth.users(id),
  granted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Prevent duplicate active roles for same user
  UNIQUE(user_id, role_name) WHERE is_active = true
);

-- 3. Create account_role_changes table for audit trail
CREATE TABLE public.account_role_changes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  account_role_id UUID NOT NULL REFERENCES public.account_roles(id) ON DELETE CASCADE,
  changed_by UUID REFERENCES auth.users(id),
  change_type TEXT NOT NULL CHECK (change_type IN ('granted', 'revoked', 'reactivated', 'deactivated')),
  old_values JSONB,
  new_values JSONB,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 4. Add updated_at trigger for account_roles
CREATE TRIGGER update_account_roles_updated_at
  BEFORE UPDATE ON public.account_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 5. Create supporting functions for account role management

-- Function to check if user has specific account role(s)
CREATE OR REPLACE FUNCTION public.has_account_role(p_user_id UUID, p_roles account_role_type[])
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.account_roles
    WHERE user_id = p_user_id
    AND role_name = ANY(p_roles)
    AND is_active = true
  );
$$;

-- Function to get all active account roles for a user
CREATE OR REPLACE FUNCTION public.get_user_account_roles(p_user_id UUID)
RETURNS TABLE(role_name account_role_type, granted_at TIMESTAMP WITH TIME ZONE, granted_by UUID)
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT ar.role_name, ar.granted_at, ar.granted_by
  FROM public.account_roles ar
  WHERE ar.user_id = p_user_id
  AND ar.is_active = true
  ORDER BY 
    CASE ar.role_name 
      WHEN 'owner' THEN 1
      WHEN 'co_owner' THEN 2
      WHEN 'admin_partner' THEN 3
      WHEN 'support_assistant' THEN 4
    END;
$$;

-- Function to get user's highest account role
CREATE OR REPLACE FUNCTION public.get_highest_account_role(p_user_id UUID)
RETURNS account_role_type
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT role_name
  FROM public.account_roles
  WHERE user_id = p_user_id
  AND is_active = true
  ORDER BY 
    CASE role_name 
      WHEN 'owner' THEN 1
      WHEN 'co_owner' THEN 2
      WHEN 'admin_partner' THEN 3
      WHEN 'support_assistant' THEN 4
    END
  LIMIT 1;
$$;

-- New admin check function using account_roles (v2)
CREATE OR REPLACE FUNCTION public.is_account_admin(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT has_account_role(p_user_id, ARRAY['owner', 'co_owner', 'admin_partner']::account_role_type[]);
$$;

-- Function to prevent removing last owner
CREATE OR REPLACE FUNCTION public.validate_account_role_change()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  owner_count INTEGER;
BEGIN
  -- Only check when deactivating/deleting owner roles
  IF (TG_OP = 'UPDATE' AND OLD.role_name = 'owner' AND NEW.is_active = false) OR
     (TG_OP = 'DELETE' AND OLD.role_name = 'owner') THEN
    
    -- Count remaining active owners
    SELECT COUNT(*) INTO owner_count
    FROM public.account_roles
    WHERE role_name = 'owner'
    AND is_active = true
    AND id != COALESCE(OLD.id, NEW.id);
    
    -- Prevent removing last owner
    IF owner_count = 0 THEN
      RAISE EXCEPTION 'Cannot remove the last owner. At least one owner must remain.';
    END IF;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Function to create audit trail
CREATE OR REPLACE FUNCTION public.audit_account_role_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  change_type_val TEXT;
  old_vals JSONB;
  new_vals JSONB;
BEGIN
  -- Determine change type
  IF TG_OP = 'INSERT' THEN
    change_type_val := 'granted';
    old_vals := NULL;
    new_vals := to_jsonb(NEW);
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.is_active = true AND NEW.is_active = false THEN
      change_type_val := 'deactivated';
    ELSIF OLD.is_active = false AND NEW.is_active = true THEN
      change_type_val := 'reactivated';
    ELSE
      change_type_val := 'modified';
    END IF;
    old_vals := to_jsonb(OLD);
    new_vals := to_jsonb(NEW);
  ELSIF TG_OP = 'DELETE' THEN
    change_type_val := 'revoked';
    old_vals := to_jsonb(OLD);
    new_vals := NULL;
  END IF;
  
  -- Insert audit record
  INSERT INTO public.account_role_changes (
    account_role_id,
    changed_by,
    change_type,
    old_values,
    new_values
  ) VALUES (
    COALESCE(NEW.id, OLD.id),
    auth.uid(),
    change_type_val,
    old_vals,
    new_vals
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- 6. Add validation and audit triggers
CREATE TRIGGER validate_account_role_change_trigger
  BEFORE UPDATE OR DELETE ON public.account_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_account_role_change();

CREATE TRIGGER audit_account_role_changes_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.account_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_account_role_changes();

-- 7. Enable RLS on new tables
ALTER TABLE public.account_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_role_changes ENABLE ROW LEVEL SECURITY;

-- 8. Create RLS policies for account_roles
CREATE POLICY "Account admins can manage account roles" ON public.account_roles
  FOR ALL USING (
    is_admin(auth.uid()) OR 
    has_account_role(auth.uid(), ARRAY['owner', 'co_owner', 'admin_partner']::account_role_type[])
  );

CREATE POLICY "Users can view their own account roles" ON public.account_roles
  FOR SELECT USING (
    user_id = auth.uid()
  );

-- 9. Create RLS policies for account_role_changes (audit table)
CREATE POLICY "Account admins can view role change history" ON public.account_role_changes
  FOR SELECT USING (
    is_admin(auth.uid()) OR 
    has_account_role(auth.uid(), ARRAY['owner', 'co_owner', 'admin_partner']::account_role_type[])
  );

-- 10. Insert initial owner role for existing admin users
-- This maintains backward compatibility
INSERT INTO public.account_roles (user_id, role_name, granted_by, notes)
SELECT 
  p.id,
  'owner'::account_role_type,
  p.id, -- Self-granted for initial setup
  'Initial owner role migrated from user_type admin'
FROM public.profiles p
WHERE p.user_type = 'admin'
AND NOT EXISTS (
  SELECT 1 FROM public.account_roles ar 
  WHERE ar.user_id = p.id 
  AND ar.is_active = true
);

-- 11. Create indexes for performance
CREATE INDEX idx_account_roles_user_active ON public.account_roles(user_id, is_active);
CREATE INDEX idx_account_roles_role_active ON public.account_roles(role_name, is_active);
CREATE INDEX idx_account_role_changes_role_id ON public.account_role_changes(account_role_id);
CREATE INDEX idx_account_role_changes_created_at ON public.account_role_changes(created_at);

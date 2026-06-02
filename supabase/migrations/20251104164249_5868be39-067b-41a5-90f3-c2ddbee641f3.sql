-- Create function to update system admin role and notes
CREATE OR REPLACE FUNCTION public.update_system_admin(
  p_admin_id uuid,
  p_role_name text,
  p_notes text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update the system admin record
  UPDATE public.system_admins
  SET 
    role_name = p_role_name::system_admin_role_type,
    notes = p_notes,
    updated_at = now()
  WHERE id = p_admin_id
    AND is_active = true;
    
  IF NOT FOUND THEN
    RAISE EXCEPTION 'System admin not found or inactive';
  END IF;
END;
$$;
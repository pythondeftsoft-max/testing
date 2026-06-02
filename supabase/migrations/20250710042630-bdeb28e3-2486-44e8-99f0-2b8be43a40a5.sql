-- Add user status tracking and soft delete functionality
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active', 'deactivated', 'deleted')),
ADD COLUMN IF NOT EXISTS deactivated_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES public.profiles(id);

-- Create a table to store deleted user data for recovery
CREATE TABLE IF NOT EXISTS public.deleted_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    original_user_id UUID NOT NULL,
    user_data JSONB NOT NULL,
    profile_data JSONB NOT NULL,
    related_data JSONB, -- Store related data like properties, applications, etc.
    deleted_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    deleted_by UUID REFERENCES public.profiles(id),
    purge_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + INTERVAL '30 days'), -- Auto-purge after 30 days
    restored_at TIMESTAMP WITH TIME ZONE,
    restored_by UUID REFERENCES public.profiles(id)
);

-- Enable RLS on deleted_users table
ALTER TABLE public.deleted_users ENABLE ROW LEVEL SECURITY;

-- Policy for admins to manage deleted users
CREATE POLICY "Admins can manage deleted users" ON public.deleted_users
FOR ALL USING (is_admin(auth.uid()));

-- Function to soft delete a user
CREATE OR REPLACE FUNCTION public.soft_delete_user(
    target_user_id UUID,
    deleted_by_user_id UUID
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_auth_data JSONB;
    user_profile_data JSONB;
    user_related_data JSONB;
BEGIN
    -- Check if the deleting user is an admin
    IF NOT is_admin(deleted_by_user_id) THEN
        RAISE EXCEPTION 'Only admins can delete users';
    END IF;

    -- Get user data from auth.users (only what we can access)
    SELECT to_jsonb(au.*) INTO user_auth_data
    FROM auth.users au 
    WHERE au.id = target_user_id;

    -- Get profile data
    SELECT to_jsonb(p.*) INTO user_profile_data
    FROM public.profiles p 
    WHERE p.id = target_user_id;

    -- Collect related data
    SELECT jsonb_build_object(
        'properties', (SELECT jsonb_agg(to_jsonb(pr.*)) FROM public.properties pr WHERE pr.owner_id = target_user_id),
        'property_applications', (SELECT jsonb_agg(to_jsonb(pa.*)) FROM public.property_applications pa WHERE pa.tenant_id = target_user_id),
        'tenant_profile', (SELECT to_jsonb(tp.*) FROM public.tenant_profiles tp WHERE tp.user_id = target_user_id),
        'maintenance_requests', (SELECT jsonb_agg(to_jsonb(mr.*)) FROM public.maintenance_requests mr WHERE mr.tenant_id = target_user_id),
        'messages', (SELECT jsonb_agg(to_jsonb(m.*)) FROM public.messages m WHERE m.sender_id = target_user_id),
        'notifications', (SELECT jsonb_agg(to_jsonb(n.*)) FROM public.notifications n WHERE n.user_id = target_user_id)
    ) INTO user_related_data;

    -- Store deleted user data
    INSERT INTO public.deleted_users (
        original_user_id,
        user_data,
        profile_data,
        related_data,
        deleted_by
    ) VALUES (
        target_user_id,
        user_auth_data,
        user_profile_data,
        user_related_data,
        deleted_by_user_id
    );

    -- Update profile status to deleted
    UPDATE public.profiles 
    SET status = 'deleted',
        deleted_at = now(),
        deleted_by = deleted_by_user_id
    WHERE id = target_user_id;

    -- Delete related data (cascade will handle most of this)
    DELETE FROM public.tenant_profiles WHERE user_id = target_user_id;
    DELETE FROM public.property_applications WHERE tenant_id = target_user_id;
    DELETE FROM public.maintenance_requests WHERE tenant_id = target_user_id;
    DELETE FROM public.messages WHERE sender_id = target_user_id;
    DELETE FROM public.notifications WHERE user_id = target_user_id;
    
    -- Properties will be handled separately if needed
    UPDATE public.properties SET status = 'deleted' WHERE owner_id = target_user_id;

    RETURN TRUE;
END;
$$;

-- Function to restore a deleted user
CREATE OR REPLACE FUNCTION public.restore_deleted_user(
    deleted_user_record_id UUID,
    restored_by_user_id UUID
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    deleted_record RECORD;
BEGIN
    -- Check if the restoring user is an admin
    IF NOT is_admin(restored_by_user_id) THEN
        RAISE EXCEPTION 'Only admins can restore users';
    END IF;

    -- Get the deleted user record
    SELECT * INTO deleted_record 
    FROM public.deleted_users 
    WHERE id = deleted_user_record_id 
    AND restored_at IS NULL;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Deleted user record not found or already restored';
    END IF;

    -- Restore profile
    UPDATE public.profiles 
    SET status = 'active',
        deleted_at = NULL,
        deleted_by = NULL
    WHERE id = deleted_record.original_user_id;

    -- Mark as restored in deleted_users table
    UPDATE public.deleted_users 
    SET restored_at = now(),
        restored_by = restored_by_user_id
    WHERE id = deleted_user_record_id;

    -- Note: We don't automatically restore all related data as it might conflict
    -- with current state. This should be done manually if needed.

    RETURN TRUE;
END;
$$;

-- Function to permanently purge old deleted users
CREATE OR REPLACE FUNCTION public.purge_old_deleted_users()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    purged_count INTEGER;
BEGIN
    -- Delete records older than purge_at date
    WITH purged AS (
        DELETE FROM public.deleted_users 
        WHERE purge_at < now() 
        AND restored_at IS NULL
        RETURNING id
    )
    SELECT COUNT(*) INTO purged_count FROM purged;

    RETURN purged_count;
END;
$$;

-- Function to deactivate user
CREATE OR REPLACE FUNCTION public.deactivate_user(
    target_user_id UUID,
    deactivated_by_user_id UUID
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Check if the deactivating user is an admin
    IF NOT is_admin(deactivated_by_user_id) THEN
        RAISE EXCEPTION 'Only admins can deactivate users';
    END IF;

    -- Update profile status
    UPDATE public.profiles 
    SET status = 'deactivated',
        deactivated_at = now()
    WHERE id = target_user_id;

    RETURN TRUE;
END;
$$;

-- Function to reactivate user
CREATE OR REPLACE FUNCTION public.reactivate_user(
    target_user_id UUID,
    reactivated_by_user_id UUID
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Check if the reactivating user is an admin
    IF NOT is_admin(reactivated_by_user_id) THEN
        RAISE EXCEPTION 'Only admins can reactivate users';
    END IF;

    -- Update profile status
    UPDATE public.profiles 
    SET status = 'active',
        deactivated_at = NULL
    WHERE id = target_user_id;

    RETURN TRUE;
END;
$$;
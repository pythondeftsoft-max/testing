-- Add property status tracking and soft delete functionality
ALTER TABLE public.properties 
ADD COLUMN IF NOT EXISTS deactivated_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES public.profiles(id);

-- Update the status column check constraint to include new statuses
ALTER TABLE public.properties DROP CONSTRAINT IF EXISTS properties_status_check;
ALTER TABLE public.properties ADD CONSTRAINT properties_status_check 
CHECK (status IN ('available', 'occupied', 'vacant', 'under_review', 'deactivated', 'deleted'));

-- Create a table to store deleted property data for recovery
CREATE TABLE IF NOT EXISTS public.deleted_properties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    original_property_id UUID NOT NULL,
    property_data JSONB NOT NULL,
    related_data JSONB, -- Store related data like applications, documents, etc.
    deleted_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    deleted_by UUID REFERENCES public.profiles(id),
    purge_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + INTERVAL '30 days'),
    restored_at TIMESTAMP WITH TIME ZONE,
    restored_by UUID REFERENCES public.profiles(id)
);

-- Enable RLS on deleted_properties table
ALTER TABLE public.deleted_properties ENABLE ROW LEVEL SECURITY;

-- Policy for admins to manage deleted properties
CREATE POLICY "Admins can manage deleted properties" ON public.deleted_properties
FOR ALL USING (is_admin(auth.uid()));

-- Property owners can view their deleted properties
CREATE POLICY "Property owners can view their deleted properties" ON public.deleted_properties
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM jsonb_to_record(property_data) AS p(owner_id UUID)
        WHERE p.owner_id = auth.uid()
    )
);

-- Function to soft delete a property
CREATE OR REPLACE FUNCTION public.soft_delete_property(
    target_property_id UUID,
    deleted_by_user_id UUID
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    property_data JSONB;
    property_related_data JSONB;
BEGIN
    -- Check if the deleting user is an admin or property owner
    IF NOT (is_admin(deleted_by_user_id) OR 
            EXISTS(SELECT 1 FROM public.properties WHERE id = target_property_id AND owner_id = deleted_by_user_id)) THEN
        RAISE EXCEPTION 'Only admins or property owners can delete properties';
    END IF;

    -- Get property data
    SELECT to_jsonb(p.*) INTO property_data
    FROM public.properties p 
    WHERE p.id = target_property_id;

    -- Collect related data
    SELECT jsonb_build_object(
        'property_applications', (SELECT jsonb_agg(to_jsonb(pa.*)) FROM public.property_applications pa WHERE pa.property_id = target_property_id),
        'property_documents', (SELECT jsonb_agg(to_jsonb(pd.*)) FROM public.property_documents pd WHERE pd.property_id = target_property_id),
        'maintenance_requests', (SELECT jsonb_agg(to_jsonb(mr.*)) FROM public.maintenance_requests mr WHERE mr.property_id = target_property_id),
        'rent_payments', (SELECT jsonb_agg(to_jsonb(rp.*)) FROM public.rent_payments rp WHERE rp.property_id = target_property_id),
        'viewing_appointments', (SELECT jsonb_agg(to_jsonb(va.*)) FROM public.viewing_appointments va WHERE va.property_id = target_property_id)
    ) INTO property_related_data;

    -- Store deleted property data
    INSERT INTO public.deleted_properties (
        original_property_id,
        property_data,
        related_data,
        deleted_by
    ) VALUES (
        target_property_id,
        property_data,
        property_related_data,
        deleted_by_user_id
    );

    -- Update property status to deleted
    UPDATE public.properties 
    SET status = 'deleted',
        deleted_at = now(),
        deleted_by = deleted_by_user_id
    WHERE id = target_property_id;

    -- Delete related data (some will cascade, others we handle manually)
    DELETE FROM public.property_applications WHERE property_id = target_property_id;
    DELETE FROM public.maintenance_requests WHERE property_id = target_property_id;
    DELETE FROM public.viewing_appointments WHERE property_id = target_property_id;

    RETURN TRUE;
END;
$$;

-- Function to restore a deleted property
CREATE OR REPLACE FUNCTION public.restore_deleted_property(
    deleted_property_record_id UUID,
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
        RAISE EXCEPTION 'Only admins can restore properties';
    END IF;

    -- Get the deleted property record
    SELECT * INTO deleted_record 
    FROM public.deleted_properties 
    WHERE id = deleted_property_record_id 
    AND restored_at IS NULL;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Deleted property record not found or already restored';
    END IF;

    -- Restore property
    UPDATE public.properties 
    SET status = 'available',
        deleted_at = NULL,
        deleted_by = NULL
    WHERE id = deleted_record.original_property_id;

    -- Mark as restored in deleted_properties table
    UPDATE public.deleted_properties 
    SET restored_at = now(),
        restored_by = restored_by_user_id
    WHERE id = deleted_property_record_id;

    RETURN TRUE;
END;
$$;

-- Function to deactivate property
CREATE OR REPLACE FUNCTION public.deactivate_property(
    target_property_id UUID,
    deactivated_by_user_id UUID
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Check if the deactivating user is an admin or property owner
    IF NOT (is_admin(deactivated_by_user_id) OR 
            EXISTS(SELECT 1 FROM public.properties WHERE id = target_property_id AND owner_id = deactivated_by_user_id)) THEN
        RAISE EXCEPTION 'Only admins or property owners can deactivate properties';
    END IF;

    -- Update property status
    UPDATE public.properties 
    SET status = 'deactivated',
        deactivated_at = now()
    WHERE id = target_property_id;

    RETURN TRUE;
END;
$$;

-- Function to reactivate property
CREATE OR REPLACE FUNCTION public.reactivate_property(
    target_property_id UUID,
    reactivated_by_user_id UUID
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Check if the reactivating user is an admin or property owner
    IF NOT (is_admin(reactivated_by_user_id) OR 
            EXISTS(SELECT 1 FROM public.properties WHERE id = target_property_id AND owner_id = reactivated_by_user_id)) THEN
        RAISE EXCEPTION 'Only admins or property owners can reactivate properties';
    END IF;

    -- Update property status
    UPDATE public.properties 
    SET status = 'available',
        deactivated_at = NULL
    WHERE id = target_property_id;

    RETURN TRUE;
END;
$$;
-- Update deactivate_property function to set proper status
CREATE OR REPLACE FUNCTION public.deactivate_property(target_property_id uuid, deactivated_by_user_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    -- Check if the deactivating user is an admin or property owner
    IF NOT (is_admin(deactivated_by_user_id) OR 
            EXISTS(SELECT 1 FROM public.properties WHERE id = target_property_id AND owner_id = deactivated_by_user_id)) THEN
        RAISE EXCEPTION 'Only admins or property owners can deactivate properties';
    END IF;

    -- Update property status to deactivated (removes from market)
    UPDATE public.properties 
    SET status = 'deactivated',
        deactivated_at = now()
    WHERE id = target_property_id;

    RETURN TRUE;
END;
$function$;

-- Update reactivate_property function to set proper status
CREATE OR REPLACE FUNCTION public.reactivate_property(target_property_id uuid, reactivated_by_user_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    -- Check if the reactivating user is an admin or property owner
    IF NOT (is_admin(reactivated_by_user_id) OR 
            EXISTS(SELECT 1 FROM public.properties WHERE id = target_property_id AND owner_id = reactivated_by_user_id)) THEN
        RAISE EXCEPTION 'Only admins or property owners can reactivate properties';
    END IF;

    -- Update property status to available (puts back on market)
    UPDATE public.properties 
    SET status = 'available',
        deactivated_at = NULL
    WHERE id = target_property_id;

    RETURN TRUE;
END;
$function$;
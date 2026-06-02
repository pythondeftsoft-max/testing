-- Fix portfolio deletion to properly soft delete properties instead of moving them to Everything view

-- Update soft_delete_portfolio function to properly soft delete properties
CREATE OR REPLACE FUNCTION public.soft_delete_portfolio(target_portfolio_id uuid, deleted_by_user_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    portfolio_data JSONB;
    portfolio_related_data JSONB;
BEGIN
    -- Check if the deleting user is an admin or portfolio manager
    IF NOT (is_admin(deleted_by_user_id) OR 
            EXISTS(SELECT 1 FROM public.portfolios WHERE id = target_portfolio_id AND manager_id = deleted_by_user_id)) THEN
        RAISE EXCEPTION 'Only admins or portfolio managers can delete portfolios';
    END IF;

    -- Get portfolio data
    SELECT to_jsonb(p.*) INTO portfolio_data
    FROM public.portfolios p 
    WHERE p.id = target_portfolio_id;

    -- Collect related data (properties assigned to this portfolio)
    SELECT jsonb_build_object(
        'properties', (SELECT jsonb_agg(to_jsonb(pr.*)) FROM public.properties pr WHERE pr.portfolio_id = target_portfolio_id AND pr.deleted_at IS NULL)
    ) INTO portfolio_related_data;

    -- Store deleted portfolio data
    INSERT INTO public.deleted_portfolios (
        original_portfolio_id,
        portfolio_data,
        related_data,
        deleted_by
    ) VALUES (
        target_portfolio_id,
        portfolio_data,
        portfolio_related_data,
        deleted_by_user_id
    );

    -- Soft delete properties in this portfolio (keep portfolio_id, set deleted_at)
    UPDATE public.properties 
    SET deleted_at = now(), deleted_by = deleted_by_user_id
    WHERE portfolio_id = target_portfolio_id AND deleted_at IS NULL;

    -- Delete the portfolio
    DELETE FROM public.portfolios WHERE id = target_portfolio_id;

    RETURN TRUE;
END;
$function$;

-- Update restore_deleted_portfolio function to also restore properties
CREATE OR REPLACE FUNCTION public.restore_deleted_portfolio(deleted_portfolio_record_id uuid, restored_by_user_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    deleted_record RECORD;
    new_portfolio_id UUID;
    original_portfolio_id UUID;
BEGIN
    -- Check if the restoring user is an admin
    IF NOT is_admin(restored_by_user_id) THEN
        RAISE EXCEPTION 'Only admins can restore portfolios';
    END IF;

    -- Get the deleted portfolio record
    SELECT * INTO deleted_record 
    FROM public.deleted_portfolios 
    WHERE id = deleted_portfolio_record_id 
    AND restored_at IS NULL;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Deleted portfolio record not found or already restored';
    END IF;

    -- Generate new UUID for restored portfolio
    new_portfolio_id := gen_random_uuid();
    original_portfolio_id := deleted_record.original_portfolio_id;

    -- Restore portfolio with new ID
    INSERT INTO public.portfolios (id, manager_id, client_name, client_email, client_phone, created_at, updated_at)
    SELECT 
        new_portfolio_id,
        (deleted_record.portfolio_data->>'manager_id')::UUID,
        deleted_record.portfolio_data->>'client_name',
        deleted_record.portfolio_data->>'client_email',
        deleted_record.portfolio_data->>'client_phone',
        (deleted_record.portfolio_data->>'created_at')::TIMESTAMP WITH TIME ZONE,
        now();

    -- Restore properties associated with this portfolio
    UPDATE public.properties 
    SET deleted_at = NULL, 
        deleted_by = NULL,
        portfolio_id = new_portfolio_id
    WHERE portfolio_id = original_portfolio_id 
    AND deleted_at IS NOT NULL;

    -- Mark as restored in deleted_portfolios table
    UPDATE public.deleted_portfolios 
    SET restored_at = now(),
        restored_by = restored_by_user_id
    WHERE id = deleted_portfolio_record_id;

    RETURN TRUE;
END;
$function$;

-- Update property RLS policies to exclude soft-deleted properties from all views
DROP POLICY IF EXISTS "Authenticated users can view available properties" ON public.properties;
CREATE POLICY "Authenticated users can view available properties" ON public.properties
FOR SELECT TO authenticated
USING (status = 'available' AND deleted_at IS NULL);

DROP POLICY IF EXISTS "Public can view available properties" ON public.properties;
CREATE POLICY "Public can view available properties" ON public.properties
FOR SELECT TO anon
USING (status = 'available' AND deleted_at IS NULL);

DROP POLICY IF EXISTS "Owners can read their properties" ON public.properties;
CREATE POLICY "Owners can read their properties" ON public.properties
FOR SELECT TO authenticated
USING (owner_id = auth.uid() AND deleted_at IS NULL);

DROP POLICY IF EXISTS "Tenants can view properties they have applications for" ON public.properties;
CREATE POLICY "Tenants can view properties they have applications for" ON public.properties
FOR SELECT TO authenticated
USING (user_has_approved_application_for_property(id) AND deleted_at IS NULL);

DROP POLICY IF EXISTS "Admins can view all properties" ON public.properties;
CREATE POLICY "Admins can view all properties" ON public.properties
FOR SELECT TO authenticated
USING (is_admin(auth.uid()));

-- Add function to get deleted portfolios for the authenticated user
CREATE OR REPLACE FUNCTION public.get_deleted_portfolios_for_user(user_id uuid)
 RETURNS TABLE(
    id uuid,
    original_portfolio_id uuid,
    portfolio_data jsonb,
    related_data jsonb,
    deleted_at timestamp with time zone,
    purge_at timestamp with time zone,
    property_count integer
 )
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        dp.id,
        dp.original_portfolio_id,
        dp.portfolio_data,
        dp.related_data,
        dp.deleted_at,
        dp.purge_at,
        COALESCE(
            (SELECT COUNT(*)::integer 
             FROM public.properties p 
             WHERE p.portfolio_id = dp.original_portfolio_id 
             AND p.deleted_at IS NOT NULL),
            0
        ) as property_count
    FROM public.deleted_portfolios dp
    WHERE (dp.portfolio_data->>'manager_id')::uuid = user_id
    AND dp.restored_at IS NULL
    ORDER BY dp.deleted_at DESC;
END;
$function$;
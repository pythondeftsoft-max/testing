-- Update restore_deleted_portfolio function to allow landlords to restore their own portfolios
CREATE OR REPLACE FUNCTION public.restore_deleted_portfolio(deleted_portfolio_record_id uuid, restored_by_user_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    deleted_record RECORD;
    new_portfolio_id UUID;
    original_portfolio_id UUID;
    original_manager_id UUID;
BEGIN
    -- Get the deleted portfolio record
    SELECT * INTO deleted_record 
    FROM public.deleted_portfolios 
    WHERE id = deleted_portfolio_record_id 
    AND restored_at IS NULL;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Deleted portfolio record not found or already restored';
    END IF;

    -- Get the original manager ID from the portfolio data
    original_manager_id := (deleted_record.portfolio_data->>'manager_id')::UUID;

    -- Check if the restoring user is an admin or the original portfolio manager
    IF NOT (is_admin(restored_by_user_id) OR restored_by_user_id = original_manager_id) THEN
        RAISE EXCEPTION 'Only admins or the original portfolio manager can restore portfolios';
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
-- Create function to clear all deleted portfolios for a user
CREATE OR REPLACE FUNCTION public.clear_trash_bin_for_user(user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Check if the user is clearing their own trash or is an admin
    IF NOT (user_id = auth.uid() OR is_admin(auth.uid())) THEN
        RAISE EXCEPTION 'You can only clear your own trash bin';
    END IF;

    -- Delete all deleted portfolios for this user that haven't been restored
    WITH deleted_records AS (
        DELETE FROM public.deleted_portfolios 
        WHERE restored_at IS NULL
        AND (
            -- User's own deleted portfolios
            (user_id = auth.uid() AND EXISTS (
                SELECT 1 FROM jsonb_to_record(portfolio_data) p(manager_id uuid)
                WHERE p.manager_id = user_id
            ))
            OR
            -- Admin can clear any user's trash
            (is_admin(auth.uid()))
        )
        RETURNING id
    )
    SELECT COUNT(*) INTO deleted_count FROM deleted_records;

    RETURN deleted_count;
END;
$function$;
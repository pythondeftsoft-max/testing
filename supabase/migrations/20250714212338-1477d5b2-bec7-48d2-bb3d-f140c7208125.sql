-- Remove automatic property assignment from create_test_portfolio_for_landlord function
CREATE OR REPLACE FUNCTION public.create_test_portfolio_for_landlord(landlord_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    test_portfolio_id UUID;
    landlord_name TEXT;
BEGIN
    -- Check if landlord already has a "Test Portfolio 1"
    SELECT id INTO test_portfolio_id 
    FROM public.portfolios 
    WHERE manager_id = landlord_id 
    AND client_name = 'Test Portfolio 1';

    IF test_portfolio_id IS NOT NULL THEN
        RETURN test_portfolio_id;
    END IF;

    -- Get landlord name for portfolio client name
    SELECT COALESCE(first_name || ' ' || last_name, company_name, 'Test Client') 
    INTO landlord_name
    FROM public.profiles 
    WHERE id = landlord_id;

    -- Create the test portfolio (without assigning any properties)
    INSERT INTO public.portfolios (manager_id, client_name, client_email, client_phone)
    VALUES (
        landlord_id,
        'Test Portfolio 1',
        NULL,
        NULL
    ) RETURNING id INTO test_portfolio_id;

    -- DO NOT automatically assign existing properties to this portfolio
    -- Properties should remain unassigned (portfolio_id = NULL) until explicitly assigned

    RETURN test_portfolio_id;
END;
$function$;
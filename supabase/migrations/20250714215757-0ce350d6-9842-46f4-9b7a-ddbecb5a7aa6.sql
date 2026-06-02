-- Update existing test properties to be assigned to Test Portfolio 1
DO $$
DECLARE
    test_portfolio_id UUID := 'cfa63756-0823-4e39-a992-b3c18ea5a827';
    demo_landlord_id UUID;
    var_count INTEGER;
BEGIN
    -- Find the demo landlord account
    SELECT id INTO demo_landlord_id 
    FROM auth.users 
    WHERE email = 'landlord@openkey.com';
    
    -- Only proceed if demo landlord exists
    IF demo_landlord_id IS NOT NULL THEN
        -- Update any existing properties without portfolio_id to be assigned to Test Portfolio 1
        UPDATE public.properties 
        SET portfolio_id = test_portfolio_id
        WHERE owner_id = demo_landlord_id 
        AND portfolio_id IS NULL;

        -- Get count of updated properties
        GET DIAGNOSTICS var_count = ROW_COUNT;
        RAISE NOTICE 'Updated % existing properties to be assigned to Test Portfolio 1', var_count;
    ELSE
        RAISE NOTICE 'Demo landlord account not found, skipping property updates';
    END IF;
END $$;
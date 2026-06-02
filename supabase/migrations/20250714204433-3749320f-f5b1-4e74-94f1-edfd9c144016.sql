-- Create deleted_portfolios table for soft deletion with 30-day retention
CREATE TABLE public.deleted_portfolios (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  original_portfolio_id UUID NOT NULL,
  portfolio_data JSONB NOT NULL,
  related_data JSONB,
  deleted_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  deleted_by UUID REFERENCES public.profiles(id),
  restored_at TIMESTAMP WITH TIME ZONE,
  restored_by UUID REFERENCES public.profiles(id),
  purge_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + INTERVAL '30 days')
);

-- Enable RLS on deleted_portfolios
ALTER TABLE public.deleted_portfolios ENABLE ROW LEVEL SECURITY;

-- Create policies for deleted_portfolios
CREATE POLICY "Admins can manage deleted portfolios" ON public.deleted_portfolios
FOR ALL USING (is_admin(auth.uid()));

CREATE POLICY "Portfolio managers can view their deleted portfolios" ON public.deleted_portfolios
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM jsonb_to_record(deleted_portfolios.portfolio_data) p(manager_id UUID)
    WHERE p.manager_id = auth.uid()
  )
);

-- Soft delete function for portfolios
CREATE OR REPLACE FUNCTION public.soft_delete_portfolio(target_portfolio_id UUID, deleted_by_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
        'properties', (SELECT jsonb_agg(to_jsonb(pr.*)) FROM public.properties pr WHERE pr.portfolio_id = target_portfolio_id)
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

    -- Set properties in this portfolio to NULL portfolio_id (move to Everything)
    UPDATE public.properties 
    SET portfolio_id = NULL
    WHERE portfolio_id = target_portfolio_id;

    -- Delete the portfolio
    DELETE FROM public.portfolios WHERE id = target_portfolio_id;

    RETURN TRUE;
END;
$$;

-- Restore deleted portfolio function
CREATE OR REPLACE FUNCTION public.restore_deleted_portfolio(deleted_portfolio_record_id UUID, restored_by_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    deleted_record RECORD;
    new_portfolio_id UUID;
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

    -- Mark as restored in deleted_portfolios table
    UPDATE public.deleted_portfolios 
    SET restored_at = now(),
        restored_by = restored_by_user_id
    WHERE id = deleted_portfolio_record_id;

    RETURN TRUE;
END;
$$;

-- Function to purge old deleted portfolios
CREATE OR REPLACE FUNCTION public.purge_old_deleted_portfolios()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    purged_count INTEGER;
BEGIN
    -- Delete records older than purge_at date
    WITH purged AS (
        DELETE FROM public.deleted_portfolios 
        WHERE purge_at < now() 
        AND restored_at IS NULL
        RETURNING id
    )
    SELECT COUNT(*) INTO purged_count FROM purged;

    RETURN purged_count;
END;
$$;

-- Function to auto-create "Test Portfolio 1" for existing landlords
CREATE OR REPLACE FUNCTION public.create_test_portfolio_for_landlord(landlord_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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

    -- Create the test portfolio
    INSERT INTO public.portfolios (manager_id, client_name, client_email, client_phone)
    VALUES (
        landlord_id,
        'Test Portfolio 1',
        NULL,
        NULL
    ) RETURNING id INTO test_portfolio_id;

    -- Assign all existing properties without portfolio_id to this test portfolio
    UPDATE public.properties 
    SET portfolio_id = test_portfolio_id
    WHERE owner_id = landlord_id 
    AND portfolio_id IS NULL
    AND deleted_at IS NULL;

    RETURN test_portfolio_id;
END;
$$;
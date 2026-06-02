
-- Create function to award points (callable from edge functions)
CREATE OR REPLACE FUNCTION public.award_points(
    p_user_id UUID,
    p_event_type TEXT,
    p_points_change NUMERIC,
    p_notes TEXT DEFAULT NULL,
    p_related_entity_id UUID DEFAULT NULL,
    p_related_entity_type TEXT DEFAULT NULL,
    p_processed_by UUID DEFAULT NULL
)
RETURNS TABLE(success BOOLEAN, new_balance NUMERIC, points_awarded NUMERIC)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_balance NUMERIC := 0;
    v_new_balance NUMERIC;
    v_system_enabled BOOLEAN;
BEGIN
    -- Check if points system is enabled
    SELECT get_config_bool('points_system_enabled', true) INTO v_system_enabled;
    
    IF NOT v_system_enabled THEN
        RETURN QUERY SELECT false, 0::NUMERIC, 0::NUMERIC;
        RETURN;
    END IF;

    -- Check for duplicates to prevent double-awarding
    IF p_related_entity_id IS NOT NULL AND p_related_entity_type IS NOT NULL THEN
        IF EXISTS (
            SELECT 1 FROM public.points_history 
            WHERE user_id = p_user_id 
            AND event_type = p_event_type
            AND related_entity_id = p_related_entity_id
            AND related_entity_type = p_related_entity_type
        ) THEN
            -- Already awarded, return current balance
            SELECT COALESCE(points_balance_after, 0) INTO v_current_balance
            FROM public.points_history 
            WHERE user_id = p_user_id 
            ORDER BY timestamp DESC 
            LIMIT 1;
            
            RETURN QUERY SELECT false, v_current_balance, 0::NUMERIC;
            RETURN;
        END IF;
    END IF;

    -- Get current balance
    SELECT COALESCE(points_balance_after, 0) INTO v_current_balance
    FROM public.points_history 
    WHERE user_id = p_user_id 
    ORDER BY timestamp DESC 
    LIMIT 1;

    -- Calculate new balance
    v_new_balance := v_current_balance + p_points_change;

    -- Insert points history record
    INSERT INTO public.points_history (
        user_id,
        event_type,
        points_change,
        points_balance_after,
        notes,
        related_entity_id,
        related_entity_type,
        processed_by
    ) VALUES (
        p_user_id,
        p_event_type,
        p_points_change,
        v_new_balance,
        p_notes,
        p_related_entity_id,
        p_related_entity_type,
        p_processed_by
    );

    RETURN QUERY SELECT true, v_new_balance, p_points_change;
END;
$$;

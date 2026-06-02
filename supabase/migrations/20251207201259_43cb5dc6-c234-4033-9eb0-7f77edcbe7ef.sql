-- Create trigger function to award referral points when placement fee is paid
CREATE OR REPLACE FUNCTION handle_placement_fee_paid_referral()
RETURNS TRIGGER AS $$
DECLARE
  v_tenant_id UUID;
  v_referral_id UUID;
  v_referrer_id UUID;
  v_points_per_referral INTEGER;
BEGIN
  -- Only trigger when payment_status changes to 'paid'
  IF NEW.payment_status = 'paid' AND (OLD.payment_status IS NULL OR OLD.payment_status != 'paid') THEN
    
    -- Get tenant_id from the placement fee record
    v_tenant_id := NEW.tenant_id;
    
    -- Find if this tenant was referred and not already qualified
    SELECT id, referrer_id INTO v_referral_id, v_referrer_id
    FROM referrals
    WHERE referred_user_id = v_tenant_id
    AND status IN ('registered', 'approved', 'first_payment');
    
    IF v_referral_id IS NOT NULL THEN
      -- Get points value from system config
      SELECT config_value::integer INTO v_points_per_referral
      FROM system_config WHERE config_key = 'points_per_referral';
      
      -- Update referral to qualified
      UPDATE referrals
      SET status = 'qualified',
          sixty_day_milestone_at = NOW(),
          updated_at = NOW()
      WHERE id = v_referral_id;
      
      -- Award points to referrer
      PERFORM award_points(
        p_user_id := v_referrer_id,
        p_event_type := 'referral_completion',
        p_points_change := COALESCE(v_points_per_referral, 25000),
        p_notes := 'Referral completed - placement fee received from landlord',
        p_related_entity_id := v_referral_id,
        p_related_entity_type := 'referral'
      );
      
      -- Track event
      INSERT INTO referral_tracking_events (referral_id, event_type, metadata)
      VALUES (v_referral_id, 'placement_fee_paid', jsonb_build_object(
        'placement_fee_id', NEW.id,
        'amount', NEW.amount
      ));
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS on_placement_fee_paid_referral ON landlord_placement_fees;

-- Attach trigger to landlord_placement_fees
CREATE TRIGGER on_placement_fee_paid_referral
AFTER UPDATE ON landlord_placement_fees
FOR EACH ROW EXECUTE FUNCTION handle_placement_fee_paid_referral();
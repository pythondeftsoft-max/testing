-- Update the reset_weekly_application_quotas function to send notifications
CREATE OR REPLACE FUNCTION reset_weekly_application_quotas()
RETURNS INTEGER AS $$
DECLARE
  reset_count INTEGER := 0;
  tenant_record RECORD;
BEGIN
  -- Loop through all tenant users
  FOR tenant_record IN 
    SELECT id, full_name, email
    FROM profiles
    WHERE user_type = 'tenant'
  LOOP
    -- Reset their quota
    UPDATE profiles
    SET 
      weekly_applications_used = 0,
      weekly_quota_reset_at = now()
    WHERE id = tenant_record.id;
    
    -- Send notification to the tenant
    INSERT INTO notifications (
      user_id,
      title,
      description,
      type,
      category,
      link,
      event_type
    ) VALUES (
      tenant_record.id,
      '✨ Application Credits Refreshed!',
      'Your 5 free application credits have been refreshed for this week. Start applying to properties today!',
      'success',
      'Application',
      '/dashboard?tab=Properties',
      'application_credits_refreshed'
    );
    
    reset_count := reset_count + 1;
  END LOOP;

  RETURN reset_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
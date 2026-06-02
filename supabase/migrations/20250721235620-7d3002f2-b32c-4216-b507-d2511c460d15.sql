-- Phase 1: Complete remaining function security fixes

-- Fix remaining functions with search_path issues
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_tenant_request_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.properties 
    SET tenant_request_count = tenant_request_count + 1 
    WHERE id = NEW.property_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.properties 
    SET tenant_request_count = GREATEST(tenant_request_count - 1, 0) 
    WHERE id = OLD.property_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.reset_monthly_applications()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.tenant_profiles 
  SET applications_this_month = 0,
      last_application_reset = CURRENT_DATE
  WHERE last_application_reset < CURRENT_DATE - INTERVAL '1 month';
END;
$$;

CREATE OR REPLACE FUNCTION public.geocode_property_address(property_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  property_address text;
BEGIN
  -- Get full address for the property
  SELECT CONCAT_WS(', ', street_address, city, state, zipcode)
  INTO property_address
  FROM public.properties 
  WHERE id = property_id;
  
  -- Note: This function sets up the structure
  -- The actual geocoding will be handled by an edge function
  -- to avoid making external API calls directly from the database
  
  -- Log the geocoding request
  INSERT INTO public.notifications (user_id, title, description, type)
  SELECT 
    owner_id,
    'Property Geocoding',
    'Geocoding requested for property at: ' || property_address,
    'info'
  FROM public.properties 
  WHERE id = property_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.trigger_geocode_new_property()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Only trigger if address fields are present and coordinates are missing
  IF (NEW.street_address IS NOT NULL OR NEW.city IS NOT NULL) 
     AND (NEW.latitude IS NULL OR NEW.longitude IS NULL) THEN
    
    -- Call the geocoding function
    PERFORM public.geocode_property_address(NEW.id);
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_application_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- If an application is being approved
  IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
    -- Reject all other pending applications for this tenant
    UPDATE public.property_applications 
    SET status = 'rejected', 
        updated_at = now()
    WHERE tenant_id = NEW.tenant_id 
    AND id != NEW.id 
    AND status = 'pending';
    
    -- Update property status to occupied when application is approved
    UPDATE public.properties
    SET status = 'occupied',
        updated_at = now()
    WHERE id = NEW.property_id;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_tenant_request_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- When a tenant request is created, set property status to available
  IF TG_OP = 'INSERT' AND NEW.status = 'active' THEN
    UPDATE public.properties
    SET status = 'available',
        updated_at = now()
    WHERE id = NEW.property_id;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.moderate_message_content()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_flagged_words TEXT[] := ARRAY['spam', 'scam', 'urgent', 'money transfer', 'wire transfer', 'cash only'];
  v_word TEXT;
BEGIN
  -- Simple content moderation
  FOREACH v_word IN ARRAY v_flagged_words LOOP
    IF LOWER(NEW.message_text) LIKE '%' || v_word || '%' THEN
      NEW.is_flagged := TRUE;
      NEW.flagged_reason := 'Contains potentially suspicious content: ' || v_word;
      EXIT;
    END IF;
  END LOOP;
  
  -- Character limit check
  IF LENGTH(NEW.message_text) > 2000 THEN
    RAISE EXCEPTION 'Message too long. Maximum 2000 characters allowed.';
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_property_status_change_to_vacant()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Only process if status changed from 'available' to 'vacant'
  IF OLD.status = 'available' AND NEW.status = 'vacant' THEN
    
    -- Update all pending applications for this property to 'withdrawn'
    -- and return application credits to affected tenants
    UPDATE public.property_applications 
    SET status = 'withdrawn', 
        updated_at = now()
    WHERE property_id = NEW.id 
      AND status = 'pending';
    
    -- Return application credits to affected tenants
    UPDATE public.tenant_profiles 
    SET free_applications_remaining = free_applications_remaining + 1,
        updated_at = now()
    WHERE user_id IN (
      SELECT tenant_id 
      FROM public.property_applications 
      WHERE property_id = NEW.id 
        AND status = 'withdrawn'
        AND updated_at = now()
    );
    
    -- Deactivate any active tenant requests for this property
    UPDATE public.property_tenant_requests
    SET status = 'inactive',
        updated_at = now()
    WHERE property_id = NEW.id 
      AND status = 'active';
    
    -- Create notifications for affected tenants
    INSERT INTO public.notifications (user_id, title, description, type, link)
    SELECT 
      pa.tenant_id,
      'Application Credit Returned',
      'Your application credit has been returned because the property at ' || NEW.address || ' is no longer available. This is not a rejection - the property was withdrawn from the market. You can use your returned credit to apply for other properties.',
      'info',
      '/dashboard'
    FROM public.property_applications pa
    WHERE pa.property_id = NEW.id 
      AND pa.status = 'withdrawn'
      AND pa.updated_at = now();
    
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.validate_user_registration()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    -- Validate email format
    IF NEW.email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
        RAISE EXCEPTION 'Invalid email format: %', NEW.email;
    END IF;
    
    -- Prevent duplicate emails (case insensitive)
    IF EXISTS (
        SELECT 1 FROM auth.users 
        WHERE LOWER(email) = LOWER(NEW.email) 
        AND id != NEW.id
    ) THEN
        RAISE EXCEPTION 'Email already exists: %', NEW.email;
    END IF;
    
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Insert corresponding email queue entry
  INSERT INTO public.email_queue (user_id, subject, body, link)
  VALUES (
    NEW.user_id,
    NEW.title,
    CONCAT(NEW.description, ' - ', to_char(NEW.created_at, 'YYYY-MM-DD HH24:MI:SS')),
    COALESCE(NEW.link, '/messages?tab=notifications')
  );
  
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.soft_delete_user(target_user_id uuid, deleted_by_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    user_auth_data JSONB;
    user_profile_data JSONB;
    user_related_data JSONB;
BEGIN
    -- Check if the deleting user is an admin
    IF NOT public.is_admin(deleted_by_user_id) THEN
        RAISE EXCEPTION 'Only admins can delete users';
    END IF;

    -- Get user data from auth.users (only what we can access)
    SELECT to_jsonb(au.*) INTO user_auth_data
    FROM auth.users au 
    WHERE au.id = target_user_id;

    -- Get profile data
    SELECT to_jsonb(p.*) INTO user_profile_data
    FROM public.profiles p 
    WHERE p.id = target_user_id;

    -- Collect related data
    SELECT jsonb_build_object(
        'properties', (SELECT jsonb_agg(to_jsonb(pr.*)) FROM public.properties pr WHERE pr.owner_id = target_user_id),
        'property_applications', (SELECT jsonb_agg(to_jsonb(pa.*)) FROM public.property_applications pa WHERE pa.tenant_id = target_user_id),
        'tenant_profile', (SELECT to_jsonb(tp.*) FROM public.tenant_profiles tp WHERE tp.user_id = target_user_id),
        'maintenance_requests', (SELECT jsonb_agg(to_jsonb(mr.*)) FROM public.maintenance_requests mr WHERE mr.tenant_id = target_user_id),
        'messages', (SELECT jsonb_agg(to_jsonb(m.*)) FROM public.messages m WHERE m.sender_id = target_user_id),
        'notifications', (SELECT jsonb_agg(to_jsonb(n.*)) FROM public.notifications n WHERE n.user_id = target_user_id)
    ) INTO user_related_data;

    -- Store deleted user data
    INSERT INTO public.deleted_users (
        original_user_id,
        user_data,
        profile_data,
        related_data,
        deleted_by
    ) VALUES (
        target_user_id,
        user_auth_data,
        user_profile_data,
        user_related_data,
        deleted_by_user_id
    );

    -- Update profile status to deleted
    UPDATE public.profiles 
    SET status = 'deleted',
        deleted_at = now(),
        deleted_by = deleted_by_user_id
    WHERE id = target_user_id;

    -- Delete related data (cascade will handle most of this)
    DELETE FROM public.tenant_profiles WHERE user_id = target_user_id;
    DELETE FROM public.property_applications WHERE tenant_id = target_user_id;
    DELETE FROM public.maintenance_requests WHERE tenant_id = target_user_id;
    DELETE FROM public.messages WHERE sender_id = target_user_id;
    DELETE FROM public.notifications WHERE user_id = target_user_id;
    
    -- Properties will be handled separately if needed
    UPDATE public.properties SET status = 'deleted' WHERE owner_id = target_user_id;

    RETURN TRUE;
END;
$$;

-- Continue with more functions...
CREATE OR REPLACE FUNCTION public.restore_deleted_user(deleted_user_record_id uuid, restored_by_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    deleted_record RECORD;
BEGIN
    -- Check if the restoring user is an admin
    IF NOT public.is_admin(restored_by_user_id) THEN
        RAISE EXCEPTION 'Only admins can restore users';
    END IF;

    -- Get the deleted user record
    SELECT * INTO deleted_record 
    FROM public.deleted_users 
    WHERE id = deleted_user_record_id 
    AND restored_at IS NULL;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Deleted user record not found or already restored';
    END IF;

    -- Restore profile
    UPDATE public.profiles 
    SET status = 'active',
        deleted_at = NULL,
        deleted_by = NULL
    WHERE id = deleted_record.original_user_id;

    -- Mark as restored in deleted_users table
    UPDATE public.deleted_users 
    SET restored_at = now(),
        restored_by = restored_by_user_id
    WHERE id = deleted_user_record_id;

    -- Note: We don't automatically restore all related data as it might conflict
    -- with current state. This should be done manually if needed.

    RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION public.purge_old_deleted_users()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    purged_count INTEGER;
BEGIN
    -- Delete records older than purge_at date
    WITH purged AS (
        DELETE FROM public.deleted_users 
        WHERE purge_at < now() 
        AND restored_at IS NULL
        RETURNING id
    )
    SELECT COUNT(*) INTO purged_count FROM purged;

    RETURN purged_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.deactivate_user(target_user_id uuid, deactivated_by_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    -- Check if the deactivating user is an admin
    IF NOT public.is_admin(deactivated_by_user_id) THEN
        RAISE EXCEPTION 'Only admins can deactivate users';
    END IF;

    -- Update profile status
    UPDATE public.profiles 
    SET status = 'deactivated',
        deactivated_at = now()
    WHERE id = target_user_id;

    RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION public.reactivate_user(target_user_id uuid, reactivated_by_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    -- Check if the reactivating user is an admin
    IF NOT public.is_admin(reactivated_by_user_id) THEN
        RAISE EXCEPTION 'Only admins can reactivate users';
    END IF;

    -- Update profile status
    UPDATE public.profiles 
    SET status = 'active',
        deactivated_at = NULL
    WHERE id = target_user_id;

    RETURN TRUE;
END;
$$;
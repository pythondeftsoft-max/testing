
-- Make property application notification trigger unit-aware
CREATE OR REPLACE FUNCTION public.notify_property_application()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_property_id uuid;
  v_owner_id uuid;
BEGIN
  -- Resolve the real property id (may be unit-level)
  v_property_id := NEW.property_id;
  IF v_property_id IS NULL AND NEW.unit_id IS NOT NULL THEN
    SELECT property_id INTO v_property_id
    FROM public.property_units
    WHERE id = NEW.unit_id;
  END IF;

  IF v_property_id IS NOT NULL THEN
    SELECT owner_id INTO v_owner_id FROM public.properties WHERE id = v_property_id;
  END IF;

  IF TG_OP = 'INSERT' THEN
    -- Tenant notification (always safe — tenant_id is NOT NULL on the row)
    PERFORM public.send_notification(
      NEW.tenant_id,
      'Application Submitted',
      'Your application for the property has been successfully submitted and is under review.',
      'application_submitted',
      'medium',
      'Application',
      '/applications?id=' || NEW.id,
      'view_application',
      jsonb_build_object('application_id', NEW.id, 'property_id', v_property_id, 'unit_id', NEW.unit_id)
    );

    -- Landlord notification — only if we actually have an owner
    IF v_owner_id IS NOT NULL THEN
      PERFORM public.send_notification(
        v_owner_id,
        'New Application Received',
        'You have received a new application for your property. Review and respond promptly.',
        'application_received',
        'high',
        'Application',
        '/landlord-applications?id=' || NEW.id,
        'review_application',
        jsonb_build_object('application_id', NEW.id, 'property_id', v_property_id, 'unit_id', NEW.unit_id)
      );
    END IF;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    IF NEW.status = 'approved' THEN
      PERFORM public.send_notification(
        NEW.tenant_id,
        'Application Approved! 🎉',
        'Congratulations! Your application has been approved. Next steps will be shared shortly.',
        'application_approved',
        'high',
        'Application',
        '/applications?id=' || NEW.id,
        'view_approval',
        jsonb_build_object('application_id', NEW.id, 'property_id', v_property_id, 'unit_id', NEW.unit_id)
      );
    ELSIF NEW.status = 'rejected' THEN
      PERFORM public.send_notification(
        NEW.tenant_id,
        'Application Update',
        'Your application was not approved this time. Keep looking for other great properties!',
        'application_rejected',
        'medium',
        'Application',
        '/search',
        'browse_properties',
        jsonb_build_object('application_id', NEW.id)
      );
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Make weekly quota bypass aware of unit-level admin pushes
CREATE OR REPLACE FUNCTION public.enforce_weekly_application_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
declare
  v_window_start timestamptz;
  v_last_reset timestamptz;
  v_applications_count integer;
  v_is_subscriber boolean;
  v_has_admin_push boolean;
  v_weekly_limit integer := 5;
  v_adjust_total integer := 0;
  v_effective_limit integer;
begin
  select has_active_subscription(NEW.tenant_id, 'tenant') into v_is_subscriber;
  if v_is_subscriber then
    return NEW;
  end if;

  select exists(
    select 1 from public.property_pushes
    where tenant_id = NEW.tenant_id
      and (
        (NEW.property_id is not null and property_id = NEW.property_id)
        or (NEW.unit_id is not null and unit_id = NEW.unit_id)
      )
      and quota_bypass = true
      and now() <= expires_at
  ) into v_has_admin_push;

  if v_has_admin_push then
    return NEW;
  end if;

  select reset_at into v_last_reset
  from public.application_quota_resets
  where tenant_id = NEW.tenant_id
  order by reset_at desc
  limit 1;

  v_window_start := greatest(
    now() - interval '7 days',
    coalesce(v_last_reset, '1970-01-01'::timestamptz)
  );

  select count(*) into v_applications_count
  from public.property_applications
  where tenant_id = NEW.tenant_id
    and created_at >= v_window_start;

  select coalesce(sum(delta), 0) into v_adjust_total
  from public.application_quota_adjustments
  where tenant_id = NEW.tenant_id
    and now() <= expires_at;

  v_effective_limit := v_weekly_limit + v_adjust_total;

  if v_applications_count >= v_effective_limit then
    raise exception 'Weekly application limit of % reached. You can apply to % more properties this week.',
      v_effective_limit, greatest(0, v_effective_limit - v_applications_count);
  end if;

  return NEW;
end;
$$;

DROP FUNCTION IF EXISTS public.check_property_limit_with_notifications(uuid);
DROP FUNCTION IF EXISTS public.check_portfolio_property_limit_with_notifications(text, text);

CREATE FUNCTION public.check_property_limit_with_notifications(landlord_id uuid)
RETURNS TABLE(current_count integer, free_limit integer, billable_units_count integer, has_subscription boolean, needs_sub boolean, notification_sent_result boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _current_count INT;
  _free_limit INT := 10;
  _has_subscription BOOLEAN;
  _needs_sub BOOLEAN;
  subscription_link TEXT := '/landlord-hap';
  _billable_units_count INT;
  _notification_sent_result BOOLEAN := false;
BEGIN
  SELECT COUNT(*) INTO _current_count FROM public.properties WHERE owner_id = landlord_id AND deleted_at IS NULL;
  SELECT EXISTS (SELECT 1 FROM public.subscriptions WHERE user_id = landlord_id AND status IN ('active', 'trialing') AND role = 'landlord') INTO _has_subscription;
  _billable_units_count := GREATEST(0, _current_count - _free_limit);
  _needs_sub := _current_count > _free_limit AND NOT _has_subscription;
  IF NOT _has_subscription THEN
    IF _current_count = _free_limit THEN
      INSERT INTO public.property_limit_notifications (user_id, notification_type, property_count) VALUES (landlord_id, 'at_limit', _current_count) ON CONFLICT (user_id, notification_type, property_count) DO NOTHING;
      IF FOUND THEN INSERT INTO public.notifications (user_id, title, description, type, link) VALUES (landlord_id, 'Free Tier Limit Reached!', 'You''ve reached your free tier limit of ' || _free_limit || ' properties.', 'property_limit_warning', subscription_link); _notification_sent_result := true; END IF;
    END IF;
    IF _current_count = 8 THEN
      INSERT INTO public.property_limit_notifications (user_id, notification_type, property_count) VALUES (landlord_id, 'approaching_limit', _current_count) ON CONFLICT (user_id, notification_type, property_count) DO NOTHING;
      IF FOUND THEN INSERT INTO public.notifications (user_id, title, description, type, link) VALUES (landlord_id, 'Approaching Property Limit', 'You have ' || (_free_limit - _current_count) || ' properties remaining.', 'property_limit_info', subscription_link); _notification_sent_result := true; END IF;
    END IF;
    IF _current_count > _free_limit THEN
      INSERT INTO public.property_limit_notifications (user_id, notification_type, property_count) VALUES (landlord_id, 'over_limit', _current_count) ON CONFLICT (user_id, notification_type, property_count) DO NOTHING;
      IF FOUND THEN INSERT INTO public.notifications (user_id, title, description, type, link) VALUES (landlord_id, 'Subscription Required', 'You have ' || _current_count || ' properties, exceeding limit of ' || _free_limit || '.', 'property_limit_error', subscription_link); _notification_sent_result := true; END IF;
    END IF;
  END IF;
  RETURN QUERY SELECT _current_count, _free_limit, _billable_units_count, _has_subscription, _needs_sub, _notification_sent_result;
END;
$$;

CREATE FUNCTION public.check_portfolio_property_limit_with_notifications(landlord_id text, portfolio_id_param text)
RETURNS TABLE(current_count integer, free_limit integer, billable_units_count integer, has_subscription boolean, needs_sub boolean, notification_sent_result boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _current_count INT;
  _free_limit INT := 10;
  _has_subscription BOOLEAN;
  _needs_sub BOOLEAN;
  subscription_link TEXT := '/landlord-hap';
  _billable_units_count INT;
  _notification_sent_result BOOLEAN := false;
  landlord_uuid UUID;
BEGIN
  landlord_uuid := landlord_id::UUID;
  SELECT COUNT(*) INTO _current_count FROM public.properties p WHERE p.owner_id = landlord_uuid AND p.deleted_at IS NULL AND p.portfolio_id::text = portfolio_id_param;
  SELECT EXISTS (SELECT 1 FROM public.subscriptions WHERE user_id = landlord_uuid AND status IN ('active', 'trialing') AND role = 'landlord') INTO _has_subscription;
  _billable_units_count := GREATEST(0, _current_count - _free_limit);
  _needs_sub := _current_count > _free_limit AND NOT _has_subscription;
  IF NOT _has_subscription THEN
    IF _current_count = _free_limit THEN
      INSERT INTO public.property_limit_notifications (user_id, notification_type, property_count, portfolio_id) VALUES (landlord_uuid, 'at_limit', _current_count, portfolio_id_param::UUID) ON CONFLICT (user_id, notification_type, property_count) DO NOTHING;
      IF FOUND THEN INSERT INTO public.notifications (user_id, title, description, type, link) VALUES (landlord_uuid, 'Free Tier Limit Reached!', 'You''ve reached your free tier limit of ' || _free_limit || ' properties in this portfolio.', 'property_limit_warning', subscription_link); _notification_sent_result := true; END IF;
    END IF;
    IF _current_count = 8 THEN
      INSERT INTO public.property_limit_notifications (user_id, notification_type, property_count, portfolio_id) VALUES (landlord_uuid, 'approaching_limit', _current_count, portfolio_id_param::UUID) ON CONFLICT (user_id, notification_type, property_count) DO NOTHING;
      IF FOUND THEN INSERT INTO public.notifications (user_id, title, description, type, link) VALUES (landlord_uuid, 'Approaching Property Limit', 'You have ' || (_free_limit - _current_count) || ' properties remaining in this portfolio.', 'property_limit_info', subscription_link); _notification_sent_result := true; END IF;
    END IF;
    IF _current_count > _free_limit THEN
      INSERT INTO public.property_limit_notifications (user_id, notification_type, property_count, portfolio_id) VALUES (landlord_uuid, 'over_limit', _current_count, portfolio_id_param::UUID) ON CONFLICT (user_id, notification_type, property_count) DO NOTHING;
      IF FOUND THEN INSERT INTO public.notifications (user_id, title, description, type, link) VALUES (landlord_uuid, 'Subscription Required', 'You have ' || _current_count || ' properties in this portfolio, exceeding limit of ' || _free_limit || '.', 'property_limit_error', subscription_link); _notification_sent_result := true; END IF;
    END IF;
  END IF;
  RETURN QUERY SELECT _current_count, _free_limit, _billable_units_count, _has_subscription, _needs_sub, _notification_sent_result;
END;
$$;
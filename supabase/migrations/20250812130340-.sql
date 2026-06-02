-- Remove unwanted geocoding notifications
DELETE FROM public.notifications 
WHERE title = 'Property Geocoding' 
AND description LIKE 'Geocoding requested for property at:%';

-- Create notification preferences table
CREATE TABLE public.notification_preferences (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  notification_type text NOT NULL,
  email_enabled boolean NOT NULL DEFAULT true,
  in_app_enabled boolean NOT NULL DEFAULT true,
  digest_mode boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, notification_type)
);

-- Enable RLS
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

-- Create policies for notification preferences
CREATE POLICY "Users can manage their own notification preferences" 
ON public.notification_preferences 
FOR ALL 
USING (user_id = auth.uid());

-- Add priority and category to notifications table
ALTER TABLE public.notifications 
ADD COLUMN priority text DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
ADD COLUMN category text DEFAULT 'general',
ADD COLUMN action_type text,
ADD COLUMN action_data jsonb DEFAULT '{}',
ADD COLUMN expires_at timestamp with time zone,
ADD COLUMN related_entity_type text,
ADD COLUMN related_entity_id uuid;

-- Create function to send user-friendly notifications
CREATE OR REPLACE FUNCTION public.send_notification(
  p_user_id uuid,
  p_title text,
  p_description text,
  p_type text DEFAULT 'info',
  p_priority text DEFAULT 'medium',
  p_category text DEFAULT 'general',
  p_link text DEFAULT NULL,
  p_action_type text DEFAULT NULL,
  p_action_data jsonb DEFAULT '{}',
  p_related_entity_type text DEFAULT NULL,
  p_related_entity_id uuid DEFAULT NULL,
  p_expires_hours integer DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  notification_id uuid;
  expires_timestamp timestamp with time zone;
BEGIN
  -- Calculate expiration if provided
  IF p_expires_hours IS NOT NULL THEN
    expires_timestamp := NOW() + (p_expires_hours || ' hours')::interval;
  END IF;

  -- Insert notification
  INSERT INTO public.notifications (
    user_id,
    title,
    description,
    type,
    priority,
    category,
    link,
    action_type,
    action_data,
    related_entity_type,
    related_entity_id,
    expires_at,
    read
  ) VALUES (
    p_user_id,
    p_title,
    p_description,
    p_type,
    p_priority,
    p_category,
    p_link,
    p_action_type,
    p_action_data,
    p_related_entity_type,
    p_related_entity_id,
    expires_timestamp,
    false
  ) RETURNING id INTO notification_id;

  RETURN notification_id;
END;
$$;

-- Create function to notify on property application
CREATE OR REPLACE FUNCTION notify_property_application()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Notify tenant when application is submitted
  IF TG_OP = 'INSERT' THEN
    PERFORM send_notification(
      NEW.tenant_id,
      'Application Submitted',
      'Your application for the property has been successfully submitted and is under review.',
      'application_submitted',
      'medium',
      'Application',
      '/applications?id=' || NEW.id,
      'view_application',
      jsonb_build_object('application_id', NEW.id, 'property_id', NEW.property_id)
    );
    
    -- Notify landlord about new application
    PERFORM send_notification(
      (SELECT owner_id FROM properties WHERE id = NEW.property_id),
      'New Application Received',
      'You have received a new application for your property. Review and respond promptly.',
      'application_received',
      'high',
      'Application',
      '/landlord-applications?id=' || NEW.id,
      'review_application',
      jsonb_build_object('application_id', NEW.id, 'property_id', NEW.property_id)
    );
  END IF;

  -- Notify tenant when application status changes
  IF TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN
    IF NEW.status = 'approved' THEN
      PERFORM send_notification(
        NEW.tenant_id,
        'Application Approved! 🎉',
        'Congratulations! Your application has been approved. Next steps will be shared shortly.',
        'application_approved',
        'high',
        'Application',
        '/applications?id=' || NEW.id,
        'view_approval',
        jsonb_build_object('application_id', NEW.id, 'property_id', NEW.property_id)
      );
    ELSIF NEW.status = 'rejected' THEN
      PERFORM send_notification(
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

-- Create trigger for property applications
DROP TRIGGER IF EXISTS property_application_notification_trigger ON public.property_applications;
CREATE TRIGGER property_application_notification_trigger
  AFTER INSERT OR UPDATE ON public.property_applications
  FOR EACH ROW
  EXECUTE FUNCTION notify_property_application();

-- Create function to notify on rent payments
CREATE OR REPLACE FUNCTION notify_rent_payment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Notify on payment received
  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.status != 'completed' AND NEW.status = 'completed') THEN
    -- Notify tenant
    PERFORM send_notification(
      NEW.tenant_id,
      'Payment Confirmed ✅',
      'Your rent payment of $' || NEW.amount || ' has been successfully processed.',
      'payment_confirmed',
      'medium',
      'Payment',
      '/rent-payments',
      'view_payments',
      jsonb_build_object('payment_id', NEW.id, 'amount', NEW.amount)
    );
    
    -- Notify landlord
    PERFORM send_notification(
      (SELECT owner_id FROM properties WHERE id = NEW.property_id),
      'Payment Received 💰',
      'Rent payment of $' || NEW.amount || ' received for ' || (SELECT address FROM properties WHERE id = NEW.property_id) || '.',
      'payment_received',
      'medium',
      'Payment',
      '/dashboard?property=' || NEW.property_id,
      'view_property',
      jsonb_build_object('payment_id', NEW.id, 'amount', NEW.amount, 'property_id', NEW.property_id)
    );
  END IF;

  -- Notify on late payment
  IF TG_OP = 'UPDATE' AND OLD.days_late = 0 AND NEW.days_late > 0 THEN
    PERFORM send_notification(
      NEW.tenant_id,
      'Payment Overdue ⚠️',
      'Your rent payment is now ' || NEW.days_late || ' days late. Please submit payment to avoid late fees.',
      'payment_overdue',
      'urgent',
      'Payment',
      '/rent-payments',
      'pay_rent',
      jsonb_build_object('payment_id', NEW.id, 'days_late', NEW.days_late),
      'rent_payment',
      NEW.id,
      72 -- Expires in 3 days
    );
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create trigger for rent payments
DROP TRIGGER IF EXISTS rent_payment_notification_trigger ON public.rent_payments;
CREATE TRIGGER rent_payment_notification_trigger
  AFTER INSERT OR UPDATE ON public.rent_payments
  FOR EACH ROW
  EXECUTE FUNCTION notify_rent_payment();

-- Create function to notify on maintenance requests
CREATE OR REPLACE FUNCTION notify_maintenance_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Notify on new maintenance request
  IF TG_OP = 'INSERT' THEN
    -- Notify landlord
    PERFORM send_notification(
      (SELECT owner_id FROM properties WHERE id = NEW.property_id),
      'New Maintenance Request',
      NEW.description || ' Priority: ' || NEW.priority || '.',
      'maintenance_request_received',
      CASE WHEN NEW.priority = 'emergency' THEN 'urgent' ELSE 'high' END,
      'Maintenance',
      '/maintenance?id=' || NEW.id,
      'review_maintenance',
      jsonb_build_object('request_id', NEW.id, 'priority', NEW.priority)
    );
    
    -- Notify tenant of submission
    PERFORM send_notification(
      NEW.tenant_id,
      'Maintenance Request Submitted',
      'Your maintenance request has been submitted. You will be notified of any updates.',
      'maintenance_request_submitted',
      'medium',
      'Maintenance',
      '/maintenance-requests?id=' || NEW.id,
      'view_request',
      jsonb_build_object('request_id', NEW.id)
    );
  END IF;

  -- Notify on status changes
  IF TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN
    IF NEW.status = 'completed' THEN
      PERFORM send_notification(
        NEW.tenant_id,
        'Maintenance Completed ✅',
        'Your maintenance request has been completed. Please review the work done.',
        'maintenance_completed',
        'medium',
        'Maintenance',
        '/maintenance-requests?id=' || NEW.id,
        'review_work',
        jsonb_build_object('request_id', NEW.id)
      );
    ELSIF NEW.status = 'in_progress' THEN
      PERFORM send_notification(
        NEW.tenant_id,
        'Maintenance In Progress 🔧',
        'Work has started on your maintenance request. Estimated completion: ' || COALESCE(NEW.estimated_completion_date::text, 'TBD') || '.',
        'maintenance_in_progress',
        'medium',
        'Maintenance',
        '/maintenance-requests?id=' || NEW.id,
        'view_progress',
        jsonb_build_object('request_id', NEW.id)
      );
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;
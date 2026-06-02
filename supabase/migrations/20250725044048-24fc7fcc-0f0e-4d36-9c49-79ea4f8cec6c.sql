-- Add tax management permission objects
INSERT INTO public.permission_objects (name, display_name, category) VALUES
('w9_management', 'W-9 Form Management', 'Tax Management'),
('1099_generation', '1099 Form Generation', 'Tax Management'),
('tax_reporting', 'Tax Reporting & Analytics', 'Tax Management'),
('tax_threshold_config', 'Tax Threshold Configuration', 'Tax Management');

-- Add role permissions for tax management
-- Admin Partners get full access
INSERT INTO public.role_permissions (role_name, permission_object_id, can_view, can_edit, can_delete, can_create)
SELECT 'admin_partner', po.id, true, true, true, true
FROM public.permission_objects po
WHERE po.category = 'Tax Management';

-- Editors get limited access (no delete, limited create)
INSERT INTO public.role_permissions (role_name, permission_object_id, can_view, can_edit, can_delete, can_create)
SELECT 'editor', po.id, true, 
  CASE 
    WHEN po.name = 'tax_threshold_config' THEN false
    ELSE true 
  END, 
  false, 
  CASE 
    WHEN po.name IN ('w9_management', '1099_generation') THEN true
    ELSE false 
  END
FROM public.permission_objects po
WHERE po.category = 'Tax Management';

-- Support assistants get read-only access
INSERT INTO public.role_permissions (role_name, permission_object_id, can_view, can_edit, can_delete, can_create)
SELECT 'support_assistant', po.id, true, false, false, false
FROM public.permission_objects po
WHERE po.category = 'Tax Management';

-- Create function to check tax management access
CREATE OR REPLACE FUNCTION public.has_tax_management_access(user_id_param uuid, action_param text)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $function$
DECLARE
  user_role TEXT;
  has_permission BOOLEAN := false;
BEGIN
  -- Get user's highest account role
  SELECT get_highest_account_role(user_id_param)::TEXT INTO user_role;
  
  IF user_role IS NULL THEN
    RETURN false;
  END IF;
  
  -- Check permission based on action for tax management
  SELECT 
    CASE action_param
      WHEN 'view' THEN rp.can_view
      WHEN 'edit' THEN rp.can_edit
      WHEN 'delete' THEN rp.can_delete
      WHEN 'create' THEN rp.can_create
      ELSE false
    END INTO has_permission
  FROM public.role_permissions rp
  JOIN public.permission_objects po ON rp.permission_object_id = po.id
  WHERE rp.role_name = user_role
    AND po.name = 'tax_reporting'  -- Use tax_reporting as the general tax access permission
    AND po.is_active = true;
  
  RETURN COALESCE(has_permission, false);
END;
$function$;

-- Add tax form status tracking
ALTER TABLE public.tax_forms_1099 
ADD COLUMN IF NOT EXISTS status text DEFAULT 'draft',
ADD COLUMN IF NOT EXISTS filed_date date,
ADD COLUMN IF NOT EXISTS correction_sequence integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS irs_confirmation_number text,
ADD COLUMN IF NOT EXISTS recipient_notified_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS created_by uuid,
ADD COLUMN IF NOT EXISTS approved_by uuid,
ADD COLUMN IF NOT EXISTS approved_at timestamp with time zone;

-- Add W-9 expiration tracking
ALTER TABLE public.tax_profiles 
ADD COLUMN IF NOT EXISTS w9_expires_at date,
ADD COLUMN IF NOT EXISTS w9_reminder_sent_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS verification_status text DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS verified_by uuid,
ADD COLUMN IF NOT EXISTS verified_at timestamp with time zone;

-- Create function to auto-track transactions above threshold
CREATE OR REPLACE FUNCTION public.check_tax_transaction_threshold()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  threshold_amount numeric;
  tax_year integer;
BEGIN
  -- Get the tax year and threshold
  tax_year := EXTRACT(YEAR FROM NEW.payment_date);
  
  SELECT threshold_amount INTO threshold_amount
  FROM public.tax_thresholds
  WHERE tax_year = EXTRACT(YEAR FROM NEW.payment_date)
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- If no threshold found, use default IRS threshold of $600
  IF threshold_amount IS NULL THEN
    threshold_amount := 600.00;
  END IF;
  
  -- If payment meets threshold, ensure tax tracking exists
  IF NEW.amount >= threshold_amount THEN
    INSERT INTO public.tax_transactions (
      property_id,
      tenant_id,
      transaction_date,
      transaction_type,
      amount,
      description,
      tax_year,
      form_type,
      created_at
    ) VALUES (
      NEW.property_id,
      (SELECT tenant_id FROM property_applications 
       WHERE property_id = NEW.property_id AND status = 'approved' LIMIT 1),
      NEW.payment_date,
      'rent_payment',
      NEW.amount,
      'Rent payment - auto-tracked',
      tax_year,
      '1099-MISC',
      now()
    )
    ON CONFLICT (property_id, tenant_id, transaction_date, transaction_type, amount) 
    DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Create trigger to auto-track rent payments
DROP TRIGGER IF EXISTS trigger_check_tax_threshold ON public.rent_payments;
CREATE TRIGGER trigger_check_tax_threshold
  AFTER INSERT OR UPDATE ON public.rent_payments
  FOR EACH ROW
  EXECUTE FUNCTION public.check_tax_transaction_threshold();

-- Update RLS policies for tax tables to include portfolio access
DROP POLICY IF EXISTS "Portfolio members can manage tax profiles" ON public.tax_profiles;
CREATE POLICY "Portfolio members can manage tax profiles"
ON public.tax_profiles
FOR ALL
TO authenticated
USING (
  -- User is the profile owner OR has portfolio access
  user_id = auth.uid() OR
  (portfolio_id IS NOT NULL AND has_portfolio_role(portfolio_id, auth.uid(), ARRAY['admin_partner'::portfolio_role_type, 'editor'::portfolio_role_type]))
);

DROP POLICY IF EXISTS "Portfolio members can manage tax transactions" ON public.tax_transactions;
CREATE POLICY "Portfolio members can manage tax transactions"
ON public.tax_transactions
FOR ALL
TO authenticated
USING (
  -- User has property access OR portfolio access
  EXISTS (
    SELECT 1 FROM properties p 
    WHERE p.id = tax_transactions.property_id 
    AND (p.owner_id = auth.uid() OR 
         (p.portfolio_id IS NOT NULL AND has_portfolio_role(p.portfolio_id, auth.uid(), ARRAY['admin_partner'::portfolio_role_type, 'editor'::portfolio_role_type, 'viewer'::portfolio_role_type])))
  )
);

DROP POLICY IF EXISTS "Portfolio members can manage 1099 forms" ON public.tax_forms_1099;
CREATE POLICY "Portfolio members can manage 1099 forms"
ON public.tax_forms_1099
FOR ALL
TO authenticated
USING (
  -- User has property access OR portfolio access
  EXISTS (
    SELECT 1 FROM properties p 
    WHERE p.id = tax_forms_1099.property_id 
    AND (p.owner_id = auth.uid() OR 
         (p.portfolio_id IS NOT NULL AND has_portfolio_role(p.portfolio_id, auth.uid(), ARRAY['admin_partner'::portfolio_role_type, 'editor'::portfolio_role_type, 'viewer'::portfolio_role_type])))
  )
);
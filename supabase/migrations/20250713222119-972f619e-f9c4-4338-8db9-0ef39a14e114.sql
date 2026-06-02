-- Fix RLS policies for lease_renewals to allow tenants to create renewal requests
DROP POLICY IF EXISTS "Tenants can view their lease renewals" ON public.lease_renewals;
DROP POLICY IF EXISTS "Property owners can manage lease renewals" ON public.lease_renewals;

-- Allow tenants to create lease renewal requests for their properties
CREATE POLICY "Tenants can create lease renewal requests" 
ON public.lease_renewals 
FOR INSERT 
WITH CHECK (
  tenant_id = auth.uid() 
  AND EXISTS (
    SELECT 1 
    FROM property_applications pa 
    WHERE pa.property_id = lease_renewals.property_id 
      AND pa.tenant_id = auth.uid() 
      AND pa.status = 'approved'
  )
);

-- Allow tenants to view their own lease renewals
CREATE POLICY "Tenants can view their lease renewals" 
ON public.lease_renewals 
FOR SELECT 
USING (tenant_id = auth.uid());

-- Allow property owners to manage lease renewals for their properties
CREATE POLICY "Property owners can manage lease renewals" 
ON public.lease_renewals 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 
    FROM properties 
    WHERE properties.id = lease_renewals.property_id 
      AND properties.owner_id = auth.uid()
  )
);

-- Create function to handle lease renewal notifications
CREATE OR REPLACE FUNCTION public.notify_landlord_of_renewal_request()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert notification for landlord when tenant requests renewal
  INSERT INTO public.notifications (
    user_id, 
    title, 
    description, 
    type, 
    link,
    metadata
  )
  SELECT 
    p.owner_id,
    'Lease Renewal Request',
    'Tenant has requested lease renewal for property at ' || p.address,
    'info',
    '/landlord-dashboard?tab=renewals',
    jsonb_build_object(
      'lease_renewal_id', NEW.id,
      'property_id', NEW.property_id,
      'tenant_id', NEW.tenant_id
    )
  FROM properties p
  WHERE p.id = NEW.property_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for lease renewal requests
DROP TRIGGER IF EXISTS trigger_lease_renewal_notification ON public.lease_renewals;
CREATE TRIGGER trigger_lease_renewal_notification
  AFTER INSERT ON public.lease_renewals
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_landlord_of_renewal_request();
-- Clean up duplicate property records and fix data inconsistency
-- First, let's identify which property record to keep (the one with the demo landlord account that works)
-- Remove the duplicate Cicero property record that's causing confusion

-- Delete the property record with the problematic owner
DELETE FROM properties 
WHERE address = '567 Community Way, Cicero, IL 60804' 
AND owner_id = 'b7843bb0-64bd-4ff3-9392-b73c111832ce';

-- Update any orphaned property applications to point to the correct property
UPDATE property_applications 
SET property_id = (
    SELECT id FROM properties 
    WHERE address = '567 Community Way, Cicero, IL 60804' 
    AND owner_id = 'ccb8536c-80d1-4834-9614-169b9a7caede'
    LIMIT 1
)
WHERE property_id NOT IN (SELECT id FROM properties);

-- Clean up any orphaned rent payments
DELETE FROM rent_payments 
WHERE property_id NOT IN (SELECT id FROM properties);

-- Ensure tenant has approved application for the correct property
UPDATE property_applications 
SET status = 'approved'
WHERE tenant_id = '03e26106-4179-4b55-bd38-66c5414e8ba2'
AND property_id = (
    SELECT id FROM properties 
    WHERE address = '567 Community Way, Cicero, IL 60804' 
    AND owner_id = 'ccb8536c-80d1-4834-9614-169b9a7caede'
);

-- Add webhook event logging table for debugging subscription issues
CREATE TABLE IF NOT EXISTS public.webhook_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    webhook_type TEXT NOT NULL,
    event_type TEXT NOT NULL,
    event_data JSONB NOT NULL,
    processed BOOLEAN DEFAULT false,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    processed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS for webhook_events
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;

-- Only admins can view webhook events
CREATE POLICY "Admins can view webhook events" ON public.webhook_events
FOR SELECT USING (is_admin(auth.uid()));

-- System can insert webhook events
CREATE POLICY "System can insert webhook events" ON public.webhook_events
FOR INSERT WITH CHECK (true);

-- System can update webhook events
CREATE POLICY "System can update webhook events" ON public.webhook_events
FOR UPDATE USING (true);
-- Add user_id column to subscription_autopay_schedules and make subscription_id nullable
ALTER TABLE public.subscription_autopay_schedules 
ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Make subscription_id nullable
ALTER TABLE public.subscription_autopay_schedules 
ALTER COLUMN subscription_id DROP NOT NULL;

-- Add a check constraint to ensure either subscription_id or user_id is provided
ALTER TABLE public.subscription_autopay_schedules 
ADD CONSTRAINT check_subscription_or_user 
CHECK (subscription_id IS NOT NULL OR user_id IS NOT NULL);

-- Create index for better performance on user_id lookups
CREATE INDEX idx_subscription_autopay_user_id ON public.subscription_autopay_schedules(user_id);

-- Update RLS policies to allow access based on user_id as well
DROP POLICY IF EXISTS "Users can manage their subscription autopay schedules" ON public.subscription_autopay_schedules;

CREATE POLICY "Users can manage their subscription autopay schedules" 
ON public.subscription_autopay_schedules
FOR ALL
USING (
  user_id = auth.uid() OR 
  (subscription_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM subscriptions 
    WHERE subscriptions.id = subscription_autopay_schedules.subscription_id 
    AND subscriptions.user_id = auth.uid()
  ))
);
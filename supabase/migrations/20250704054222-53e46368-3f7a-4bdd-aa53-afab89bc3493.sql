
-- Create a table for newsletter subscriptions
CREATE TABLE public.newsletter_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  subscribed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT true,
  source TEXT DEFAULT 'website',
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add Row Level Security (RLS) to the newsletter subscriptions table
ALTER TABLE public.newsletter_subscriptions ENABLE ROW LEVEL SECURITY;

-- Create policy that allows anyone to subscribe (INSERT)
CREATE POLICY "Anyone can subscribe to newsletter" 
  ON public.newsletter_subscriptions 
  FOR INSERT 
  WITH CHECK (true);

-- Create policy that only admins can view all subscriptions
CREATE POLICY "Admins can view all newsletter subscriptions" 
  ON public.newsletter_subscriptions 
  FOR SELECT 
  USING (is_admin(auth.uid()));

-- Create policy that allows system updates
CREATE POLICY "System can update newsletter subscriptions" 
  ON public.newsletter_subscriptions 
  FOR UPDATE 
  USING (true);

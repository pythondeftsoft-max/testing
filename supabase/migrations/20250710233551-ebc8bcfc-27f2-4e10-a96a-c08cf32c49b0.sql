-- Add Stripe-related columns to rent_payments table
ALTER TABLE public.rent_payments 
ADD COLUMN stripe_payment_intent_id TEXT,
ADD COLUMN stripe_session_id TEXT,
ADD COLUMN payment_status TEXT DEFAULT 'pending';

-- Add Stripe customer ID to profiles table
ALTER TABLE public.profiles 
ADD COLUMN stripe_customer_id TEXT;

-- Create payment status enum constraint
ALTER TABLE public.rent_payments 
ADD CONSTRAINT payment_status_check 
CHECK (payment_status IN ('pending', 'processing', 'succeeded', 'failed', 'canceled'));

-- Create indexes for better performance
CREATE INDEX idx_rent_payments_stripe_intent ON public.rent_payments(stripe_payment_intent_id);
CREATE INDEX idx_rent_payments_status ON public.rent_payments(payment_status);
CREATE INDEX idx_profiles_stripe_customer ON public.profiles(stripe_customer_id);
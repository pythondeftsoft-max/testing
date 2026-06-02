-- Add stripe_connect_account_id to property_payment_settings table
ALTER TABLE public.property_payment_settings 
ADD COLUMN stripe_connect_account_id UUID REFERENCES public.stripe_connect_accounts(id);
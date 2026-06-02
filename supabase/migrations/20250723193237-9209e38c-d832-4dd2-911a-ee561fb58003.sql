-- Add missing notes column to account_invitations table if it doesn't exist
ALTER TABLE public.account_invitations 
ADD COLUMN IF NOT EXISTS notes text;
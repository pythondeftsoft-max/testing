
-- Add missing email column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS email text;

-- Add missing notes column to account_roles table  
ALTER TABLE public.account_roles
ADD COLUMN IF NOT EXISTS notes text;

-- Add support_assistant to the account_role_type enum
DO $$ 
BEGIN
    -- Add support_assistant to the enum if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'support_assistant' 
        AND enumtypid = (
            SELECT oid FROM pg_type WHERE typname = 'account_role_type'
        )
    ) THEN
        ALTER TYPE account_role_type ADD VALUE 'support_assistant';
    END IF;
END $$;

-- Populate email column in profiles from auth.users
UPDATE public.profiles 
SET email = auth_users.email
FROM auth.users auth_users
WHERE profiles.id = auth_users.id 
AND profiles.email IS NULL;

-- Create trigger to automatically populate email for new users
CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  -- Get email from auth.users and populate it
  UPDATE public.profiles 
  SET email = (SELECT email FROM auth.users WHERE id = NEW.id)
  WHERE id = NEW.id;
  
  RETURN NEW;
END;
$$;

-- Create trigger that fires after profile creation
DROP TRIGGER IF EXISTS on_profile_created ON public.profiles;
CREATE TRIGGER on_profile_created
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_profile();

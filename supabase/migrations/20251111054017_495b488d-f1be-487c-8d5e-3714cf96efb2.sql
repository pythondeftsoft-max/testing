-- Allow NULL actor_user_id for system-level operations in RBAC logs
-- This fixes user deletion errors where auth system logs deletions without a specific actor

-- Step 1: Drop the existing foreign key constraint first
ALTER TABLE public.rbac_change_logs 
DROP CONSTRAINT IF EXISTS rbac_change_logs_actor_user_id_fkey;

-- Step 2: Make the column nullable BEFORE updating values
ALTER TABLE public.rbac_change_logs 
ALTER COLUMN actor_user_id DROP NOT NULL;

-- Step 3: Now set orphaned actor_user_id values to NULL (where the user no longer exists)
UPDATE public.rbac_change_logs 
SET actor_user_id = NULL
WHERE actor_user_id IS NOT NULL 
  AND NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = rbac_change_logs.actor_user_id
  );

-- Step 4: Recreate the foreign key constraint with SET NULL on delete
ALTER TABLE public.rbac_change_logs 
ADD CONSTRAINT rbac_change_logs_actor_user_id_fkey 
FOREIGN KEY (actor_user_id) 
REFERENCES public.profiles(id) 
ON DELETE SET NULL;

-- Add explanatory comment
COMMENT ON COLUMN public.rbac_change_logs.actor_user_id IS 
'User who performed the action. NULL for system-level operations (e.g., admin service role deletions) or when the actor user has been deleted.';
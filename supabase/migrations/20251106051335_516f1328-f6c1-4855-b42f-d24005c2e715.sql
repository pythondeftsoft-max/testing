-- Fix portfolio deletion by allowing rbac_change_logs to preserve history with NULL portfolio_id
-- This prevents foreign key constraint violations during portfolio deletion cascade

-- Drop the existing foreign key constraint
ALTER TABLE public.rbac_change_logs 
DROP CONSTRAINT IF EXISTS rbac_change_logs_portfolio_id_fkey;

-- Recreate the constraint with ON DELETE SET NULL
-- This preserves audit logs even after portfolio deletion
ALTER TABLE public.rbac_change_logs 
ADD CONSTRAINT rbac_change_logs_portfolio_id_fkey 
FOREIGN KEY (portfolio_id) 
REFERENCES public.portfolios(id) 
ON DELETE SET NULL;
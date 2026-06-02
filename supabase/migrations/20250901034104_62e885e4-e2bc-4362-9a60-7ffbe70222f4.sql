-- Add foreign key relationships and indexes to rbac_change_logs table
-- This will fix the fetch errors in the audit logs query

-- Add foreign key constraints to rbac_change_logs
ALTER TABLE public.rbac_change_logs 
ADD CONSTRAINT rbac_change_logs_actor_user_id_fkey 
FOREIGN KEY (actor_user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.rbac_change_logs 
ADD CONSTRAINT rbac_change_logs_target_user_id_fkey 
FOREIGN KEY (target_user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.rbac_change_logs 
ADD CONSTRAINT rbac_change_logs_portfolio_id_fkey 
FOREIGN KEY (portfolio_id) REFERENCES public.portfolios(id) ON DELETE CASCADE;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_rbac_change_logs_actor_user_id 
ON public.rbac_change_logs(actor_user_id);

CREATE INDEX IF NOT EXISTS idx_rbac_change_logs_target_user_id 
ON public.rbac_change_logs(target_user_id);

CREATE INDEX IF NOT EXISTS idx_rbac_change_logs_portfolio_id 
ON public.rbac_change_logs(portfolio_id);

CREATE INDEX IF NOT EXISTS idx_rbac_change_logs_created_at 
ON public.rbac_change_logs(created_at DESC);
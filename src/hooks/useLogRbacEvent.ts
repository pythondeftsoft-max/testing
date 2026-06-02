
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface LogRbacEventParams {
  scope: 'account' | 'portfolio';
  object: string;
  action: 'view' | 'edit' | 'create' | 'delete';
  portfolioId?: string | null;
  allowed?: boolean;
  source?: string;
  route?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
}

export const useLogRbacEvent = () => {
  return useMutation({
    mutationFn: async (params: LogRbacEventParams) => {
      const { data, error } = await (supabase as any).rpc('log_rbac_event', {
        p_scope: params.scope,
        p_object: params.object,
        p_action: params.action,
        p_portfolio_id: params.portfolioId || null,
        p_allowed: params.allowed || false,
        p_source: params.source || 'client',
        p_route: params.route || window.location.pathname,
        p_user_agent: params.userAgent || navigator.userAgent,
        p_metadata: params.metadata || {}
      });

      if (error) {
        console.warn('RBAC logging failed:', error);
        return false;
      }

      return data;
    },
    // Fail silently to not disrupt user experience
    onError: (error) => {
      console.warn('RBAC event logging failed:', error);
    },
  });
};

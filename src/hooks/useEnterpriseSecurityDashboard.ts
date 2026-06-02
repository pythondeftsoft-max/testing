import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface SecurityDashboardMetrics {
  active_incidents: number;
  critical_incidents: number;
  high_risk_sessions: number;
  rate_limit_violations: number;
  compliance_score: number;
  recent_security_events: number;
}

export const useEnterpriseSecurityDashboard = () => {
  return useQuery({
    queryKey: ['enterprise-security-dashboard'],
    queryFn: async (): Promise<SecurityDashboardMetrics> => {
      const { data, error } = await supabase.rpc('get_enterprise_security_dashboard');
      
      if (error) {
        console.error('Error fetching security dashboard:', error);
        throw error;
      }
      
      return data?.[0] || {
        active_incidents: 0,
        critical_incidents: 0,
        high_risk_sessions: 0,
        rate_limit_violations: 0,
        compliance_score: 0,
        recent_security_events: 0
      };
    },
    refetchInterval: 30000, // Refresh every 30 seconds for real-time monitoring
  });
};
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface DomainInfo {
  id: string;
  user_id: string;
  company_name: string;
  owner_email: string | null;
  domain_type: 'domain' | 'subdomain';
  domain_value: string;
  approval_status: 'pending' | 'approved' | 'rejected';
  domain_verification_status: 'pending' | 'verified' | 'failed' | null;
  is_active: boolean;
  verified_at: string | null;
  approved_at: string | null;
  last_checked_at: string | null;
  created_at: string;
  page_views_30d: number;
  unique_visitors_30d: number;
  last_activity_at: string | null;
  verification_attempts: number;
  subscription_tier: string;
  monthly_cost: number;
  billing_cycle: string;
}

export interface DomainStats {
  total_domains: number;
  verified_domains: number;
  total_traffic: number;
  active_now: number;
}

export const useWhiteLabelDomains = () => {
  return useQuery({
    queryKey: ['white-label-domains'],
    queryFn: async () => {
      // Fetch all white label configs
      const { data: configs, error: configError } = await supabase
        .from('white_label_configs')
        .select('*')
        .order('created_at', { ascending: false });

      if (configError) throw configError;
      if (!configs || configs.length === 0) return [];

      // Get user IDs to fetch emails
      const userIds = configs.map(c => c.user_id);
      const { data: users } = await supabase
        .from('profiles')
        .select('id, email')
        .in('id', userIds);

      const userEmailMap = new Map(users?.map(u => [u.id, u.email]) || []);

      // Get domain verifications
      const { data: verifications } = await supabase
        .from('domain_verifications')
        .select('*')
        .in('white_label_config_id', configs.map(c => c.id));

      const verificationMap = new Map(
        verifications?.map(v => [v.white_label_config_id, v]) || []
      );

      // Get analytics for last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: analytics } = await supabase
        .from('white_label_analytics')
        .select('config_id, event_type, created_at')
        .gte('created_at', thirtyDaysAgo.toISOString());

      // Aggregate analytics by config
      const analyticsMap = new Map<string, { pageViews: number; uniqueVisitors: Set<string>; lastActivity: string | null }>();
      
      analytics?.forEach(event => {
        const configId = event.config_id;
        if (!analyticsMap.has(configId)) {
          analyticsMap.set(configId, { pageViews: 0, uniqueVisitors: new Set(), lastActivity: null });
        }
        const stats = analyticsMap.get(configId)!;
        
        if (event.event_type === 'page_view') {
          stats.pageViews++;
        }
        
        // Track unique visitors (simplified - in real scenario would use visitor_id)
        stats.uniqueVisitors.add(event.created_at);
        
        if (!stats.lastActivity || event.created_at > stats.lastActivity) {
          stats.lastActivity = event.created_at;
        }
      });

      // Transform to DomainInfo
      const domains: DomainInfo[] = configs.map(config => {
        const verification = verificationMap.get(config.id);
        const analytics = analyticsMap.get(config.id);
        const domain_type = config.custom_domain ? 'domain' : 'subdomain';
        const domain_value = config.custom_domain || config.custom_subdomain || 'No domain';

        return {
          id: config.id,
          user_id: config.user_id,
          company_name: config.company_name || 'Unknown',
          owner_email: userEmailMap.get(config.user_id) || null,
          domain_type,
          domain_value,
          approval_status: config.approval_status as 'pending' | 'approved' | 'rejected',
          domain_verification_status: config.domain_verification_status as 'pending' | 'verified' | 'failed' | null,
          is_active: config.is_active ?? true,
          verified_at: verification?.verified_at || null,
          approved_at: config.approved_at || null,
          last_checked_at: verification?.last_checked_at || null,
          created_at: config.created_at,
          page_views_30d: analytics?.pageViews || 0,
          unique_visitors_30d: analytics?.uniqueVisitors.size || 0,
          last_activity_at: analytics?.lastActivity || null,
          verification_attempts: verification?.verification_attempts || 0,
          subscription_tier: config.subscription_tier || 'free',
          monthly_cost: config.monthly_cost || 0,
          billing_cycle: config.billing_cycle || 'monthly',
        };
      });

      return domains;
    },
  });
};

export const useWhiteLabelDomainStats = (domains: DomainInfo[] | undefined): DomainStats => {
  if (!domains) {
    return {
      total_domains: 0,
      verified_domains: 0,
      total_traffic: 0,
      active_now: 0,
    };
  }

  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  return {
    total_domains: domains.length,
    verified_domains: domains.filter(d => d.domain_verification_status === 'verified').length,
    total_traffic: domains.reduce((sum, d) => sum + d.page_views_30d, 0),
    active_now: domains.filter(d => 
      d.last_activity_at && new Date(d.last_activity_at) > oneDayAgo
    ).length,
  };
};

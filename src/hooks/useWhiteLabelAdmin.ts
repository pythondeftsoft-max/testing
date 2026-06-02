import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface WhiteLabelAdminConfig {
  id: string;
  user_id: string;
  company_name?: string;
  white_label_type?: 'hybrid' | 'full';
  admin_approved?: boolean;
  is_active: boolean;
  subscription_tier?: string;
  custom_subdomain?: string;
  custom_domain?: string;
  primary_color?: string;
  secondary_color?: string;
  accent_color?: string;
  favicon_url?: string;
  footer_text?: string;
  contact_email?: string;
  contact_phone?: string;
  address?: string;
  created_at: string;
  updated_at: string;
  feature_flags?: any;
  max_custom_css_size?: number;
  profiles?: {
    first_name: string;
    last_name: string;
    company_name: string;
  } | null;
}

export interface WhiteLabelDomain {
  id: string;
  config_id: string;
  domain: string;
  subdomain?: string;
  status: 'pending' | 'verified' | 'failed' | 'active';
  verification_token?: string;
  ssl_status?: string;
  dns_configured?: boolean;
  created_at: string;
  updated_at: string;
}

export const useWhiteLabelAdmin = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get all white label configurations for admin
  const useWhiteLabelConfigs = (filter?: string) => {
    return useQuery({
      queryKey: ['admin-white-label-configs', filter],
      queryFn: async () => {
        let query = supabase
          .from('white_label_configs')
          .select(`
            *,
            profiles!white_label_configs_user_id_fkey(
              first_name,
              last_name,
              company_name
            )
          `)
          .order('created_at', { ascending: false });

        // For now, filter by is_active status since admin_approved doesn't exist yet
        if (filter === 'pending') {
          query = query.eq('is_active', false);
        } else if (filter === 'approved') {
          query = query.eq('is_active', true);
        }

        const { data, error } = await query;
        if (error) throw error;
        return (data || []) as any[];
      },
    });
  };

  // Get white label domains - placeholder since table doesn't exist yet
  const useWhiteLabelDomains = () => {
    return useQuery({
      queryKey: ['admin-white-label-domains'],
      queryFn: async () => {
        // Placeholder - return domains from white_label_configs for now
        const { data, error } = await supabase
          .from('white_label_configs')
          .select('id, custom_domain, custom_subdomain, company_name, user_id')
          .not('custom_domain', 'is', null);

        if (error) throw error;
        
        // Transform to match domain interface
        const domains = (data || []).map(config => ({
          id: config.id,
          config_id: config.id,
          domain: config.custom_domain,
          subdomain: config.custom_subdomain,
          status: 'active' as const,
          dns_configured: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }));
        
        return domains as WhiteLabelDomain[];
      },
    });
  };

  // Approve/reject configuration
  const useApproveConfig = () => {
    return useMutation({
      mutationFn: async ({ 
        configId, 
        approved, 
        type,
        featureFlags 
      }: { 
        configId: string; 
        approved: boolean; 
        type?: 'hybrid' | 'full';
        featureFlags?: any;
      }) => {
        const updates: any = { 
          admin_approved: approved,
          updated_at: new Date().toISOString()
        };
        
        if (type) updates.white_label_type = type;
        if (featureFlags) updates.feature_flags = featureFlags;

        const { error } = await supabase
          .from('white_label_configs')
          .update(updates)
          .eq('id', configId);

        if (error) throw error;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['admin-white-label-configs'] });
        queryClient.invalidateQueries({ queryKey: ['admin-white-label-stats'] });
        toast({
          title: "Configuration Updated",
          description: "White label configuration has been updated successfully.",
        });
      },
      onError: (error) => {
        console.error('Error updating config:', error);
        toast({
          title: "Update Failed",
          description: "Failed to update configuration. Please try again.",
          variant: "destructive",
        });
      },
    });
  };

  // Toggle active status
  const useToggleActive = () => {
    return useMutation({
      mutationFn: async ({ configId, active }: { configId: string; active: boolean }) => {
        const { error } = await supabase
          .from('white_label_configs')
          .update({ 
            is_active: active,
            updated_at: new Date().toISOString()
          })
          .eq('id', configId);

        if (error) throw error;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['admin-white-label-configs'] });
        toast({
          title: "Status Updated",
          description: "Configuration status has been updated.",
        });
      },
      onError: (error) => {
        console.error('Error toggling status:', error);
        toast({
          title: "Update Failed",
          description: "Failed to update status. Please try again.",
          variant: "destructive",
        });
      },
    });
  };

  // Verify domain
  const useVerifyDomain = () => {
    return useMutation({
      mutationFn: async ({ domainId }: { domainId: string }) => {
        // Call domain verification function
        const { data, error } = await supabase.functions.invoke('verify-white-label-domain', {
          body: { domainId }
        });

        if (error) throw error;
        return data;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['admin-white-label-domains'] });
        toast({
          title: "Domain Verification Initiated",
          description: "Domain verification process has been started.",
        });
      },
      onError: (error) => {
        console.error('Error verifying domain:', error);
        toast({
          title: "Verification Failed",
          description: "Failed to verify domain. Please check DNS configuration.",
          variant: "destructive",
        });
      },
    });
  };

  // Update feature flags
  const useUpdateFeatureFlags = () => {
    return useMutation({
      mutationFn: async ({ 
        configId, 
        featureFlags 
      }: { 
        configId: string; 
        featureFlags: any;
      }) => {
        const { error } = await supabase
          .from('white_label_configs')
          .update({ 
            feature_flags: featureFlags,
            updated_at: new Date().toISOString()
          })
          .eq('id', configId);

        if (error) throw error;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['admin-white-label-configs'] });
        toast({
          title: "Feature Flags Updated",
          description: "Feature flags have been updated successfully.",
        });
      },
    });
  };

  return {
    useWhiteLabelConfigs,
    useWhiteLabelDomains,
    useApproveConfig,
    useToggleActive,
    useVerifyDomain,
    useUpdateFeatureFlags,
  };
};

// Hook for getting admin statistics
export const useWhiteLabelStats = () => {
  return useQuery({
    queryKey: ['admin-white-label-stats'],
    queryFn: async () => {
      // Get basic counts from the configs
      const { data: allConfigs } = await supabase
        .from('white_label_configs')
        .select('id, is_active, custom_domain');
      
      const totalConfigs = allConfigs?.length || 0;
      const pendingApproval = allConfigs?.filter((c: any) => !c.is_active).length || 0;
      const activeConfigs = allConfigs?.filter((c: any) => c.is_active).length || 0;
      const customDomains = allConfigs?.filter((c: any) => c.custom_domain).length || 0;
      
      return {
        total_configs: totalConfigs,
        pending_approval: pendingApproval,
        active_configs: activeConfigs,
        custom_domains: customDomains
      };
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};
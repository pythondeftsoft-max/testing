import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface DomainStatus {
  domain_type: 'subdomain' | 'custom_domain';
  domain_value: string;
  status: string;
  last_verified_at?: string;
  verification_errors?: any[];
  ssl_status?: string;
  dns_status?: string;
}

export const useDomainVerification = (configId: string) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch domain verification status
  const { data: domainStatuses, isLoading, error } = useQuery({
    queryKey: ['domain-verification', configId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_domain_verification_status', {
        p_config_id: configId
      });

      if (error) {
        console.error('Error fetching domain verification status:', error);
        throw error;
      }

      return data as DomainStatus[];
    },
    enabled: !!configId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Verify subdomain mutation
  const verifySubdomainMutation = useMutation({
    mutationFn: async ({ subdomain }: { subdomain: string }) => {
      const { data, error } = await supabase.functions.invoke('verify-subdomain', {
        body: {
          config_id: configId,
          subdomain
        }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Verification Started",
        description: "Subdomain verification is in progress...",
      });
      // Invalidate and refetch the domain statuses
      queryClient.invalidateQueries({ queryKey: ['domain-verification', configId] });
    },
    onError: (error: any) => {
      console.error('Subdomain verification error:', error);
      toast({
        variant: "destructive",
        title: "Verification Failed",
        description: error.message || "Failed to verify subdomain. Please try again.",
      });
    },
  });

  // Verify custom domain mutation
  const verifyCustomDomainMutation = useMutation({
    mutationFn: async ({ domain, verificationToken }: { domain: string; verificationToken: string }) => {
      console.log('Verifying domain:', { domain, verificationToken });
      const { data, error } = await supabase.functions.invoke('verify-domain', {
        body: { domain, verification_token: verificationToken }
      });

      console.log('Verify domain response:', { data, error });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      console.log('Domain verification success:', data);
      if (data.verified) {
        toast({
          title: "Domain Verified Successfully",
          description: "Your domain has been verified and is now active.",
        });
      } else {
        toast({
          variant: "destructive",
          title: "Domain Verification Failed",
          description: data.message || "The TXT record was not found or is incorrect.",
        });
      }
      queryClient.invalidateQueries({ queryKey: ['domain-verification', configId] });
    },
    onError: (error: any) => {
      console.error('Domain verification error:', error);
      toast({
        variant: "destructive",
        title: "Verification Failed",
        description: error.message || "Failed to verify domain. Please try again.",
      });
    },
  });

  // Test configuration mutation
  const testConfigurationMutation = useMutation({
    mutationFn: async ({ domain, subdomain }: { domain?: string; subdomain?: string }) => {
      console.log('Testing configuration for:', { domain, subdomain });
      const { data, error } = await supabase.functions.invoke('test-configuration', {
        body: { domain, subdomain }
      });

      console.log('Test configuration response:', { data, error });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      console.log('Test configuration success:', data);
      const passed = data.overall_status === 'passed';
      const testResults = data.tests || {};
      const failedTests = Object.entries(testResults)
        .filter(([_, result]: [string, any]) => result === false)
        .map(([test, _]: [string, any]) => test.replace(/_/g, ' '));

      if (passed) {
        toast({
          title: "Configuration Test Passed",
          description: "All connectivity and SSL tests passed successfully.",
        });
      } else {
        const failedList = failedTests.length > 0 ? ` Failed: ${failedTests.join(', ')}` : '';
        toast({
          variant: "destructive",
          title: "Configuration Test Failed",
          description: `Some tests failed.${failedList}`,
        });
      }
    },
    onError: (error: any) => {
      console.error('Configuration test error:', error);
      toast({
        variant: "destructive",
        title: "Configuration Test Failed",
        description: error.message || "Failed to test configuration. Please try again.",
      });
    },
  });

  // Save domain settings mutation
  const saveDomainSettingsMutation = useMutation({
    mutationFn: async ({ configId, domain, subdomain, autoRedirect }: { 
      configId: string; 
      domain?: string; 
      subdomain?: string; 
      autoRedirect?: boolean;
    }) => {
      const { data, error } = await supabase.functions.invoke('save-domain-settings', {
        body: { configId, domain, subdomain, autoRedirect }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Settings Saved",
        description: "Domain settings have been saved successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['domain-verification', configId] });
    },
    onError: (error: any) => {
      console.error('Save domain settings error:', error);
      toast({
        variant: "destructive",
        title: "Failed to Save",
        description: error.message || "Failed to save domain settings. Please try again.",
      });
    },
  });

  // Check DNS status mutation
  const checkDnsStatusMutation = useMutation({
    mutationFn: async ({ domain, verificationToken }: { domain: string; verificationToken: string }) => {
      const { data, error } = await supabase.functions.invoke('check-dns-status', {
        body: { domain, verification_token: verificationToken }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      if (data.recordFound) {
        toast({
          title: "DNS Record Found ✅",
          description: data.message,
        });
      } else {
        toast({
          title: "DNS Record Not Found ❌",
          description: data.message,
          variant: "destructive",
        });
      }
    },
    onError: (error: any) => {
      console.error('DNS check error:', error);
      toast({
        variant: "destructive",
        title: "DNS Check Failed",
        description: error.message || "Failed to check DNS status. Please try again.",
      });
    },
  });

  // Get subdomain status
  const getSubdomainStatus = (subdomain: string) => {
    if (!domainStatuses) return null;
    return domainStatuses.find(
      status => status.domain_type === 'subdomain' && 
      (status.domain_value === subdomain || status.domain_value === `${subdomain}.openkeyhousing.com`)
    );
  };

  // Get custom domain status
  const getCustomDomainStatus = (domain: string) => {
    if (!domainStatuses) return null;
    return domainStatuses.find(
      status => status.domain_type === 'custom_domain' && status.domain_value === domain
    );
  };

  // Helper function to get display status
  const getDisplayStatus = (status?: DomainStatus) => {
    if (!status) return { text: 'Not Configured', variant: 'secondary' as const };
    
    switch (status.status) {
      case 'verified':
        return { text: 'Active', variant: 'default' as const };
      case 'pending':
        return { text: 'Pending', variant: 'secondary' as const };
      case 'failed':
        return { text: 'Failed', variant: 'destructive' as const };
      default:
        return { text: 'Unknown', variant: 'secondary' as const };
    }
  };

  return {
    domainStatuses,
    isLoading,
    error,
    verifySubdomain: verifySubdomainMutation.mutate,
    isVerifying: verifySubdomainMutation.isPending,
    verifyCustomDomain: verifyCustomDomainMutation.mutate,
    isVerifyingCustomDomain: verifyCustomDomainMutation.isPending,
    testConfiguration: testConfigurationMutation.mutate,
    isTestingConfiguration: testConfigurationMutation.isPending,
    checkDnsStatus: checkDnsStatusMutation.mutate,
    isCheckingDns: checkDnsStatusMutation.isPending,
    saveDomainSettings: saveDomainSettingsMutation.mutate,
    isSavingDomainSettings: saveDomainSettingsMutation.isPending,
    getSubdomainStatus,
    getCustomDomainStatus,
    getDisplayStatus,
  };
};
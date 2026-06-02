
import React, { createContext, useContext, ReactNode } from 'react';
import { useUserPreferences, useTenantMarketplacePreferences } from '@/hooks/useUserPreferences';
import { useAuth } from '@/providers/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

interface PreferencesContextValue {
  userPreferences: any;
  tenantPreferences: any;
  isLoading: boolean;
  shouldShowMarketplace: () => Promise<boolean>;
  setHousingInterest: (interest: boolean) => void;
  dismissMarketplacePrompt: () => void;
  updateMarketplaceMode: (mode: 'section8' | 'mixed') => void;
  businessPhase: string;
  tenantContext: {
    isVoucherHolder: boolean;
    hasResidentialTenancy: boolean;
    hasMarineTenancy: boolean;
    housingInterest: boolean;
  } | null;
}

const PreferencesContext = createContext<PreferencesContextValue | undefined>(undefined);

export const usePreferences = () => {
  const context = useContext(PreferencesContext);
  if (!context) {
    throw new Error('usePreferences must be used within a PreferencesProvider');
  }
  return context;
};

interface PreferencesProviderProps {
  children: ReactNode;
}

export const PreferencesProvider: React.FC<PreferencesProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const { preferences: userPreferences, updatePreferences, isLoading: userLoading } = useUserPreferences(user?.id);
  const { tenantPrefs: tenantPreferences, updateTenantPreferences, isLoading: tenantLoading } = useTenantMarketplacePreferences(user?.id);

  // Get business phase using RPC for consistency - non-blocking with fallback
  const { data: businessPhaseData } = useQuery({
    queryKey: ['business-phase', user?.id],
    queryFn: async () => {
      if (!user?.id) return 'section8';
      try {
        const { data, error } = await (supabase as any).rpc('get_business_phase', {
          p_user_id: user.id
        });
        if (error) {
          console.warn('Business phase RPC failed, using default:', error);
          return 'section8';
        }
        return data || 'section8';
      } catch (error) {
        console.warn('Business phase unavailable, using default:', error);
        return 'section8';
      }
    },
    enabled: !!user?.id,
    retry: false, // Don't retry on failure - use default immediately
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch tenant context using the new database function - non-blocking with fallback
  const { data: tenantContext } = useQuery({
    queryKey: ['tenant-context', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      try {
        const { data, error } = await (supabase as any).rpc('compute_tenant_context', {
          p_user_id: user.id
        });

        if (error) {
          console.warn('Tenant context RPC failed:', error);
          return { is_voucher_holder: false, has_residential_tenancy: false, has_marine_tenancy: false, housing_interest: false };
        }
        return data?.[0] || { is_voucher_holder: false, has_residential_tenancy: false, has_marine_tenancy: false, housing_interest: false };
      } catch (error) {
        console.warn('Tenant context unavailable:', error);
        return { is_voucher_holder: false, has_residential_tenancy: false, has_marine_tenancy: false, housing_interest: false };
      }
    },
    enabled: !!user?.id,
    retry: false, // Don't retry on failure - use defaults immediately
    staleTime: 5 * 60 * 1000,
  });

  const shouldShowMarketplace = () => {
    if (!user?.id || !userPreferences) return Promise.resolve(false);

    // Check if user has explicitly disabled marketplace access
    if (userPreferences.show_marketplace === false) {
      return Promise.resolve(false);
    }

    // Use database function for marketplace access logic
    return (supabase as any).rpc('should_show_marketplace', {
      p_user_id: user.id,
      p_marketplace_mode: userPreferences.tenant_marketplace_mode || 'section8'
    }).then(({ data, error }: any) => {
      if (error) {
        console.warn('Error checking marketplace access:', error);
        return false;
      }
      return data === true;
    });
  };

  const setHousingInterest = (interest: boolean) => {
    updateTenantPreferences({
      housing_interest: interest,
      marketplace_access_reason: interest ? 'looking_for_housing' : 'none',
      marketplace_prompt_dismissed_at: interest ? null : new Date().toISOString()
    });
  };

  const dismissMarketplacePrompt = () => {
    updateTenantPreferences({
      marketplace_prompt_dismissed_at: new Date().toISOString()
    });
  };

  const updateMarketplaceMode = (mode: 'section8' | 'mixed') => {
    updatePreferences({
      tenant_marketplace_mode: mode
    });
  };

  const value: PreferencesContextValue = {
    userPreferences,
    tenantPreferences,
    isLoading: userLoading || tenantLoading,
    shouldShowMarketplace,
    setHousingInterest,
    dismissMarketplacePrompt,
    updateMarketplaceMode,
    businessPhase: String(businessPhaseData || 'section8'),
    tenantContext
  };

  return (
    <PreferencesContext.Provider value={value}>
      {children}
    </PreferencesContext.Provider>
  );
};

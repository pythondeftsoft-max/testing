import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { usePlanStatus } from './usePlanStatus';

interface SubscriptionData {
  id: string;
  plan_type: string;
  status: string;
  role: string;
  current_period_end: string;
}

interface TenantProfile {
  is_plus_subscriber: boolean;
  plus_subscription_expires_at?: string;
  applications_this_month: number;
}

interface LandlordProfile {
  subscription_active: boolean;
  subscription_expires_at?: string;
  subscription_tier?: string;
}

export const useSubscription = (userId: string, userType: 'tenant' | 'landlord') => {
  const role = userType;

  // Fetch plan activation status
  const { data: planStatus } = usePlanStatus();

  // Fetch subscription data
  const { data: subscription, isLoading: subscriptionLoading } = useQuery({
    queryKey: ['subscription', userId, role],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', userId)
        .eq('role', role)
        .eq('status', 'active')
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }
      return data as SubscriptionData | null;
    },
    enabled: !!userId,
  });

  // Fetch role-specific profile data
  const { data: profileData, isLoading: profileLoading } = useQuery({
    queryKey: ['profile', userId, role],
    queryFn: async () => {
      if (role === 'tenant') {
        const { data, error } = await supabase
          .from('tenant_profiles')
          .select('is_plus_subscriber, plus_subscription_expires_at, applications_this_month')
          .eq('user_id', userId)
          .maybeSingle();

        if (error && error.code !== 'PGRST116') {
          throw error;
        }
        return data as TenantProfile | null;
      } else {
        const { data, error } = await supabase
          .from('profiles')
          .select('subscription_active, subscription_expires_at, subscription_tier')
          .eq('id', userId)
          .maybeSingle();

        if (error && error.code !== 'PGRST116') {
          throw error;
        }
        return data as LandlordProfile | null;
      }
    },
    enabled: !!userId,
  });

  const isLoading = subscriptionLoading || profileLoading;

  // Determine subscription status
  const hasActiveSubscription = !!(subscription && subscription.status === 'active');
  
  const isSubscriptionValid = hasActiveSubscription && 
    (!subscription?.current_period_end || new Date(subscription.current_period_end) > new Date());

  // Role-specific access checks
  const hasAccess = async (feature: string): Promise<boolean> => {
    if (!isSubscriptionValid) return false;

    if (role === 'tenant') {
      const tenantData = profileData as TenantProfile;
      switch (feature) {
        case 'unlimited_applications':
        case 'priority_placement':
        case 'early_access':
          // Check if user has subscription OR if tenant_pro plan is inactive (free for everyone)
          return tenantData?.is_plus_subscriber === true || planStatus?.['tenant_pro'] === false;
        default:
          return false;
      }
    } else {
      // Landlord access checks
      const managementFeatures = ['rent_payment', 'maintenance_management', 'vendor_management', 'lease_management'];
      
      if (managementFeatures.includes(feature)) {
        // If they have a paid subscription, grant access
        if (subscription?.plan_type && ['basic', 'pro', 'white_label'].includes(subscription.plan_type)) {
          return true;
        }
        
        // If Basic or Pro plan is deactivated, grant free access to management features
        if (planStatus?.['basic'] === false || planStatus?.['pro'] === false) {
          return true;
        }
        
        // Check if they're within free unit limits (10 free management units)
        if (subscription?.plan_type === 'free_landlord') {
          try {
            const { data } = await supabase.rpc('check_property_limit_with_notifications', {
              landlord_id: userId
            });
            
            if (data && data[0]) {
              const { current_count, free_limit } = data[0];
              return current_count <= free_limit; // Within free 10 units
            }
          } catch (error) {
            console.error('Error checking property limits:', error);
            return false;
          }
        }
        
        return false;
      }
      
      // Handle other features
      switch (feature) {
        case 'cash_flow':
        case 'portfolio_metrics':
          // User has paid subscription OR Pro/Analytics plan is deactivated (free for everyone)
          return ['pro', 'analytics_tracking'].includes(subscription?.plan_type || '') ||
                 planStatus?.['pro'] === false || 
                 planStatus?.['analytics_tracking'] === false;
        case 'white_label_branding':
        case 'white_label_domains':
        case 'white_label_advanced':
          // User has white label subscription OR White Label plan is deactivated (free for everyone)
          return subscription?.plan_type === 'white_label' || 
                 planStatus?.['white_label'] === false;
        default:
          return false;
      }
    }
  };

  // Application limits for tenants
  const getApplicationLimits = () => {
    if (role !== 'tenant') return null;
    
    const tenantData = profileData as TenantProfile;
    const hasUnlimited = hasAccess('unlimited_applications');
    
    return {
      hasUnlimited,
      current: tenantData?.applications_this_month || 0,
      limit: hasUnlimited ? Infinity : 3, // Free tier gets 3 applications per month
      canApply: hasUnlimited || (tenantData?.applications_this_month || 0) < 3
    };
  };

  return {
    subscription,
    profileData,
    isLoading,
    hasActiveSubscription: isSubscriptionValid,
    hasAccess,
    role,
    applicationLimits: getApplicationLimits(),
    refresh: () => {
      // Invalidate queries to refetch data
      supabase.rpc('has_active_subscription', { user_id: userId, subscription_role: role });
    }
  };
};
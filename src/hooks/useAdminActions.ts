
import { useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAdminAudit } from './useAdminAudit';

export const useAdminActions = () => {
  const { toast } = useToast();
  const { logAdminAccess, logSuspiciousAdminActivity } = useAdminAudit();

  const setPropertyMarketStatus = useMutation({
    mutationFn: async ({ 
      propertyId, 
      onMarket, 
      reason = 'Admin override via dashboard',
      metadata = {} 
    }: {
      propertyId: string;
      onMarket: boolean;
      reason?: string;
      metadata?: Record<string, any>;
    }) => {
      const { data, error } = await supabase.rpc('admin_set_property_market_status', {
        p_property_id: propertyId,
        p_on_market: onMarket,
        p_reason: reason,
        p_metadata: metadata
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      logAdminAccess('property', variables.propertyId, 'set_market_status', {
        on_market: variables.onMarket,
        reason: variables.reason
      });
      
      toast({
        title: variables.onMarket ? "Property Listed" : "Property Unlisted",
        description: variables.onMarket 
          ? "Property is now listed and visible to applicants"
          : "Property is no longer listed on the market",
      });
    },
    onError: (error: any) => {
      console.error('Admin market status error:', error);
      logSuspiciousAdminActivity('market_status_failed', {
        error: error.message,
        attempted_action: 'set_market_status'
      });
      
      toast({
        title: "Error",
        description: "Failed to update market status. Please try again.",
        variant: "destructive",
      });
    }
  });

  const removePropertyTenant = useMutation({
    mutationFn: async ({ 
      propertyId, 
      reason = 'Admin tenant removal via dashboard',
      metadata = {} 
    }: {
      propertyId: string;
      reason?: string;
      metadata?: Record<string, any>;
    }) => {
      const { data, error } = await supabase.rpc('admin_remove_property_tenant', {
        p_property_id: propertyId,
        p_reason: reason,
        p_metadata: metadata
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      logAdminAccess('property', variables.propertyId, 'remove_tenant', {
        reason: variables.reason
      });
      
      toast({
        title: "Tenant Removed",
        description: "Tenant has been removed. Property is now vacant.",
      });
    },
    onError: (error: any) => {
      console.error('Admin tenant removal error:', error);
      logSuspiciousAdminActivity('tenant_removal_failed', {
        error: error.message,
        attempted_action: 'remove_tenant'
      });
      
      toast({
        title: "Error",
        description: "Failed to remove tenant. Please try again.",
        variant: "destructive",
      });
    }
  });

  const switchPropertyTenant = useMutation({
    mutationFn: async ({ 
      propertyId, 
      newTenantEmail,
      reason = 'Admin tenant switch via dashboard',
      metadata = {} 
    }: {
      propertyId: string;
      newTenantEmail: string;
      reason?: string;
      metadata?: Record<string, any>;
    }) => {
      const { data, error } = await supabase.rpc('admin_switch_property_tenant', {
        p_property_id: propertyId,
        p_new_tenant_email: newTenantEmail,
        p_reason: reason,
        p_metadata: metadata
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data, variables) => {
      const result = data as any;
      if (result?.success) {
        logAdminAccess('property', variables.propertyId, 'switch_tenant', {
          new_tenant_email: variables.newTenantEmail,
          reason: variables.reason
        });
        
        toast({
          title: "Tenant Switched",
          description: "Property tenant has been successfully switched.",
        });
      } else {
        throw new Error(result?.error || 'Failed to switch tenant');
      }
    },
    onError: (error: any) => {
      console.error('Admin tenant switch error:', error);
      logSuspiciousAdminActivity('tenant_switch_failed', {
        error: error.message,
        attempted_action: 'switch_tenant'
      });
      
      toast({
        title: "Error",
        description: error.message || "Failed to switch tenant. Please try again.",
        variant: "destructive",
      });
    }
  });

  return {
    setPropertyMarketStatus,
    removePropertyTenant,
    switchPropertyTenant
  };
};

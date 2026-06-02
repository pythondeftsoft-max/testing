
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAdminAudit } from './useAdminAudit';

export const useAdminUnitActions = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { logAdminAccess, logSuspiciousAdminActivity } = useAdminAudit();

  const setUnitMarketStatus = useMutation({
    mutationFn: async ({ 
      unitId, 
      onMarket, 
      reason = 'Admin override via dashboard',
      metadata = {} 
    }: {
      unitId: string;
      onMarket: boolean;
      reason?: string;
      metadata?: Record<string, any>;
    }) => {
      const { data, error } = await supabase.rpc('admin_set_unit_market_status', {
        p_unit_id: unitId,
        p_on_market: onMarket,
        p_reason: reason,
        p_metadata: metadata
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      logAdminAccess('unit', variables.unitId, 'set_market_status', {
        on_market: variables.onMarket,
        reason: variables.reason
      });
      
      toast({
        title: variables.onMarket ? "Unit Listed" : "Unit Unlisted",
        description: variables.onMarket 
          ? "Unit is now listed and visible to applicants"
          : "Unit is no longer listed on the market",
      });

      // Invalidate relevant queries (not admin-properties to avoid full page reload)
      queryClient.invalidateQueries({ queryKey: ['admin-units'] });
    },
    onError: (error: any) => {
      console.error('Admin unit market status error:', error);
      logSuspiciousAdminActivity('unit_market_status_failed', {
        error: error.message,
        attempted_action: 'set_unit_market_status'
      });
      
      toast({
        title: "Error",
        description: "Failed to update unit market status. Please try again.",
        variant: "destructive",
      });
    }
  });

  const removeUnitTenant = useMutation({
    mutationFn: async ({ 
      unitId, 
      reason = 'Admin unit tenant removal via dashboard',
      metadata = {} 
    }: {
      unitId: string;
      reason?: string;
      metadata?: Record<string, any>;
    }) => {
      const { data, error } = await supabase.rpc('admin_remove_unit_tenant', {
        p_unit_id: unitId,
        p_reason: reason,
        p_metadata: metadata
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      logAdminAccess('unit', variables.unitId, 'remove_tenant', {
        reason: variables.reason
      });
      
      toast({
        title: "Tenant Removed",
        description: "Tenant has been removed from unit. Unit is now available.",
      });

      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['admin-units'] });
      queryClient.invalidateQueries({ queryKey: ['admin-properties'] });
    },
    onError: (error: any) => {
      console.error('Admin unit tenant removal error:', error);
      logSuspiciousAdminActivity('unit_tenant_removal_failed', {
        error: error.message,
        attempted_action: 'remove_unit_tenant'
      });
      
      toast({
        title: "Error",
        description: "Failed to remove tenant from unit. Please try again.",
        variant: "destructive",
      });
    }
  });

  const upsertUnit = useMutation({
    mutationFn: async ({ 
      unitId, 
      propertyId, 
      unitData, 
      reason = 'Admin unit upsert via dashboard',
      metadata = {} 
    }: {
      unitId?: string;
      propertyId: string;
      unitData: Record<string, any>;
      reason?: string;
      metadata?: Record<string, any>;
    }) => {
      const { data, error } = await supabase.rpc('admin_upsert_unit', {
        p_property_id: propertyId,
        p_unit_data: unitData,
        p_unit_id: unitId || null,
        p_reason: reason,
        p_metadata: metadata
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      const action = variables.unitId ? 'update_unit' : 'create_unit';
      logAdminAccess('unit', variables.unitId || 'new', action, {
        reason: variables.reason,
        unit_data: variables.unitData
      });
      
      toast({
        title: variables.unitId ? "Unit Updated" : "Unit Created",
        description: variables.unitId 
          ? "Unit has been updated successfully"
          : "New unit has been created successfully",
      });

      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['admin-units'] });
      queryClient.invalidateQueries({ queryKey: ['admin-properties'] });
      queryClient.invalidateQueries({ queryKey: ['property-details'] });
    },
    onError: (error: any) => {
      console.error('Admin unit upsert error:', error);
      logSuspiciousAdminActivity('unit_upsert_failed', {
        error: error.message,
        attempted_action: 'upsert_unit'
      });
      
      toast({
        title: "Error",
        description: "Failed to save unit. Please try again.",
        variant: "destructive",
      });
    }
  });

  return {
    setUnitMarketStatus,
    removeUnitTenant,
    upsertUnit
  };
};

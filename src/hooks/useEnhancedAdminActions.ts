import { useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAdminAudit } from './useAdminAudit';

interface AdminPropertyOperationResult {
  success: boolean;
  message: string;
  updated_count?: number;
}

interface BatchUpdateData {
  [key: string]: string | boolean | number | null | undefined;
  status?: string;
  on_market?: boolean;
  monthly_rent?: number;
  portfolio_id?: string | null;
}

export const useEnhancedAdminActions = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { logAdminAccess, logSuspiciousAdminActivity } = useAdminAudit();

  const softDeleteProperty = useMutation({
    mutationFn: async ({ 
      propertyId, 
      reason = 'Admin soft delete via dashboard',
      metadata = {} 
    }: {
      propertyId: string;
      reason?: string;
      metadata?: Record<string, any>;
    }) => {
      const { data, error } = await supabase.rpc('admin_soft_delete_property', {
        p_property_id: propertyId,
        p_reason: reason,
        p_metadata: metadata
      });

      if (error) throw error;
      return data as AdminPropertyOperationResult[];
    },
    onSuccess: (result, variables) => {
      const operationResult = result[0];
      if (operationResult.success) {
        logAdminAccess('property', variables.propertyId, 'soft_delete', {
          reason: variables.reason
        });
        
        toast({
          title: "Property Deleted",
          description: operationResult.message,
        });

        // Invalidate relevant queries
        queryClient.invalidateQueries({ queryKey: ['admin-properties-overview'] });
        queryClient.invalidateQueries({ queryKey: ['properties'] });
        queryClient.invalidateQueries({ queryKey: ['deleted-properties'] });
      } else {
        throw new Error(operationResult.message);
      }
    },
    onError: (error: any, variables) => {
      console.error('Admin soft delete error:', error);
      logSuspiciousAdminActivity('soft_delete_failed', {
        error: error.message,
        property_id: variables.propertyId
      });
      
      toast({
        title: "Delete Failed",
        description: error.message || "Failed to delete property. Please try again.",
        variant: "destructive",
      });
    }
  });

  const restoreProperty = useMutation({
    mutationFn: async ({ 
      propertyId, 
      reason = 'Admin restore via dashboard',
      metadata = {} 
    }: {
      propertyId: string;
      reason?: string;
      metadata?: Record<string, any>;
    }) => {
      const { data, error } = await supabase.rpc('admin_restore_property', {
        p_property_id: propertyId,
        p_reason: reason,
        p_metadata: metadata
      });

      if (error) throw error;
      return data as AdminPropertyOperationResult[];
    },
    onSuccess: (result, variables) => {
      const operationResult = result[0];
      if (operationResult.success) {
        logAdminAccess('property', variables.propertyId, 'restore', {
          reason: variables.reason
        });
        
        toast({
          title: "Property Restored",
          description: operationResult.message,
        });

        queryClient.invalidateQueries({ queryKey: ['admin-properties-overview'] });
        queryClient.invalidateQueries({ queryKey: ['properties'] });
      } else {
        throw new Error(operationResult.message);
      }
    },
    onError: (error: any, variables) => {
      console.error('Admin restore error:', error);
      logSuspiciousAdminActivity('restore_failed', {
        error: error.message,
        property_id: variables.propertyId
      });
      
      toast({
        title: "Restore Failed",
        description: error.message || "Failed to restore property. Please try again.",
        variant: "destructive",
      });
    }
  });

  const transferOwnership = useMutation({
    mutationFn: async ({ 
      propertyId, 
      newOwnerId,
      newPortfolioId = null,
      reason = 'Admin ownership transfer via dashboard',
      metadata = {} 
    }: {
      propertyId: string;
      newOwnerId: string;
      newPortfolioId?: string | null;
      reason?: string;
      metadata?: Record<string, any>;
    }) => {
      const { data, error } = await supabase.rpc('admin_transfer_property_ownership', {
        p_property_id: propertyId,
        p_new_owner_id: newOwnerId,
        p_new_portfolio_id: newPortfolioId,
        p_reason: reason,
        p_metadata: metadata
      });

      if (error) throw error;
      return data as AdminPropertyOperationResult[];
    },
    onSuccess: (result, variables) => {
      const operationResult = result[0];
      if (operationResult.success) {
        logAdminAccess('property', variables.propertyId, 'transfer_ownership', {
          new_owner_id: variables.newOwnerId,
          new_portfolio_id: variables.newPortfolioId,
          reason: variables.reason
        });
        
        toast({
          title: "Ownership Transferred",
          description: operationResult.message,
        });

        queryClient.invalidateQueries({ queryKey: ['admin-properties-overview'] });
        queryClient.invalidateQueries({ queryKey: ['properties'] });
      } else {
        throw new Error(operationResult.message);
      }
    },
    onError: (error: any, variables) => {
      console.error('Admin transfer ownership error:', error);
      logSuspiciousAdminActivity('transfer_ownership_failed', {
        error: error.message,
        property_id: variables.propertyId,
        new_owner_id: variables.newOwnerId
      });
      
      toast({
        title: "Transfer Failed",
        description: error.message || "Failed to transfer ownership. Please try again.",
        variant: "destructive",
      });
    }
  });

  const batchUpdateProperties = useMutation({
    mutationFn: async ({ 
      propertyIds, 
      updates,
      reason = 'Admin batch update via dashboard',
      metadata = {} 
    }: {
      propertyIds: string[];
      updates: BatchUpdateData;
      reason?: string;
      metadata?: Record<string, any>;
    }) => {
      const { data, error } = await supabase.rpc('admin_batch_update_properties', {
        p_property_ids: propertyIds,
        p_updates: updates,
        p_reason: reason,
        p_metadata: metadata
      });

      if (error) throw error;
      return data as AdminPropertyOperationResult[];
    },
    onSuccess: (result, variables) => {
      const operationResult = result[0];
      if (operationResult.success) {
        logAdminAccess('bulk_operation', 'properties_batch', 'batch_update', {
          property_count: variables.propertyIds.length,
          updates: variables.updates,
          reason: variables.reason
        });
        
        toast({
          title: "Batch Update Complete",
          description: operationResult.message,
        });

        queryClient.invalidateQueries({ queryKey: ['admin-properties-overview'] });
        queryClient.invalidateQueries({ queryKey: ['properties'] });
      } else {
        throw new Error(operationResult.message);
      }
    },
    onError: (error: any, variables) => {
      console.error('Admin batch update error:', error);
      logSuspiciousAdminActivity('batch_update_failed', {
        error: error.message,
        property_count: variables.propertyIds.length,
        updates: variables.updates
      });
      
      toast({
        title: "Batch Update Failed",
        description: error.message || "Failed to update properties. Please try again.",
        variant: "destructive",
      });
    }
  });

  const deleteUnit = useMutation({
    mutationFn: async ({ 
      unitId, 
      reason = 'Admin unit delete via dashboard',
      metadata = {} 
    }: {
      unitId: string;
      reason?: string;
      metadata?: Record<string, any>;
    }) => {
      const { data, error } = await supabase.rpc('admin_delete_unit', {
        p_unit_id: unitId,
        p_reason: reason,
        p_metadata: metadata
      });

      if (error) throw error;
      return data as AdminPropertyOperationResult[];
    },
    onSuccess: (result, variables) => {
      const operationResult = result[0];
      if (operationResult.success) {
        logAdminAccess('unit', variables.unitId, 'delete', {
          reason: variables.reason
        });
        
        toast({
          title: "Unit Deleted",
          description: operationResult.message,
        });

        queryClient.invalidateQueries({ queryKey: ['property-units'] });
        queryClient.invalidateQueries({ queryKey: ['admin-properties-overview'] });
      } else {
        throw new Error(operationResult.message);
      }
    },
    onError: (error: any, variables) => {
      console.error('Admin unit delete error:', error);
      logSuspiciousAdminActivity('unit_delete_failed', {
        error: error.message,
        unit_id: variables.unitId
      });
      
      toast({
        title: "Unit Delete Failed",
        description: error.message || "Failed to delete unit. Please try again.",
        variant: "destructive",
      });
    }
  });

  return {
    softDeleteProperty,
    restoreProperty,
    transferOwnership,
    batchUpdateProperties,
    deleteUnit,
    isLoading: softDeleteProperty.isPending || restoreProperty.isPending || 
               transferOwnership.isPending || batchUpdateProperties.isPending || 
               deleteUnit.isPending
  };
};
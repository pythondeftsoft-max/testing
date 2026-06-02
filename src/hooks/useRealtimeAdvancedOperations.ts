import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useRealtimeAdvancedOperations(portfolioId?: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    // Create real-time channels for advanced operations
    const maintenanceChannel = supabase
      .channel('maintenance-operations')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'maintenance_workflows'
        },
        () => {
          // Invalidate maintenance-related queries
          queryClient.invalidateQueries({ queryKey: ['maintenance-workflows'] });
          queryClient.invalidateQueries({ queryKey: ['predictive-maintenance'] });
          queryClient.invalidateQueries({ queryKey: ['maintenance-budgets'] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'predictive_maintenance'
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['predictive-maintenance'] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'maintenance_budgets'
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['maintenance-budgets'] });
        }
      )
      .subscribe();

    const financialChannel = supabase
      .channel('financial-operations')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'expense_tracking'
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['expense-tracking'] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'cash_flow_forecasts'
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['cash-flow-forecasts'] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tax_documents'
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['tax-documents'] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'budget_alerts'
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['budget-alerts'] });
        }
      )
      .subscribe();

    const tenantChannel = supabase
      .channel('tenant-operations')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'lease_lifecycle'
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['lease-lifecycle'] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tenant_communications'
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['tenant-communications'] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'rent_collection_alerts'
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['rent-collection-alerts'] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tenant_screening'
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['tenant-screening'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(maintenanceChannel);
      supabase.removeChannel(financialChannel);
      supabase.removeChannel(tenantChannel);
    };
  }, [portfolioId, queryClient]);
}
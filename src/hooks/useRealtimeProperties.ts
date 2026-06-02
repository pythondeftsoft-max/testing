import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { propertyKeys } from './useProperties';

// Hook specifically for real-time property updates
export function useRealtimeProperties(userId?: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!userId) return;

    // Enable real-time for properties table
    const propertiesChannel = supabase
      .channel('realtime-properties')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'properties',
        },
        (payload) => {
          console.log('🔴 REALTIME EVENT RECEIVED:', {
            eventType: payload.eventType,
            table: payload.table,
            timestamp: new Date().toISOString()
          });
          
          console.log('Real-time property change:', payload);
          
          // Skip invalidation for soft deletes/restores - they're already explicitly handled
          if (payload.eventType === 'UPDATE') {
            const newData = payload.new as any;
            const oldData = payload.old as any;
            
            // Check if deleted_at field is present in the update
            const hasDeletedAtInNew = newData && ('deleted_at' in newData);
            
            if (hasDeletedAtInNew) {
              // Check if this is a recent soft-delete (deleted_at set within last 5 seconds)
              if (newData.deleted_at) {
                const deletedAtTime = new Date(newData.deleted_at).getTime();
                const now = Date.now();
                const timeDiff = now - deletedAtTime;
                
                // If deleted_at timestamp is very recent (within 5 seconds), it's a fresh soft-delete
                if (timeDiff < 5000) {
                  console.log('✅ Skipping realtime invalidation for soft delete (recent timestamp) - already handled explicitly');
                  return;
                }
              }
              
              // Check if this is a restore (deleted_at changed from something to null)
              if (oldData && oldData.deleted_at && !newData.deleted_at) {
                console.log('✅ Skipping realtime invalidation for restore - already handled explicitly');
                return;
              }
              
              // Fallback: if oldData unavailable but deleted_at exists, assume soft-delete
              if (!oldData && newData.deleted_at) {
                console.log('✅ Skipping realtime invalidation for soft delete (no oldData available) - assuming soft-delete');
                return;
              }
            }
            
            // Log what's passing through for debugging
            console.log('⚠️ Realtime UPDATE passing through to invalidation:', {
              hasDeletedAtInNew,
              deleted_at: newData?.deleted_at,
              hasOldData: !!oldData
            });
          }
          
          // For all other property changes, invalidate as normal
          queryClient.invalidateQueries({ queryKey: propertyKeys.all });
          
          // Dispatch custom event to notify non-React-Query components
          window.dispatchEvent(new CustomEvent('properties-changed', { 
            detail: { eventType: payload.eventType }
          }));
          
          // Show different messages based on event type
          if (payload.eventType === 'UPDATE') {
            const property = payload.new as any;
            
            // Only show toast for status changes that affect visibility
            if (payload.old && payload.old.status !== property.status) {
              console.log(`Property ${property.id} status changed from ${payload.old.status} to ${property.status}`);
            }
          }
        }
      )
      .subscribe();

    // Enable real-time for tenant requests
    const tenantRequestsChannel = supabase
      .channel('realtime-tenant-requests')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'property_tenant_requests',
        },
        (payload) => {
          console.log('Real-time tenant request change:', payload);
          
          // Invalidate property queries when tenant requests change
          queryClient.invalidateQueries({ queryKey: propertyKeys.all });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(propertiesChannel);
      supabase.removeChannel(tenantRequestsChannel);
    };
  }, [userId, queryClient]);
}
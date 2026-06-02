import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { 
  notifyTenantContractSigned,
  notifyContractFullyExecuted
} from '@/utils/notificationService';

interface UseLeaseRenewalContractNotificationsProps {
  userId: string;
  userType?: 'landlord' | 'tenant';
}

export const useLeaseRenewalContractNotifications = ({ 
  userId,
  userType = 'landlord'
}: UseLeaseRenewalContractNotificationsProps) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!userId || userType !== 'landlord') return;

    console.log('🔔 [Contract Notifications] Setting up subscription for landlord:', userId);

    // Subscribe to lease renewal contract updates
    const channel = supabase
      .channel('lease-renewal-contract-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'lease_renewal_contracts'
        },
        async (payload) => {
          console.log('📝 Contract update detected:', payload);
          
          const newContract = payload.new as any;
          const oldContract = payload.old as any;

          // Check if this is a tenant signature event
          if (newContract.tenant_signed_at && !oldContract.tenant_signed_at) {
            // Fetch the lease renewal to get property and tenant info
            const { data: renewalData, error: renewalError } = await supabase
              .from('lease_renewals')
              .select(`
                id,
                property_id,
                tenant_id,
                properties (
                  address,
                  landlord_id
                ),
                profiles:tenant_id (
                  full_name
                )
              `)
              .eq('id', newContract.lease_renewal_id)
              .single();

            if (renewalError) {
              console.error('Error fetching renewal data:', renewalError);
              return;
            }

            // Only notify if this is for the current landlord's property
            const landlordId = (renewalData?.properties as any)?.landlord_id;
            if (landlordId !== userId) return;

            const tenantName = (renewalData?.profiles as any)?.full_name || 'Tenant';
            const propertyAddress = (renewalData?.properties as any)?.address || 'Property';

            // Show toast notification
            notifyTenantContractSigned(tenantName, propertyAddress);

            // Create notification in database
            try {
              await supabase
                .from('notifications')
                .insert({
                  user_id: userId,
                  title: 'Lease Contract Signed',
                  description: `${tenantName} has signed the lease renewal contract for ${propertyAddress}`,
                  type: 'lease_renewal_contract_signed',
                  link: `/dashboard?tab=Lease%20Expirations&subTab=renewals&portfolioId=everything`,
                  data: {
                    renewal_id: renewalData.id,
                    property_id: renewalData.property_id,
                    tenant_id: renewalData.tenant_id,
                    property_address: propertyAddress,
                    tenant_name: tenantName
                  }
                });

              console.log('✅ Contract signature notification created');
            } catch (notificationError) {
              console.error('Error creating notification:', notificationError);
            }

            // Check if contract is now fully executed
            if (newContract.contract_status === 'completed') {
              notifyContractFullyExecuted(propertyAddress);
            }

            // Invalidate relevant queries
            queryClient.invalidateQueries({ queryKey: ['lease-renewals'] });
            queryClient.invalidateQueries({ queryKey: ['lease-renewal-contracts'] });
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, userType, queryClient]);
};

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface SendLeaseParams {
  applicationId: string;
  leaseMethod: 'uploaded' | 'openkey';
  leaseDocumentId?: string;
  unitId?: string;
  landlordSignature?: string;
  leaseStartDate?: string;
  leaseEndDate?: string;
}

export interface SendLeaseResponse {
  success: boolean;
  application_id: string;
  lease_method: string;
  stripe_fee_amount: number;
  stripe_session_id: string | null;
  stripe_link: string | null;
  message_sent: boolean;
}

export const useSendLease = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: SendLeaseParams) => {
      const { data, error } = await supabase.rpc('landlord_send_lease', {
        p_application_id: params.applicationId,
        p_lease_method: params.leaseMethod,
        p_lease_document_id: params.leaseDocumentId || null,
        p_unit_id: params.unitId || null,
        p_landlord_signature: params.landlordSignature || null,
        p_lease_start_date: params.leaseStartDate || null,
        p_lease_end_date: params.leaseEndDate || null,
      });

      if (error) throw error;
      return data as unknown as SendLeaseResponse;
    },
    onSuccess: async (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['marketplace-applications'] });
      queryClient.invalidateQueries({ queryKey: ['property-applications'] });
      queryClient.invalidateQueries({ queryKey: ['landlord-placement-fees'] });
      queryClient.invalidateQueries({ queryKey: ['tenant-pipeline'] });
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      queryClient.invalidateQueries({ queryKey: ['property-units'] });
      
      // If landlord uploaded an already-signed lease, trigger payment immediately
      if (variables.leaseMethod === 'uploaded') {
        try {
          // Fetch application with property info to get landlord and tenant IDs
          const { data: application, error: appError } = await supabase
            .from('marketplace_applications')
            .select(`
              user_id,
              properties (
                owner_id
              )
            `)
            .eq('id', variables.applicationId)
            .single();

          if (appError) throw appError;

          const tenantId = application.user_id;
          const landlordId = application.properties?.owner_id;

          if (!tenantId || !landlordId) {
            throw new Error('Missing tenant or landlord ID');
          }

          // Update application to lease_signed status
          await supabase
            .from('marketplace_applications')
            .update({
              status: 'lease_signed',
              tenant_signed_at: new Date().toISOString(),
            })
            .eq('id', variables.applicationId);

          // Update unit pipeline stage
          if (variables.unitId) {
            await supabase
              .from('property_units')
              .update({
                pipeline_stage: 'filled_awaiting_payment',
                current_tenant_id: tenantId,
                updated_at: new Date().toISOString(),
              })
              .eq('id', variables.unitId);
          }

          // Update tenant's housing_status to 'approved' for lease_signed stage
          await supabase
            .from('profiles')
            .update({
              housing_status: 'approved',
              updated_at: new Date().toISOString(),
            })
            .eq('id', tenantId);

          // Get public URL for lease document and send to tenant
          if (variables.leaseDocumentId) {
            const { data: { publicUrl } } = supabase.storage
              .from('property-documents')
              .getPublicUrl(variables.leaseDocumentId);

            await supabase.from('messages').insert({
              sender_id: landlordId,
              marketplace_application_id: variables.applicationId,
              message_text: '📝 Your lease has been signed and executed! You can download your signed copy below.',
              topic: 'Lease Signed',
              extension: 'lease_signed',
              payload: {
                lease_document_id: variables.leaseDocumentId,
                lease_method: 'uploaded',
                attachment_url: publicUrl,
                attachment_name: 'Signed Lease Agreement.pdf',
              },
              created_by_tenant: false,
              read_by_tenant: false,
              read_by_landlord: false,
            });

            // Create document record in property_unit_documents for the unit
            if (variables.unitId) {
              await supabase.from('property_unit_documents').insert({
                unit_id: variables.unitId,
                uploaded_by: landlordId,
                file_name: 'Signed Lease Agreement.pdf',
                document_type: 'Lease Agreement',
                file_path: variables.leaseDocumentId,
              });
            }
          }

          // Trigger payment link
          await supabase.functions.invoke('process-lease-signed-payment', {
            body: { applicationId: variables.applicationId },
          });

          toast.success('Signed lease uploaded successfully!');
        } catch (error) {
          console.error('Failed to process uploaded lease:', error);
          toast.success('Lease uploaded, but payment notification may not have been sent');
        }
      } else {
        toast.success('Lease sent successfully!');
      }
    },
    onError: (error: Error) => {
      console.error('Error sending lease:', error);
      toast.error(error.message || 'Failed to send lease');
    },
  });
};

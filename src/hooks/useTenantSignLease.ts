import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { generateLeasePDFBlob, LeasePDFData } from '@/utils/leasePDFGenerator';

export interface TenantSignLeaseParams {
  applicationId: string;
  tenantSignature: string;
}

export interface TenantSignLeaseResponse {
  success: boolean;
  application_id: string;
  message_id: string;
  message: string;
  source_type: 'marketplace' | 'property' | 'push';
}

export const useTenantSignLease = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: TenantSignLeaseParams) => {
      const { data, error } = await supabase.rpc('tenant_sign_marketplace_lease', {
        p_application_id: params.applicationId,
        p_tenant_signature: params.tenantSignature,
      });

      if (error) throw error;
      return data as unknown as TenantSignLeaseResponse;
    },
    onSuccess: async (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['entity-pipeline-v2'] });
      queryClient.invalidateQueries({ queryKey: ['entity-stage-details'] });
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      queryClient.invalidateQueries({ queryKey: ['marketplace-applications'] });
      queryClient.invalidateQueries({ queryKey: ['property-applications'] });
      queryClient.invalidateQueries({ queryKey: ['tenant-pipeline'] });
      
      toast.success('Lease signed successfully! The landlord has been notified.');

      // Generate and store signed lease PDF
      try {
        console.log('[TenantSignLease] Fetching application data for PDF generation:', variables.applicationId, 'source:', data.source_type);
        
        let appData: any = null;
        let appError: any = null;
        
        // Fetch from the correct table based on source_type
        if (data.source_type === 'marketplace') {
          const result = await supabase
            .from('marketplace_applications')
            .select(`
              *,
              property:properties(id, address, city, state, zipcode, owner_id),
              unit:property_units(id, unit_name, unit_number, monthly_rent)
            `)
            .eq('id', variables.applicationId)
            .single();
          appData = result.data;
          appError = result.error;
        } else if (data.source_type === 'property') {
          const result = await supabase
            .from('property_applications')
            .select(`
              *,
              property:properties(id, address, city, state, zipcode, owner_id),
              unit:property_units(id, unit_name, unit_number, monthly_rent)
            `)
            .eq('id', variables.applicationId)
            .single();
          appData = result.data;
          appError = result.error;
        } else if (data.source_type === 'push') {
          const result = await supabase
            .from('property_pushes')
            .select(`
              *,
              property:properties(id, address, city, state, zipcode, owner_id),
              unit:property_units(id, unit_name, unit_number, monthly_rent)
            `)
            .eq('id', variables.applicationId)
            .single();
          appData = result.data;
          appError = result.error;
        }

        if (appError || !appData) {
          console.error('[TenantSignLease] Failed to fetch application data:', appError);
        } else if (appData.unit?.id) {
          const fullAddress = [
            appData.property?.address,
            appData.property?.city,
            appData.property?.state,
            appData.property?.zipcode
          ].filter(Boolean).join(', ');

          const pdfData: LeasePDFData = {
            tenantName: appData.tenant_signature_name || 'Tenant',
            propertyAddress: fullAddress,
            unitNumber: appData.unit?.unit_name || appData.unit?.unit_number || undefined,
            monthlyRent: appData.unit?.monthly_rent || 0,
            leaseStartDate: appData.lease_start_date,
            leaseEndDate: appData.lease_end_date,
            landlordSignature: appData.landlord_signature_name,
            landlordSignedAt: appData.landlord_signed_at,
            tenantSignature: variables.tenantSignature,
            tenantSignedAt: new Date().toISOString(),
          };

          console.log('[TenantSignLease] Generating PDF blob...');
          const pdfBlob = generateLeasePDFBlob(pdfData);
          
          const filePath = `${appData.property?.id}/leases/${Date.now()}-signed-lease.pdf`;
          
          console.log('[TenantSignLease] Uploading PDF to storage:', filePath);
          const { error: uploadError } = await supabase.storage
            .from('property-documents')
            .upload(filePath, pdfBlob, {
              contentType: 'application/pdf',
              upsert: false
            });

          if (uploadError) {
            console.error('[TenantSignLease] Failed to upload PDF:', uploadError);
          } else {
            console.log('[TenantSignLease] Creating document record...');
            const { error: docError } = await supabase.from('property_unit_documents').insert({
              unit_id: appData.unit.id,
              uploaded_by: appData.property?.owner_id,
              file_name: 'Signed Lease Agreement.pdf',
              document_type: 'Lease Agreement',
              file_path: filePath,
            });

            if (docError) {
              console.error('[TenantSignLease] Failed to create document record:', docError);
            } else {
              console.log('[TenantSignLease] Lease PDF stored successfully');
            }
          }
        }
      } catch (pdfError) {
        console.error('[TenantSignLease] Error generating/storing lease PDF:', pdfError);
      }

      // Process payment notification to landlord
      console.log('[TenantSignLease] Calling process-lease-signed-payment for:', variables.applicationId);
      
      try {
        const { data: result, error: processError } = await supabase.functions.invoke(
          'process-lease-signed-payment',
          {
            body: { applicationId: variables.applicationId },
          }
        );

        if (processError) {
          console.error('[TenantSignLease] Error from process-lease-signed-payment:', processError);
          toast.error('Lease signed, but landlord notification may have failed. Please contact support.');
        } else {
          console.log('[TenantSignLease] process-lease-signed-payment success:', result);
        }
      } catch (error) {
        console.error('[TenantSignLease] Exception calling process-lease-signed-payment:', error);
        toast.error('Lease signed, but landlord notification may have failed. Please contact support.');
      }
    },
    onError: (error: Error) => {
      console.error('Error signing lease:', error);
      toast.error(error.message || 'Failed to sign lease');
    },
  });
};

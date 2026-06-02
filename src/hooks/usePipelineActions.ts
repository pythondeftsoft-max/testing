import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const usePipelineActions = () => {
  const queryClient = useQueryClient();

  const matchTenantToUnit = useMutation({
    mutationFn: async ({ 
      tenantId, 
      unitId,
      leaseStartDate,
      leaseEndDate,
      monthlyRent,
      securityDeposit,
      notes
    }: { 
      tenantId: string; 
      unitId: string;
      leaseStartDate?: string;
      leaseEndDate?: string;
      monthlyRent?: number;
      securityDeposit?: number;
      notes?: string;
    }) => {
      const now = new Date().toISOString();

      // Create unit application with approved status and lease_signed_date
      const { data: application, error: appError } = await supabase
        .from('unit_applications')
        .insert({
          tenant_id: tenantId,
          unit_id: unitId,
          status: 'approved',
          priority_payment_made: false,
          lease_signed_date: now,
          application_notes: notes || null
        })
        .select()
        .single();

      if (appError) throw appError;

      // Get current user for tracking
      const { data: { user } } = await supabase.auth.getUser();

      // Update tenant housing status to approved (moves to Lease Signed)
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ 
          housing_status: 'approved',
          pipeline_stage: 'approved_awaiting',
          updated_by: user?.id
        })
        .eq('id', tenantId);

      if (profileError) throw profileError;

      // Update property unit - Move to Lease Signed & Take Off Market
      const unitUpdate: any = {
        lease_signed_date: now, // Moves property to "Lease Signed" stage
        on_market: false, // Takes property off market
        status: 'occupied', // Mark as occupied
        tenant_id: tenantId, // Link tenant to unit
        pipeline_stage: 'lease_signed', // Triggers tracking
        lease_start_date: leaseStartDate || null,
        lease_end_date: leaseEndDate || null,
        security_deposit: securityDeposit || null,
      };

      // Only update monthly_rent if provided
      if (monthlyRent !== undefined) {
        unitUpdate.monthly_rent = monthlyRent;
      }

      const { error: unitError } = await supabase
        .from('property_units')
        .update(unitUpdate)
        .eq('id', unitId);

      if (unitError) throw unitError;

      return application;
    },
    onSuccess: async () => {
      // Force immediate refetch for instant UI updates
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ['entity-pipeline-v2'] }),
        queryClient.refetchQueries({ queryKey: ['worker-pipeline'] }),
        queryClient.refetchQueries({ queryKey: ['entity-stage-details'] }),
        queryClient.refetchQueries({ queryKey: ['available-units-for-matching'] }),
        queryClient.refetchQueries({ queryKey: ['property-units'] }),
        queryClient.refetchQueries({ queryKey: ['all-matches'] }),
        queryClient.refetchQueries({ queryKey: ['matchmaker-stats'] }),
      ]);
      toast.success('Lease signed - Both tenant and property moved to Lease Signed stage');
    },
    onError: (error: any) => {
      console.error('Match tenant error:', error);
      toast.error(`Failed to match tenant: ${error.message}`);
    }
  });

  const markAsPaid = useMutation({
    mutationFn: async ({ 
      entityType,
      entityId,
      paymentAmount,
      paymentMethod,
      paymentNotes,
      stripePaymentIntentId,
      plaidTransactionId,
      applicationId
    }: { 
      entityType: 'tenant' | 'property';
      entityId: string;
      paymentAmount?: number;
      paymentMethod?: 'stripe' | 'plaid' | 'cash' | 'check' | 'wire' | 'other';
      paymentNotes?: string;
      stripePaymentIntentId?: string;
      plaidTransactionId?: string;
      applicationId?: string;
    }) => {
      const now = new Date().toISOString();
      const { data: { user } } = await supabase.auth.getUser();

      // Update based on entity type
      if (entityType === 'tenant') {
        // Update tenant housing status
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ 
            housing_status: 'housed',
            pipeline_stage: 'housed_paid',
            updated_by: user?.id
          })
          .eq('id', entityId);

        if (profileError) throw profileError;
      } else {
        // Update property to paid_housed stage
        const { error: propertyError } = await supabase
          .from('property_units')
          .update({
            pipeline_stage: 'paid_housed'
          })
          .eq('id', entityId);

        if (propertyError) throw propertyError;
      }

      // Update unit_applications with payment details
      const applicationUpdate: any = {
        priority_payment_made: true,
        payment_received_date: now,
        payment_method: paymentMethod || null,
        payment_notes: paymentNotes || null,
      };

      if (stripePaymentIntentId) {
        applicationUpdate.stripe_payment_intent_id = stripePaymentIntentId;
      }

      if (plaidTransactionId) {
        applicationUpdate.plaid_transaction_id = plaidTransactionId;
      }

      if (applicationId) {
        const { error: appError } = await supabase
          .from('unit_applications')
          .update(applicationUpdate)
          .eq('id', applicationId);

        if (appError) throw appError;
      } else {
        // Fallback: update by tenant_id if no applicationId
        const { error: appError } = await supabase
          .from('unit_applications')
          .update(applicationUpdate)
          .eq('tenant_id', entityType === 'tenant' ? entityId : null)
          .eq('status', 'approved')
          .order('created_at', { ascending: false })
          .limit(1);

        if (appError) throw appError;
      }

      // Get application details for platform_transactions
      let application;
      if (applicationId) {
        const { data } = await supabase
          .from('unit_applications')
          .select('*, property_units(*, profiles(*))')
          .eq('id', applicationId)
          .single();
        application = data;
      }

      // Create platform_transactions record
      if (application && paymentAmount) {
        const transactionData: any = {
          gross_amount: paymentAmount,
          platform_fee: 0, // No platform fee for placement fees
          property_id: application.unit_id,
          tenant_id: application.tenant_id,
          stripe_payment_intent_id: stripePaymentIntentId || null,
        };
        
        // TypeScript workaround for optional transaction_type field
        if (true) transactionData.transaction_type = 'placement_fee';

        const { error: txError } = await supabase
          .from('platform_transactions')
          .insert(transactionData);

        if (txError) {
          console.error('Error creating platform transaction:', txError);
        }
      }

      // Award points (2 points) to property worker ONLY
      // Find the property worker
      if (application) {
        const { data: propertyUnit } = await supabase
          .from('property_units')
          .select('assigned_worker_id')
          .eq('id', application.unit_id)
          .single();

        if (propertyUnit?.assigned_worker_id) {
          // Record points in matchmaker_actions
          const { error: pointsError } = await supabase
            .from('matchmaker_actions')
            .insert({
              worker_id: propertyUnit.assigned_worker_id,
              action_type: 'placement_fee_received',
              entity_type: 'property',
              entity_id: application.unit_id,
              points_earned: 2,
              metadata: {
                tenant_id: application.tenant_id,
                property_id: application.unit_id,
                payment_amount: paymentAmount,
                payment_method: paymentMethod,
              },
            });

          if (pointsError) {
            console.error('Error recording points:', pointsError);
          }
        }
      }
    },
    onSuccess: async () => {
      // Force immediate refetch for instant UI updates
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ['entity-pipeline-v2'] }),
        queryClient.refetchQueries({ queryKey: ['worker-pipeline'] }),
        queryClient.refetchQueries({ queryKey: ['entity-stage-details'] }),
        queryClient.refetchQueries({ queryKey: ['all-matches'] }),
        queryClient.refetchQueries({ queryKey: ['matchmaker-stats'] }),
      ]);
      toast.success('Payment confirmed - tenant marked as Paid / Housed');
    },
    onError: (error: any) => {
      console.error('Mark as paid error:', error);
      toast.error(`Failed to mark as paid: ${error.message}`);
    }
  });

  return {
    matchTenantToUnit,
    markAsPaid
  };
};

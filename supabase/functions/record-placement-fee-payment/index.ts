import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PlacementFeePaymentRequest {
  applicationId?: string; // Optional for property-based payments
  unitId: string;
  tenantId: string;
  propertyId: string;
  feeAmount: number;
  paymentDate: string;
  paymentMethod: 'stripe' | 'plaid' | 'wire' | 'other';
  bankAccountId?: string;
  plaidTransactionId?: string;
  transactionReference?: string;
  transactionAmount?: number;
  bankName?: string;
  notes?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { 
      applicationId,
      unitId,
      tenantId,
      propertyId,
      feeAmount,
      paymentDate,
      paymentMethod,
      bankAccountId,
      plaidTransactionId,
      transactionReference,
      transactionAmount,
      bankName,
      notes
    }: PlacementFeePaymentRequest = await req.json();

    console.log('🔄 [PLACEMENT FEE] Processing placement fee payment:', { 
      applicationId,
      unitId,
      tenantId,
      feeAmount,
      paymentMethod
    });

    // Validation - applicationId is optional for property-based Plaid payments
    if (!unitId || !tenantId || !propertyId || !feeAmount || !paymentDate || !paymentMethod) {
      throw new Error('Missing required fields');
    }

    if (feeAmount <= 0 || feeAmount > 50000) {
      throw new Error('Fee amount must be between $0 and $50,000');
    }

    // Verify application exists (if applicationId provided)
    let application = null;
    let workerId = null;
    let applicationType: 'unit' | 'marketplace' | null = null;
    
    if (applicationId) {
      // First try unit_applications
      const { data: unitApp } = await supabaseClient
        .from('unit_applications')
        .select('*, property_units(property_id, assigned_worker_id)')
        .eq('id', applicationId)
        .eq('tenant_id', tenantId)
        .eq('unit_id', unitId)
        .maybeSingle();

      if (unitApp) {
        application = unitApp;
        applicationType = 'unit';
        workerId = application.property_units?.assigned_worker_id;
        console.log('✅ [PLACEMENT FEE] Found unit_application:', applicationId);
      } else {
        // Try marketplace_applications (uses user_id instead of tenant_id)
        const { data: marketplaceApp } = await supabaseClient
          .from('marketplace_applications')
          .select('*, property_units(property_id, assigned_worker_id)')
          .eq('id', applicationId)
          .eq('user_id', tenantId)
          .eq('unit_id', unitId)
          .maybeSingle();

        if (marketplaceApp) {
          application = marketplaceApp;
          applicationType = 'marketplace';
          workerId = marketplaceApp.property_units?.assigned_worker_id;
          console.log('✅ [PLACEMENT FEE] Found marketplace_application:', applicationId);
        } else {
          console.log('⚠️ [PLACEMENT FEE] Application not found in either table, continuing without application');
        }
      }
    }
    
    // If no application or worker, get worker from property_units directly
    if (!workerId) {
      const { data: unit } = await supabaseClient
        .from('property_units')
        .select('assigned_worker_id')
        .eq('id', unitId)
        .single();
      workerId = unit?.assigned_worker_id;
    }

    const { data: { user } } = await supabaseClient.auth.getUser();
    const now = new Date().toISOString();

    // Update or create landlord_placement_fees record
    const { data: existingFee } = await supabaseClient
      .from('landlord_placement_fees')
      .select('id')
      .eq('unit_id', unitId)
      .eq('tenant_id', tenantId)
      .maybeSingle();

    const feeData: any = {
      payment_status: 'paid',
      payment_date: paymentDate,
      payment_method: paymentMethod,
      fee_amount: feeAmount,
      notes: notes || null,
      linked_by_user_id: user?.id,
      linked_at: now,
    };

    // Add bank transaction details if provided
    if (paymentMethod === 'plaid' && bankAccountId) {
      // Note: bank_account_id column doesn't exist in landlord_placement_fees
      // Bank info is tracked via bank_name and plaid_transaction_id
      feeData.bank_transaction_reference = transactionReference || null;
      feeData.bank_transaction_date = paymentDate;
      feeData.bank_transaction_amount = transactionAmount || feeAmount;
      feeData.bank_name = bankName || null;
      
      // If a Plaid transaction was selected, store its ID
      if (plaidTransactionId) {
        feeData.plaid_transaction_id = plaidTransactionId;
      }
    }

    let placementFeeId;
    if (existingFee) {
      // Update existing record
      const { data: updatedFee, error: updateError } = await supabaseClient
        .from('landlord_placement_fees')
        .update(feeData)
        .eq('id', existingFee.id)
        .select()
        .single();

      if (updateError) throw updateError;
      placementFeeId = updatedFee.id;
      console.log('✅ [PLACEMENT FEE] Updated existing fee record:', placementFeeId);
    } else {
      // Create new record
      feeData.unit_id = unitId;
      feeData.tenant_id = tenantId;
      feeData.property_id = propertyId;

      const { data: newFee, error: insertError } = await supabaseClient
        .from('landlord_placement_fees')
        .insert(feeData)
        .select()
        .single();

      if (insertError) throw insertError;
      placementFeeId = newFee.id;
      console.log('✅ [PLACEMENT FEE] Created new fee record:', placementFeeId);
    }

    // Update application with payment details (if application exists)
    if (applicationId && applicationType === 'unit') {
      const { error: appUpdateError } = await supabaseClient
        .from('unit_applications')
        .update({
          priority_payment_made: true,
          payment_received_date: now,
          payment_method: paymentMethod,
          payment_notes: notes || null,
        })
        .eq('id', applicationId);

      if (appUpdateError) throw appUpdateError;
      console.log('✅ [PLACEMENT FEE] Updated unit_application record');
    } else if (applicationId && applicationType === 'marketplace') {
      // marketplace_applications don't have these specific fields, already updated below
      console.log('✅ [PLACEMENT FEE] Marketplace application will be updated in bulk update below');
    } else if (!applicationId && tenantId && unitId) {
      // Fallback: stamp any matching unit_applications row by (tenant_id, unit_id)
      const { error: uaFallbackError } = await supabaseClient
        .from('unit_applications')
        .update({
          priority_payment_made: true,
          payment_received_date: now,
          lease_signed_date: now,
          payment_method: paymentMethod,
          payment_notes: notes || 'Stamped via record-placement-fee-payment (no applicationId)',
        })
        .eq('tenant_id', tenantId)
        .eq('unit_id', unitId)
        .is('payment_received_date', null);
      if (uaFallbackError) {
        console.error('Failed to stamp unit_applications (non-blocking):', uaFallbackError);
      } else {
        console.log('✅ [PLACEMENT FEE] Stamped unit_applications by (tenant_id, unit_id)');
      }
    }

    // Move tenant to housed_paid stage
    const { error: tenantUpdateError } = await supabaseClient
      .from('profiles')
      .update({
        housing_status: 'housed',
        pipeline_stage: 'housed_paid',
        updated_by: user?.id,
      })
      .eq('id', tenantId);

    if (tenantUpdateError) throw tenantUpdateError;

    // Move property unit to paid_housed stage with full status update
    const { error: unitUpdateError } = await supabaseClient
      .from('property_units')
      .update({
        pipeline_stage: 'paid_housed',
        status: 'occupied',
        on_market: false,
        tenant_id: tenantId,
        current_tenant_id: tenantId,
      })
      .eq('id', unitId);

    if (unitUpdateError) throw unitUpdateError;

    // Check if all units for this property are now off-market
    const { data: remainingOnMarketUnits, error: unitsCheckError } = await supabaseClient
      .from('property_units')
      .select('id')
      .eq('property_id', propertyId)
      .eq('on_market', true)
      .neq('id', unitId);  // Exclude the unit we just updated

    if (unitsCheckError) {
      console.error('Error checking remaining units:', unitsCheckError);
    }

    // Only set property off-market if NO other units are still on market
    const allUnitsOffMarket = !remainingOnMarketUnits || remainingOnMarketUnits.length === 0;

    console.log(`Property ${propertyId}: ${remainingOnMarketUnits?.length || 0} units still on market. Setting on_market to ${!allUnitsOffMarket}`);

    // Update parent property status to occupied
    const { error: propertyUpdateError } = await supabaseClient
      .from('properties')
      .update({
        status: 'occupied',
        on_market: !allUnitsOffMarket, // Keep on_market true if other units still available
      })
      .eq('id', propertyId);

    if (propertyUpdateError) {
      console.error('Error updating property status:', propertyUpdateError);
    }

    // Update marketplace_applications to housed status
    const { error: marketplaceAppError } = await supabaseClient
      .from('marketplace_applications')
      .update({
        status: 'housed',
        lifecycle_stage: 'current_tenant',
        became_tenant_at: now,
        is_primary_applicant: false, // Clear primary flag when housed
      })
      .eq('unit_id', unitId)
      .eq('user_id', tenantId);

    if (marketplaceAppError) {
      console.error('Error updating marketplace application:', marketplaceAppError);
    }

    // Update property_applications to housed status
    const { error: propertyAppError } = await supabaseClient
      .from('property_applications')
      .update({
        status: 'housed',
        housing_status: 'housed_and_paid',
      })
      .eq('property_id', propertyId)
      .eq('tenant_id', tenantId);

    if (propertyAppError) {
      console.error('Error updating property application:', propertyAppError);
    }

    // Withdraw tenant's other applications
    const { error: withdrawError } = await supabaseClient
      .from('marketplace_applications')
      .update({
        status: 'withdrawn',
        lifecycle_stage: 'withdrawn',
      })
      .eq('user_id', tenantId)
      .neq('unit_id', unitId)
      .in('status', ['submitted', 'under_review', 'approved', 'lease_signing']);

    if (withdrawError) {
      console.error('Error withdrawing other applications:', withdrawError);
    }

    // If a Plaid transaction was linked, mark it as matched
    if (plaidTransactionId) {
      const { error: transactionLinkError } = await supabaseClient
        .from('plaid_admin_transactions')
        .update({
          linked_fee_id: placementFeeId,
          matched_at: now,
          matched_by_user_id: user?.id,
        })
        .eq('id', plaidTransactionId);

      if (transactionLinkError) {
        console.error('Error linking Plaid transaction:', transactionLinkError);
      } else {
        console.log('✅ [PLACEMENT FEE] Linked Plaid transaction:', plaidTransactionId);
      }
    }

    // Award 2 points to property worker (workerId already fetched above)
    if (workerId) {
      const { error: pointsError } = await supabaseClient
        .from('matchmaker_actions')
        .insert({
          worker_id: workerId,
          action_type: 'placement_fee_received',
          entity_type: 'property',
          entity_id: unitId,
          points_earned: 2,
          metadata: {
            tenant_id: tenantId,
            property_id: propertyId,
            payment_amount: feeAmount,
            payment_method: paymentMethod,
            bank_account_id: bankAccountId || null,
          },
        });

      if (pointsError) {
        console.error('Error recording points:', pointsError);
      } else {
        console.log('✅ [PLACEMENT FEE] Awarded 2 points to worker:', workerId);
      }
    }

    console.log('✅ [PLACEMENT FEE] Payment recorded successfully');

    return new Response(
      JSON.stringify({ 
        success: true, 
        placementFeeId,
        message: 'Placement fee payment recorded successfully' 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ [PLACEMENT FEE] Error:', error);
    return new Response(
      JSON.stringify({ error: (error instanceof Error ? error.message : String(error)) }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MonthCovered {
  month: string;
  year: number;
}

interface ManualPaymentRequest {
  landlordId: string;
  propertyId: string;
  tenantId: string;
  paymentType: 'tenant_rent' | 'hap_voucher';
  amount: number;
  paymentDate: string;
  paymentSource: string;
  monthsCovered: MonthCovered[];
  referenceNumber?: string;
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
      landlordId, 
      propertyId, 
      tenantId, 
      paymentType, 
      amount, 
      paymentDate, 
      paymentSource, 
      monthsCovered, 
      referenceNumber, 
      notes 
    }: ManualPaymentRequest = await req.json();

    console.log('🔄 [MANUAL PAYMENT] Processing manual payment:', { 
      landlordId, 
      propertyId, 
      tenantId, 
      paymentType, 
      amount 
    });

    // Validation
    if (!landlordId || !propertyId || !tenantId || !paymentType || !amount || !paymentDate || !monthsCovered || monthsCovered.length === 0) {
      throw new Error('Missing required fields');
    }

    if (amount <= 0 || amount > 50000) {
      throw new Error('Amount must be between $0 and $50,000');
    }

    // Verify landlord owns the property
    const { data: property, error: propertyError } = await supabaseClient
      .from('properties')
      .select('id, owner_id')
      .eq('id', propertyId)
      .eq('owner_id', landlordId)
      .single();

    if (propertyError || !property) {
      throw new Error('Property not found or unauthorized');
    }

    // Verify tenant is associated with property
    const { data: unit, error: unitError } = await supabaseClient
      .from('property_units')
      .select('id, tenant_id')
      .eq('property_id', propertyId)
      .eq('tenant_id', tenantId)
      .maybeSingle();

    if (unitError) {
      console.error('Error checking tenant association:', unitError);
    }

    // Format months covered for notes
    const monthsText = monthsCovered
      .sort((a, b) => {
        if (a.year !== b.year) return a.year - b.year;
        return parseInt(a.month) - parseInt(b.month);
      })
      .map(m => {
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return `${monthNames[parseInt(m.month) - 1]} ${m.year}`;
      })
      .join(', ');

    const fullNotes = `Months covered: ${monthsText}${notes ? `\n${notes}` : ''}`;

    // Insert based on payment type
    if (paymentType === 'tenant_rent') {
      // Check for duplicate
      const { data: existing } = await supabaseClient
        .from('rent_payments')
        .select('id')
        .eq('property_id', propertyId)
        .eq('tenant_id', tenantId)
        .eq('amount', amount)
        .eq('payment_date', paymentDate)
        .maybeSingle();

      if (existing) {
        throw new Error('A payment with these exact details already exists');
      }

      const { data: payment, error: insertError } = await supabaseClient
        .from('rent_payments')
        .insert({
          property_id: propertyId,
          tenant_id: tenantId,
          unit_id: unit?.id,
          amount,
          payment_date: paymentDate,
          payment_method: 'manual',
          payment_source: paymentSource,
          payment_type: 'rent',
          status: 'completed',
          reference_number: referenceNumber,
          notes: fullNotes,
          recorded_by: landlordId,
        })
        .select()
        .single();

      if (insertError) {
        console.error('Error inserting rent payment:', insertError);
        throw insertError;
      }

      console.log('✅ [MANUAL PAYMENT] Rent payment recorded:', payment.id);

      return new Response(
        JSON.stringify({ 
          success: true, 
          paymentId: payment.id, 
          message: 'Rent payment recorded successfully' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else if (paymentType === 'hap_voucher') {
      // Check for duplicate
      const { data: existing } = await supabaseClient
        .from('hap_payments')
        .select('id')
        .eq('property_id', propertyId)
        .eq('tenant_id', tenantId)
        .eq('actual_amount', amount)
        .eq('payment_date', paymentDate)
        .maybeSingle();

      if (existing) {
        throw new Error('A payment with these exact details already exists');
      }

      // Calculate payment period from months covered
      const sortedMonths = monthsCovered.sort((a, b) => {
        if (a.year !== b.year) return a.year - b.year;
        return parseInt(a.month) - parseInt(b.month);
      });

      const firstMonth = sortedMonths[0];
      const lastMonth = sortedMonths[sortedMonths.length - 1];

      const periodStart = `${firstMonth.year}-${firstMonth.month.padStart(2, '0')}-01`;
      const periodEnd = `${lastMonth.year}-${lastMonth.month.padStart(2, '0')}-01`;

      const { data: payment, error: insertError } = await supabaseClient
        .from('hap_payments')
        .insert({
          property_id: propertyId,
          tenant_id: tenantId,
          unit_id: unit?.id,
          expected_amount: amount,
          actual_amount: amount,
          payment_date: paymentDate,
          payment_period_start: periodStart,
          payment_period_end: periodEnd,
          payment_method: 'manual',
          payment_status: 'received',
          pha_voucher_number: referenceNumber,
          notes: fullNotes,
          recorded_by: landlordId,
          is_verified: true,
          verified_at: new Date().toISOString(),
          verified_by: landlordId,
        })
        .select()
        .single();

      if (insertError) {
        console.error('Error inserting HAP payment:', insertError);
        throw insertError;
      }

      console.log('✅ [MANUAL PAYMENT] HAP payment recorded:', payment.id);

      return new Response(
        JSON.stringify({ 
          success: true, 
          paymentId: payment.id, 
          message: 'HAP payment recorded successfully' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    throw new Error('Invalid payment type');

  } catch (error) {
    console.error('❌ [MANUAL PAYMENT] Error:', error);
    return new Response(
      JSON.stringify({ error: (error instanceof Error ? error.message : String(error)) }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

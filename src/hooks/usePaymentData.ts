
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const usePaymentData = (propertyId: string, tenantId?: string) => {
  // Check if we're in demo mode (non-UUID IDs)
  const isDemoMode = propertyId === 'demo-property-id' || (tenantId && tenantId === 'demo-tenant-id');
  // Only run queries if we have valid propertyId (tenantId is optional)
  const hasValidIds = Boolean(propertyId && propertyId !== '' && !isDemoMode);

  // Fetch HAP payments data
  const hapPaymentsQuery = useQuery({
    queryKey: ['hap-payments', propertyId, tenantId],
    queryFn: async () => {
      // Return empty array for demo mode
      if (isDemoMode || !hasValidIds) return [];
      
      let query = supabase
        .from('hap_payments')
        .select(`
          *,
          hap_payee_configs(payee_name, payee_type)
        `)
        .eq('property_id', propertyId);
      
      // If tenantId is provided, filter by tenant
      if (tenantId) {
        query = query.eq('tenant_id', tenantId);
      }
      
      const { data, error } = await query.order('payment_period_start', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: true, // Always enabled, but returns empty array for demo mode
  });

  // Fetch payment history with status information
  const paymentHistoryQuery = useQuery({
    queryKey: ['payment-history', propertyId, tenantId],
    queryFn: async () => {
      // Return empty array for demo mode
      if (isDemoMode || !hasValidIds) return [];
      
      let query = supabase
        .from('rent_payments')
        .select(`
          *,
          properties!rent_payments_property_id_fkey(
            address
          )
        `)
        .eq('property_id', propertyId);
      
      // If tenantId is provided, filter by tenant
      if (tenantId) {
        query = query.eq('tenant_id', tenantId);
      }
      
      const { data, error } = await query.order('payment_date', { ascending: false });
      
      if (error) throw error;
      
      // Fetch card info for payments
      const paymentsWithCardInfo = await Promise.all(
        (data || []).map(async (payment) => {
          let cardData = null;
          
          // Try to get card from autopay_payment_method_id first
          if (payment.autopay_payment_method_id && payment.tenant_id) {
            const { data: autopayCard } = await supabase
              .from('payment_methods')
              .select('brand, last_four')
              .eq('stripe_payment_method_id', payment.autopay_payment_method_id)
              .eq('user_id', payment.tenant_id)
              .maybeSingle();
            
            cardData = autopayCard;
          }
          
          // If no autopay card found (pending payments), get default payment method
          if (!cardData && payment.tenant_id) {
            const { data: defaultCard } = await supabase
              .from('payment_methods')
              .select('brand, last_four')
              .eq('user_id', payment.tenant_id)
              .eq('is_default', true)
              .maybeSingle();
            
            cardData = defaultCard;
          }
          
          return { ...payment, card_info: cardData };
        })
      );
      
      return paymentsWithCardInfo || [];
    },
    enabled: true, // Always enabled, but returns empty array for demo mode
  });

  // Fetch current balance information
  const balanceQuery = useQuery({
    queryKey: ['current-balance', propertyId, tenantId],
    queryFn: async () => {
      // Return demo data immediately if in demo mode
      if (isDemoMode) {
        return {
          total_due: 1400,
          total_paid: 0,
          balance_remaining: 1400,
          total_late_fees: 0,
          current_due_date: new Date().toISOString().split('T')[0]
        };
      }
      
      if (!hasValidIds) return {
        total_due: 1400,
        total_paid: 0,
        balance_remaining: 1400,
        total_late_fees: 0,
        current_due_date: new Date().toISOString().split('T')[0]
      };
      
      // If no tenantId, use a default tenant for balance calculation
      const effectiveTenantId = tenantId || '00000000-0000-0000-0000-000000000000';
      
      const { data, error } = await supabase
        .rpc('calculate_current_balance', {
          p_property_id: propertyId,
          p_tenant_id: effectiveTenantId,
        });
      
      if (error) {
        console.log('Balance calculation error:', error);
        // Return default values for demo
        return {
          total_due: 1400,
          total_paid: 0,
          balance_remaining: 1400,
          total_late_fees: 0,
          current_due_date: new Date().toISOString().split('T')[0]
        };
      }
      return data?.[0] || {
        total_due: 1400,
        total_paid: 0,
        balance_remaining: 1400,
        total_late_fees: 0,
        current_due_date: new Date().toISOString().split('T')[0]
      };
    },
    enabled: true, // Always enabled, but returns demo data for demo mode
  });

  // Fetch property details for payment amount
  const propertyQuery = useQuery({
    queryKey: ['property-details', propertyId],
    queryFn: async () => {
      // Return demo data immediately if in demo mode
      if (isDemoMode || !hasValidIds) {
        return {
          monthly_rent: 1400,
          late_fee_amount: 25,
          late_fee_grace_days: 5,
          rent_due_day: 1,
          address: 'Demo Property Address'
        };
      }
      
      const { data, error } = await supabase
        .from('properties')
        .select('monthly_rent, late_fee_amount, late_fee_grace_days, rent_due_day, address')
        .eq('id', propertyId)
        .single();
      
      if (error) {
        console.log('Property fetch error:', error);
        // Return default values for demo
        return {
          monthly_rent: 1400,
          late_fee_amount: 25,
          late_fee_grace_days: 5,
          rent_due_day: 1,
          address: 'Demo Property Address'
        };
      }
      return data;
    },
    enabled: true, // Always enabled, but returns demo data for demo mode
  });

  // Fetch recurring charges to get the actual rent_due_day from start_date
  const recurringChargesQuery = useQuery({
    queryKey: ['recurring-charges-due-day', propertyId],
    queryFn: async () => {
      if (isDemoMode || !hasValidIds) return null;
      
      const { data, error } = await supabase
        .from('recurring_charges')
        .select('start_date, charge_type')
        .eq('property_id', propertyId)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (error || !data?.start_date) return null;
      
      // Extract the day of month from start_date (use UTC to avoid timezone shifts)
      const dueDay = new Date(data.start_date).getUTCDate();
      return { dueDay, startDate: data.start_date };
    },
    enabled: hasValidIds,
  });

  // Fetch rent splits data for HAP/tenant portion calculation
  const rentSplitsQuery = useQuery({
    queryKey: ['rent-splits', propertyId, tenantId],
    queryFn: async () => {
      // Return demo data for demo mode
      if (isDemoMode || !hasValidIds) {
        return {
          total_rent: 1400,
          pha_portion: 1050,
          tenant_portion: 350,
          voucher_type: 'Section 8'
        };
      }
      
      try {
        const { data, error } = await supabase.rpc('get_active_rent_split', {
          p_property_id: propertyId,
          p_tenant_id: tenantId || null
        });
        
        if (error) {
          console.log('Rent splits fetch error:', error);
          return null;
        }
        
        return data || null;
      } catch (error) {
        console.log('Rent splits fetch error:', error);
        return null;
      }
    },
    enabled: true, // Always enabled, now returns demo data for demo mode
  });

  // Create unified payment history combining HAP and tenant payments
  const unifiedPaymentHistory = React.useMemo(() => {
    const rentPayments = (paymentHistoryQuery.data || []).map(payment => ({
      ...payment,
      properties: Array.isArray(payment.properties) 
        ? payment.properties[0] 
        : payment.properties,
      payment_source: 'tenant',
      display_date: payment.payment_date || payment.due_date,
      display_amount: payment.amount,
      display_status: payment.status,
      display_method: payment.payment_method,
      days_late: payment.days_late || 0,
      late_fee_amount: payment.late_fee_amount || 0,
      card_brand: payment.card_info?.brand,
      card_last_four: payment.card_info?.last_four
    }));

    const hapPaymentsFormatted = (hapPaymentsQuery.data || []).map(payment => ({
      ...payment,
      payment_source: 'hap',
      display_date: payment.payment_date || payment.payment_period_start,
      display_amount: payment.actual_amount || payment.expected_amount,
      display_status: payment.payment_status,
      display_method: payment.payment_method,
      notes: payment.notes,
      days_late: 0, // HAP payments don't have days_late field
      late_fee_amount: 0 // HAP payments don't have late fees
    }));

    // Combine and sort by date
    const combined = [...rentPayments, ...hapPaymentsFormatted];
    return combined.sort((a, b) => {
      const dateA = new Date(a.display_date || '1970-01-01');
      const dateB = new Date(b.display_date || '1970-01-01');
      return dateB.getTime() - dateA.getTime();
    });
  }, [paymentHistoryQuery.data, hapPaymentsQuery.data]);

  // Compute effective rent due day from recurring_charges as source of truth
  const effectiveRentDueDay = recurringChargesQuery.data?.dueDay || propertyQuery.data?.rent_due_day || 1;

  return {
    paymentHistory: paymentHistoryQuery.data || [],
    hapPayments: hapPaymentsQuery.data || [],
    unifiedPaymentHistory,
    balance: balanceQuery.data,
    property: propertyQuery.data ? {
      ...propertyQuery.data,
      rent_due_day: effectiveRentDueDay  // Override with recurring_charges source of truth
    } : undefined,
    rentSplits: rentSplitsQuery.data,
    isLoading: isDemoMode ? false : (paymentHistoryQuery.isLoading || balanceQuery.isLoading || propertyQuery.isLoading || hapPaymentsQuery.isLoading || rentSplitsQuery.isLoading || recurringChargesQuery.isLoading),
    error: hasValidIds ? (paymentHistoryQuery.error || balanceQuery.error || propertyQuery.error || hapPaymentsQuery.error || rentSplitsQuery.error || recurringChargesQuery.error) : null,
    refetch: () => {
      if (hasValidIds) {
        paymentHistoryQuery.refetch();
        balanceQuery.refetch();
        hapPaymentsQuery.refetch();
        rentSplitsQuery.refetch();
        propertyQuery.refetch();
        recurringChargesQuery.refetch();
      }
    }
  };
};

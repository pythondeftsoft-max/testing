
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { debugLog } from '@/utils/debug';

interface HAPAnalyticsData {
  totalExpected: number;
  totalReceived: number;
  currentMonthExpected: number;
  currentMonthReceived: number;
  latePayments: number;
  missedPayments: number;
  collectionRate: number;
  propertiesWithVouchers: number;
  hapPayments: number;
  tenantPayments: number;
}

export const useHAPAnalytics = (landlordId: string) => {
  const [data, setData] = useState<HAPAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHAPAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get properties with vouchers
      const { data: properties, error: propertiesError } = await supabase
        .from('properties')
        .select('id, monthly_rent, has_voucher')
        .eq('owner_id', landlordId)
        .eq('has_voucher', true);

      if (propertiesError) throw propertiesError;

      if (!properties || properties.length === 0) {
        setData({
          totalExpected: 0,
          totalReceived: 0,
          currentMonthExpected: 0,
          currentMonthReceived: 0,
          latePayments: 0,
          missedPayments: 0,
          collectionRate: 0,
          propertiesWithVouchers: 0,
          hapPayments: 0,
          tenantPayments: 0,
        });
        return;
      }

      const propertyIds = properties.map(p => p.id);

      debugLog('useHAPAnalytics', 'Found properties with vouchers', {
        propertiesCount: properties.length,
        propertyIds
      });

      // Get HAP payments - first try by property_id, then by tenant_id if needed
      let { data: hapPayments, error: paymentsError } = await supabase
        .from('hap_payments')
        .select('*')
        .in('property_id', propertyIds);

      // If no HAP payments found by property_id, try getting all HAP payments for the landlord
      // This handles the case where HAP payments don't have property_id set
      if (!hapPayments || hapPayments.length === 0) {
        debugLog('useHAPAnalytics', 'No HAP payments found by property_id, trying alternative query');
        
        const { data: allHapPayments, error: allHapError } = await supabase
          .from('hap_payments')
          .select('*');
          
        if (allHapError) throw allHapError;
        hapPayments = allHapPayments || [];
        
        debugLog('useHAPAnalytics', 'Found HAP payments without property filter', {
          hapPaymentsCount: hapPayments.length
        });
      }

      if (paymentsError) throw paymentsError;

      // Get tenant rent payments for comparison
      const { data: rentPayments, error: rentError } = await supabase
        .from('rent_payments')
        .select('*')
        .in('property_id', propertyIds)
        .eq('payment_source', 'tenant');

      if (rentError) throw rentError;

      // Calculate metrics
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      
      const currentMonthPayments = hapPayments?.filter(p => {
        const paymentDate = new Date(p.payment_period_start);
        return paymentDate.getMonth() === currentMonth && paymentDate.getFullYear() === currentYear;
      }) || [];

      const totalExpected = hapPayments?.reduce((sum, p) => sum + (p.expected_amount || 0), 0) || 0;
      const totalHAPReceived = hapPayments?.filter(p => p.payment_status === 'received').reduce((sum, p) => sum + (p.actual_amount || p.expected_amount || 0), 0) || 0;
      const totalTenantReceived = rentPayments?.filter(p => p.status === 'completed').reduce((sum, p) => sum + (p.amount || 0), 0) || 0;
      const totalReceived = totalHAPReceived + totalTenantReceived;
      
      debugLog('useHAPAnalytics', 'Calculated HAP metrics', {
        totalExpected,
        totalHAPReceived,
        totalTenantReceived,
        totalReceived,
        hapPaymentsCount: hapPayments?.length || 0,
        rentPaymentsCount: rentPayments?.length || 0
      });
      
      const currentMonthExpected = currentMonthPayments.reduce((sum, p) => sum + (p.expected_amount || 0), 0);
      const currentMonthReceived = currentMonthPayments.filter(p => p.payment_status === 'received').reduce((sum, p) => sum + (p.actual_amount || p.expected_amount || 0), 0);
      const latePayments = hapPayments?.filter(p => p.payment_status === 'late').length || 0;
      const missedPayments = hapPayments?.filter(p => p.payment_status === 'missing').length || 0;

      setData({
        totalExpected,
        totalReceived,
        currentMonthExpected,
        currentMonthReceived,
        latePayments,
        missedPayments,
        collectionRate: totalExpected > 0 ? (totalReceived / totalExpected) * 100 : 0,
        propertiesWithVouchers: properties.length,
        hapPayments: totalHAPReceived,
        tenantPayments: totalTenantReceived,
      });
    } catch (err) {
      console.error('Error fetching HAP analytics:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch HAP analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (landlordId) {
      fetchHAPAnalytics();
    }
  }, [landlordId]);

  return {
    data,
    loading,
    error,
    refetch: fetchHAPAnalytics
  };
};

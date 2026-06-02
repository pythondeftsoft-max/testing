
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface EnhancedTenantProfileData {
  // Basic tenant info
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  
  // Extended tenant profile details
  tenantProfile?: {
    creditScore?: number;
    monthlyIncome?: number;
    employmentStatus?: string;
    maxRent?: number;
    voucherHolder?: boolean;
    voucherAmount?: number;
    housingAuthority?: string;
    moveInWindow?: string;
    preferredLocations?: string[];
    hasPets?: boolean;
    petType?: string;
    hasAccessibilityNeeds?: boolean;
    accessibilityDetails?: string;
    hasEviction?: boolean;
    evictionDetails?: string;
    hasFelonies?: boolean;
    felonyDetails?: string;
    isPlusSubscriber?: boolean;
    messageCredits?: number;
    city?: string;
    zipCode?: string;
  };
  
  // Property and lease info
  currentProperty?: {
    id: string;
    address: string;
    unitNumber?: string;
    bedrooms: number;
    bathrooms: number;
    monthlyRent: number;
    leaseStartDate?: string;
    leaseEndDate?: string;
    propertyType: string;
  };
  
  // Landlord/Property Manager info
  landlordInfo?: {
    id: string;
    firstName: string;
    lastName: string;
    phone: string;
    email?: string;
    companyName?: string;
    responseTimeAvg?: number;
  };
  
  propertyManagerInfo?: {
    id: string;
    firstName: string;
    lastName: string;
    phone: string;
    email?: string;
    companyName?: string;
  };
  
  // Communications
  communications: Array<{
    id: string;
    subject?: string;
    messageContent?: string;
    sentAt: string;
    readAt?: string;
    senderType: 'tenant' | 'landlord' | 'system';
    messageType: string;
    priority: string;
    status: string;
  }>;
  
  // Maintenance requests
  maintenanceRequests: Array<{
    id: string;
    title: string;
    description?: string;
    priority: string;
    status: string;
    createdAt: string;
    completedAt?: string;
    estimatedCost?: number;
    actualCost?: number;
    category?: string;
  }>;
  
  // Housing history
  housingHistory: Array<{
    id: string;
    propertyAddress: string;
    moveInDate: string;
    moveOutDate?: string;
    rentAmount?: number;
    performanceScore?: number;
    leaseRenewed?: boolean;
    moveOutReason?: string;
  }>;
  
  // Payment history
  paymentHistory: Array<{
    id: string;
    amount: number;
    dueDate: string;
    paymentDate?: string;
    status: string;
    daysLate?: number;
    lateFeeAmount?: number;
  }>;
  
  // Analytics
  analytics: {
    averageResponseTime?: number;
    onTimePaymentRate?: number;
    maintenanceRequestCount: number;
    communicationSentiment?: 'positive' | 'neutral' | 'negative';
    riskScore?: number;
    renewalProbability?: number;
  };
}

export const useEnhancedTenantProfile = (tenantId: string) => {
  const [tenantData, setTenantData] = useState<EnhancedTenantProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEnhancedTenantProfile = async () => {
    try {
      setLoading(true);
      setError(null);

      console.debug('Fetching enhanced tenant profile for ID:', tenantId);
      
      // Use the new RPC function to get all tenant data
      const { data, error } = await supabase.rpc('get_enhanced_tenant_profile', {
        p_tenant_id: tenantId
      });
      
      if (error) {
        console.error('Enhanced tenant profile fetch error:', error);
        throw error;
      }
      
      if (!data || data.length === 0) {
        console.warn('No tenant profile data found for ID:', tenantId);
        setTenantData(null);
        return;
      }
      
      // The RPC returns an array with one record
      const profile = data[0];
      console.debug('Raw tenant profile data from RPC:', profile);

      // Get additional data that's not in the main RPC
      let communications: any[] = [];
      let maintenanceRequests: any[] = [];
      let housingHistory: any[] = [];
      let paymentHistory: any[] = [];
      
      // Get communications if property exists
      if (profile.property_id) {
        const { data: comms } = await supabase
          .from('tenant_communications')
          .select('*')
          .eq('tenant_id', tenantId)
          .order('sent_at', { ascending: false })
          .limit(50);
        communications = comms || [];

        // Get maintenance requests
        const { data: maintenance } = await supabase
          .from('maintenance_requests')
          .select('*')
          .eq('property_id', profile.property_id)
          .order('created_at', { ascending: false });
        maintenanceRequests = maintenance || [];

        // Get payment history
        const { data: payments } = await supabase
          .from('rent_payments')
          .select('*')
          .eq('property_id', profile.property_id)
          .order('due_date', { ascending: false })
          .limit(24);
        paymentHistory = payments || [];
      }

      // Calculate analytics
      const onTimePayments = paymentHistory.filter(p => (p.days_late || 0) === 0).length;
      const totalPayments = paymentHistory.length;
      const onTimePaymentRate = totalPayments > 0 ? (onTimePayments / totalPayments) * 100 : 0;

      // Simple risk score calculation
      let riskScore = profile.risk_score || 50;
      
      const enhancedData: EnhancedTenantProfileData = {
        id: tenantId,
        firstName: profile.first_name || '',
        lastName: profile.last_name || '',
        email: profile.email || '',
        phone: profile.phone || '',
        tenantProfile: {
          creditScore: profile.credit_score,
          monthlyIncome: profile.monthly_income,
          employmentStatus: profile.employment_status,
          maxRent: profile.voucher_amount || profile.monthly_rent,
          voucherHolder: profile.voucher_status ? true : false,
          voucherAmount: profile.voucher_amount,
          housingAuthority: null, // Not in current schema
          moveInWindow: profile.move_in_window,
          preferredLocations: [],
          hasPets: null,
          petType: null,
          hasAccessibilityNeeds: null,
          accessibilityDetails: null,
          hasEviction: null,
          evictionDetails: null,
          hasFelonies: null,
          felonyDetails: null,
          isPlusSubscriber: false,
          messageCredits: null,
          city: profile.current_city,
          zipCode: profile.current_zip,
        },
        currentProperty: profile.property_id ? {
          id: profile.property_id,
          address: profile.property_address || '',
          unitNumber: undefined,
          bedrooms: 0, // Not available in current data
          bathrooms: 0, // Not available in current data
          monthlyRent: profile.monthly_rent || 0,
          leaseStartDate: profile.lease_start_date,
          leaseEndDate: profile.lease_end_date,
          propertyType: 'residential'
        } : undefined,
        landlordInfo: undefined, // Could be enhanced later
        propertyManagerInfo: undefined, // Could be enhanced later
        communications: communications.map(c => ({
          id: c.id,
          subject: c.subject,
          messageContent: c.message_content,
          sentAt: c.sent_at,
          readAt: c.read_at,
          senderType: c.sender_type === 'tenant' ? 'tenant' : 'landlord',
          messageType: c.message_type || 'general',
          priority: c.priority || 'normal',
          status: c.status || 'sent'
        })),
        maintenanceRequests: maintenanceRequests.map(mr => ({
          id: mr.id,
          title: mr.title || 'Maintenance Request',
          description: mr.description,
          priority: mr.priority || 'medium',
          status: mr.status || 'pending',
          createdAt: mr.created_at,
          completedAt: mr.completed_date,
          estimatedCost: mr.estimated_cost,
          actualCost: mr.actual_cost,
          category: mr.category
        })),
        housingHistory: housingHistory.map(h => ({
          id: h.id,
          propertyAddress: h.property_address || 'Unknown Address',
          moveInDate: h.move_in_date,
          moveOutDate: h.move_out_date,
          rentAmount: h.rent_amount,
          performanceScore: h.performance_score,
          leaseRenewed: h.lease_renewed,
          moveOutReason: h.move_out_reason
        })),
        paymentHistory: paymentHistory.map(p => ({
          id: p.id,
          amount: p.amount || 0,
          dueDate: p.due_date,
          paymentDate: p.payment_date,
          status: p.status || 'pending',
          daysLate: p.days_late,
          lateFeeAmount: p.late_fee_amount
        })),
        analytics: {
          onTimePaymentRate,
          maintenanceRequestCount: maintenanceRequests.length,
          communicationSentiment: 'neutral',
          riskScore: Math.max(0, Math.min(100, riskScore)),
          renewalProbability: Math.max(0, Math.min(100, 100 - riskScore + 10))
        }
      };

      console.debug('Transformed enhanced tenant data:', enhancedData);
      setTenantData(enhancedData);
    } catch (err: any) {
      console.error('Error fetching enhanced tenant profile:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tenantId) {
      fetchEnhancedTenantProfile();
    }
  }, [tenantId]);

  const refetch = () => {
    if (tenantId) {
      fetchEnhancedTenantProfile();
    }
  };

  return { tenantData, loading, error, refetch };
};

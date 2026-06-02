import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from "@/hooks/use-toast";

// Updated data structure interfaces that match the database schema
interface LeaseLifecycle {
  id: string;
  property_id: string;
  tenant_id?: string;
  lease_start_date?: string;
  lease_end_date?: string;
  monthly_rent?: number;
  security_deposit?: number;
  lease_status: string;
  renewal_notice_sent: boolean;
  renewal_notice_date?: string;
  renewal_deadline?: string;
  renewal_terms?: any;
  termination_notice_date?: string;
  termination_reason?: string;
  move_out_date?: string;
  deposit_returned: boolean;
  deposit_return_amount?: number;
  created_at: string;
  updated_at: string;
  lease_document_url?: string;
  auto_renewal: boolean;
  rent_increase_percentage?: number;
  special_terms?: any;
  properties?: { address: string };
  tenant?: { first_name: string; last_name: string; email: string };
}

interface TenantCommunication {
  id: string;
  property_id: string;
  tenant_id?: string;
  landlord_id?: string;
  thread_id?: string;
  message_type: string;
  subject?: string;
  message_content?: string;
  sender_type: string;
  sender_id?: string;
  recipient_id?: string;
  sent_at: string;
  read_at?: string;
  replied_at?: string;
  priority: string;
  attachments?: any;
  automated: boolean;
  template_used?: string;
  status: string;
  properties?: { address: string };
  tenant?: { first_name: string; last_name: string; email: string };
}

interface RentCollectionAlert {
  id: string;
  property_id: string;
  tenant_id?: string;
  due_date: string;
  amount_due: number;
  amount_paid: number;
  days_late: number;
  alert_level: number;
  last_reminder_sent?: string;
  next_reminder_due?: string;
  auto_reminder_enabled: boolean;
  custom_message?: string;
  late_fee_applied: number;
  payment_plan_active: boolean;
  payment_plan_details?: any;
  created_at: string;
  updated_at: string;
  resolved_at?: string;
  resolution_type?: string;
  escalation_date?: string;
  properties?: { address: string };
  tenant?: { first_name: string; last_name: string; email: string };
}

interface TenantScreening {
  id: string;
  application_id?: string;
  tenant_id?: string;
  property_id: string;
  background_check_id?: string;
  credit_score?: number;
  credit_report_url?: string;
  income_verification: boolean;
  employment_verification: boolean;
  rental_history_check: boolean;
  criminal_background_clear: boolean;
  eviction_history_clear: boolean;
  references_verified: boolean;
  overall_score?: number;
  recommendation?: string;
  screening_date: string;
  screening_cost?: number;
  screening_provider?: string;
  external_reference_id?: string;
  detailed_results?: any;
  red_flags?: any;
  created_at: string;
  updated_at: string;
  screened_by?: string;
  expires_at?: string;
  properties?: { address: string };
  applicant?: { first_name: string; last_name: string; email: string };
}

export const useEnhancedTenantManagement = (portfolioId?: string) => {
  const [leases, setLeases] = useState<LeaseLifecycle[]>([]);
  const [communications, setCommunications] = useState<TenantCommunication[]>([]);
  const [rentAlerts, setRentAlerts] = useState<RentCollectionAlert[]>([]);
  const [screenings, setScreenings] = useState<TenantScreening[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const fetchLeases = useCallback(async () => {
    try {
      setIsLoading(true);
      
      let query = supabase
        .from('lease_lifecycle_tracking')
        .select(`
          *,
          properties (
            id,
            address,
            portfolio_id
          )
        `)
        .order('lease_end_date', { ascending: true });

      if (portfolioId && portfolioId !== 'everything') {
        query = query.eq('properties.portfolio_id', portfolioId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setLeases(data || []);
    } catch (error) {
      console.error('Error fetching leases:', error);
      toast({
        title: "Error",
        description: "Failed to fetch lease data.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [portfolioId, toast]);

  const fetchCommunications = useCallback(async () => {
    try {
      let query = supabase
        .from('tenant_communications')
        .select(`
          *,
          properties (
            id,
            address,
            portfolio_id
          )
        `)
        .order('sent_at', { ascending: false });

      if (portfolioId && portfolioId !== 'everything') {
        query = query.eq('properties.portfolio_id', portfolioId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setCommunications((data || []).map(item => ({
        ...item,
        attachments: Array.isArray(item.attachments) ? item.attachments : []
      })));
    } catch (error) {
      console.error('Error fetching communications:', error);
      toast({
        title: "Error",
        description: "Failed to fetch communication data.",
        variant: "destructive",
      });
    }
  }, [portfolioId, toast]);

  const fetchRentAlerts = useCallback(async () => {
    try {
      let query = supabase
        .from('rent_collection_alerts')
        .select(`
          *,
          properties (
            id,
            address,
            portfolio_id
          )
        `)
        .neq('resolved_at', null)
        .order('days_late', { ascending: false });

      if (portfolioId && portfolioId !== 'everything') {
        query = query.eq('properties.portfolio_id', portfolioId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setRentAlerts(data || []);
    } catch (error) {
      console.error('Error fetching rent alerts:', error);
      toast({
        title: "Error",
        description: "Failed to fetch rent collection alerts.",
        variant: "destructive",
      });
    }
  }, [portfolioId, toast]);

  const fetchScreenings = useCallback(async () => {
    try {
      let query = supabase
        .from('tenant_screening_results')
        .select(`
          *,
          properties (
            id,
            address,
            portfolio_id
          )
        `)
        .order('screening_date', { ascending: false });

      if (portfolioId && portfolioId !== 'everything') {
        query = query.eq('properties.portfolio_id', portfolioId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setScreenings((data || []).map(item => ({
        ...item,
        red_flags: Array.isArray(item.red_flags) ? item.red_flags : [],
        detailed_results: item.detailed_results || {}
      })));
    } catch (error) {
      console.error('Error fetching screenings:', error);
      toast({
        title: "Error",
        description: "Failed to fetch screening data.",
        variant: "destructive",
      });
    }
  }, [portfolioId, toast]);

  // Enhanced functions with real database operations
  const sendRenewalNotice = async (leaseId: string, customMessage?: string) => {
    try {
      const { data, error } = await supabase
        .from('lease_lifecycle_tracking')
        .update({
          renewal_notice_sent: true,
          renewal_notice_date: new Date().toISOString(),
          renewal_deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days from now
        })
        .eq('id', leaseId)
        .select()
        .single();

      if (error) throw error;

      // Create communication record
      await supabase
        .from('tenant_communications')
        .insert({
          property_id: data.property_id,
          tenant_id: data.tenant_id,
          landlord_id: (await supabase.auth.getUser()).data.user?.id,
          message_type: 'lease',
          subject: 'Lease Renewal Notice',
          message_content: customMessage || 'Your lease is approaching expiration. Please review the renewal terms.',
          sender_type: 'landlord',
          sender_id: (await supabase.auth.getUser()).data.user?.id,
          recipient_id: data.tenant_id,
          priority: 'high',
          automated: !customMessage,
          status: 'sent'
        });

      setLeases(prev => 
        prev.map(lease => 
          lease.id === leaseId ? { ...lease, ...data } : lease
        )
      );

      toast({
        title: "Success",
        description: "Renewal notice sent successfully.",
      });
    } catch (error) {
      console.error('Error sending renewal notice:', error);
      toast({
        title: "Error",
        description: "Failed to send renewal notice.",
        variant: "destructive",
      });
    }
  };

  const processRenewal = async (leaseId: string, newEndDate: string, rentAmount?: number) => {
    try {
      const updateData: any = {
        lease_end_date: newEndDate,
        lease_status: 'active',
        updated_at: new Date().toISOString()
      };

      if (rentAmount) {
        updateData.monthly_rent = rentAmount;
        updateData.rent_increase_percentage = rentAmount; // Calculate percentage if needed
      }

      const { data, error } = await supabase
        .from('lease_lifecycle_tracking')
        .update(updateData)
        .eq('id', leaseId)
        .select()
        .single();

      if (error) throw error;

      setLeases(prev => 
        prev.map(lease => 
          lease.id === leaseId ? { ...lease, ...data } : lease
        )
      );

      toast({
        title: "Success",
        description: "Lease renewal processed successfully.",
      });
    } catch (error) {
      console.error('Error processing renewal:', error);
      toast({
        title: "Error",
        description: "Failed to process lease renewal.",
        variant: "destructive",
      });
    }
  };

  const sendTenantMessage = async (tenantId: string, propertyId: string, subject: string, message: string, type: string) => {
    try {
      const { data, error } = await supabase
        .from('tenant_communications')
        .insert({
          property_id: propertyId,
          tenant_id: tenantId,
          landlord_id: (await supabase.auth.getUser()).data.user?.id,
          message_type: type,
          subject,
          message_content: message,
          sender_type: 'landlord',
          sender_id: (await supabase.auth.getUser()).data.user?.id,
          recipient_id: tenantId,
          priority: 'normal',
          automated: false,
          status: 'sent'
        })
        .select()
        .single();

      if (error) throw error;

      setCommunications(prev => [{
        ...data,
        attachments: Array.isArray(data.attachments) ? data.attachments : []
      }, ...prev]);
      toast({
        title: "Success",
        description: "Message sent to tenant successfully.",
      });
    } catch (error) {
      console.error('Error sending tenant message:', error);
      toast({
        title: "Error",
        description: "Failed to send message to tenant.",
        variant: "destructive",
      });
    }
  };

  const initiateScreening = async (applicantId: string, propertyId: string) => {
    try {
      const { data, error } = await supabase
        .from('tenant_screening_results')
        .insert({
          tenant_id: applicantId,
          property_id: propertyId,
          screening_date: new Date().toISOString().split('T')[0],
          income_verification: false,
          employment_verification: false,
          rental_history_check: false,
          criminal_background_clear: false,
          eviction_history_clear: false,
          references_verified: false,
          screened_by: (await supabase.auth.getUser()).data.user?.id,
          expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString() // 90 days
        })
        .select()
        .single();

      if (error) throw error;

      setScreenings(prev => [{
        ...data,
        red_flags: Array.isArray(data.red_flags) ? data.red_flags : [],
        detailed_results: data.detailed_results || {}
      }, ...prev]);
      toast({
        title: "Success",
        description: "Tenant screening initiated successfully.",
      });
      
      return data;
    } catch (error) {
      console.error('Error initiating screening:', error);
      toast({
        title: "Error",
        description: "Failed to initiate tenant screening.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const handleRentAlert = async (alertId: string, action: string) => {
    try {
      const updateData: any = { updated_at: new Date().toISOString() };

      if (action === 'resolve') {
        updateData.resolved_at = new Date().toISOString();
        updateData.resolution_type = 'paid_full';
      } else if (action === 'escalate') {
        updateData.alert_level = 4;
        updateData.escalation_date = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from('rent_collection_alerts')
        .update(updateData)
        .eq('id', alertId)
        .select()
        .single();

      if (error) throw error;

      setRentAlerts(prev => 
        prev.map(alert => 
          alert.id === alertId ? { ...alert, ...data } : alert
        )
      );

      toast({
        title: "Success",
        description: `Rent alert ${action}d successfully.`,
      });
    } catch (error) {
      console.error('Error handling rent alert:', error);
      toast({
        title: "Error",
        description: "Failed to handle rent alert.",
        variant: "destructive",
      });
    }
  };

  const refetch = useCallback(async () => {
    await Promise.all([
      fetchLeases(),
      fetchCommunications(),
      fetchRentAlerts(),
      fetchScreenings()
    ]);
  }, [fetchLeases, fetchCommunications, fetchRentAlerts, fetchScreenings]);

  useEffect(() => {
    if (portfolioId) {
      refetch();
    }
  }, [portfolioId, refetch]);

  return {
    leases,
    communications,
    rentAlerts,
    screenings,
    isLoading,
    sendRenewalNotice,
    processRenewal,
    sendTenantMessage,
    initiateScreening,
    handleRentAlert,
    refetch
  };
};
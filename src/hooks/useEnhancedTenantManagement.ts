import { useState, useEffect } from 'react';
import { useToast } from "@/hooks/use-toast";

// Data structure interfaces
interface LeaseLifecycle {
  id: string;
  property_id: string;
  tenant_id: string;
  lease_start_date: string;
  lease_end_date: string;
  monthly_rent: number;
  status: 'active' | 'expired' | 'terminated';
  renewal_status: 'pending' | 'notice_sent' | 'renewed' | 'declined';
  renewal_notice_sent: boolean; // Added missing property
  renewal_response: 'pending' | 'accepted' | 'declined'; // Added missing property
  days_until_expiry: number;
  created_at: string;
  updated_at: string;
  properties?: { address: string };
  tenant?: { first_name: string; last_name: string; email: string };
}

interface TenantCommunication {
  id: string;
  tenant_id: string;
  property_id: string;
  subject: string;
  message: string;
  type: string;
  status: 'sent' | 'delivered' | 'read' | 'replied'; // Added 'replied' status
  created_at: string;
  properties?: { address: string };
  tenant?: { first_name: string; last_name: string; email: string };
}

interface RentCollectionAlert {
  id: string;
  tenant_id: string;
  property_id: string;
  alert_type: 'late_payment' | 'missed_payment' | 'partial_payment';
  amount_due: number;
  days_overdue: number;
  days_late: number; // Added missing property
  status: 'active' | 'resolved' | 'escalated';
  created_at: string;
  properties?: { address: string };
  tenant?: { first_name: string; last_name: string; email: string };
}

interface TenantScreening {
  id: string;
  applicant_id: string;
  property_id: string;
  screening_type: 'background_check' | 'credit_check' | 'employment_verification';
  status: 'initiated' | 'in_progress' | 'completed' | 'failed';
  credit_score?: number;
  background_check_status?: string;
  income_verification: 'passed' | 'failed' | 'pending'; // Added missing property
  employment_verification: 'passed' | 'failed' | 'pending'; // Added missing property
  reference_checks: 'passed' | 'failed' | 'pending'; // Added missing property
  recommendation: 'approve' | 'deny' | 'conditional'; // Added missing property
  created_at: string;
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

  const fetchLeases = async () => {
    try {
      setIsLoading(true);
      
      // Mock data for lease lifecycle
      const mockLeases: LeaseLifecycle[] = [
        {
          id: '1',
          property_id: 'prop-1',
          tenant_id: 'tenant-1',
          lease_start_date: '2024-01-01',
          lease_end_date: '2024-12-31',
          monthly_rent: 2500,
          status: 'active',
          renewal_status: 'pending',
          renewal_notice_sent: false, // Added missing property
          renewal_response: 'pending', // Added missing property
          days_until_expiry: 90,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          properties: { address: '123 Main St' },
          tenant: { first_name: 'John', last_name: 'Doe', email: 'john@example.com' }
        }
      ];
      
      setLeases(mockLeases);
    } catch (error) {
      console.error('Error fetching leases:', error);
      toast({
        title: "Error",
        description: "Failed to fetch lease data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCommunications = async () => {
    try {
      setIsLoading(true);
      
      // Mock data for tenant communications
      const mockCommunications: TenantCommunication[] = [
        {
          id: '1',
          tenant_id: 'tenant-1',
          property_id: 'prop-1',
          subject: 'Rent Reminder',
          message: 'Your rent is due in 3 days',
          type: 'reminder',
          status: 'sent',
          created_at: '2024-01-15T00:00:00Z',
          properties: { address: '123 Main St' },
          tenant: { first_name: 'John', last_name: 'Doe', email: 'john@example.com' }
        }
      ];
      
      setCommunications(mockCommunications);
    } catch (error) {
      console.error('Error fetching communications:', error);
      toast({
        title: "Error",
        description: "Failed to fetch communication data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRentAlerts = async () => {
    try {
      setIsLoading(true);
      
      // Mock data for rent collection alerts
      const mockRentAlerts: RentCollectionAlert[] = [
        {
          id: '1',
          tenant_id: 'tenant-1',
          property_id: 'prop-1',
          alert_type: 'late_payment',
          amount_due: 2500,
          days_overdue: 5,
          days_late: 5, // Added missing property
          status: 'active',
          created_at: '2024-01-20T00:00:00Z',
          properties: { address: '123 Main St' },
          tenant: { first_name: 'John', last_name: 'Doe', email: 'john@example.com' }
        }
      ];
      
      setRentAlerts(mockRentAlerts);
    } catch (error) {
      console.error('Error fetching rent alerts:', error);
      toast({
        title: "Error",
        description: "Failed to fetch rent alert data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchScreenings = async () => {
    try {
      setIsLoading(true);
      
      // Mock data for tenant screenings
      const mockScreenings: TenantScreening[] = [
        {
          id: '1',
          applicant_id: 'applicant-1',
          property_id: 'prop-1',
          screening_type: 'background_check',
          status: 'completed',
          credit_score: 750,
          background_check_status: 'passed',
          income_verification: 'passed', // Added missing property
          employment_verification: 'passed', // Added missing property
          reference_checks: 'passed', // Added missing property
          recommendation: 'approve', // Added missing property
          created_at: '2024-01-10T00:00:00Z',
          properties: { address: '123 Main St' },
          applicant: { first_name: 'Jane', last_name: 'Smith', email: 'jane@example.com' }
        }
      ];
      
      setScreenings(mockScreenings);
    } catch (error) {
      console.error('Error fetching screenings:', error);
      toast({
        title: "Error",
        description: "Failed to fetch screening data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const sendRenewalNotice = async (leaseId: string, customMessage?: string) => {
    try {
      // Mock implementation - update local state
      setLeases(prevLeases => 
        prevLeases.map(lease => 
          lease.id === leaseId 
            ? { ...lease, renewal_status: 'notice_sent', updated_at: new Date().toISOString() }
            : lease
        )
      );

      // Mock sending communication
      const lease = leases.find(l => l.id === leaseId);
      if (lease) {
        const newCommunication: TenantCommunication = {
          id: Date.now().toString(),
          tenant_id: lease.tenant_id,
          property_id: lease.property_id,
          subject: 'Lease Renewal Notice',
          message: customMessage || 'Your lease is expiring soon. Please contact us to discuss renewal options.',
          type: 'renewal_notice',
          status: 'sent',
          created_at: new Date().toISOString(),
          properties: lease.properties,
          tenant: lease.tenant
        };
        setCommunications(prev => [newCommunication, ...prev]);
      }

      toast({
        title: "Success",
        description: "Renewal notice sent successfully",
      });
    } catch (error) {
      console.error('Error sending renewal notice:', error);
      toast({
        title: "Error",
        description: "Failed to send renewal notice",
        variant: "destructive",
      });
    }
  };

  const processRenewal = async (leaseId: string, newEndDate: string, rentAmount?: number) => {
    try {
      // Mock implementation - update local state
      setLeases(prevLeases => 
        prevLeases.map(lease => 
          lease.id === leaseId 
            ? { 
                ...lease, 
                lease_end_date: newEndDate,
                monthly_rent: rentAmount || lease.monthly_rent,
                renewal_status: 'renewed',
                status: 'active',
                updated_at: new Date().toISOString()
              }
            : lease
        )
      );

      toast({
        title: "Success",
        description: "Lease renewal processed successfully",
      });
    } catch (error) {
      console.error('Error processing renewal:', error);
      toast({
        title: "Error",
        description: "Failed to process lease renewal",
        variant: "destructive",
      });
    }
  };

  const sendTenantMessage = async (tenantId: string, propertyId: string, subject: string, message: string, type: string) => {
    try {
      // Mock implementation - add to local state
      const newCommunication: TenantCommunication = {
        id: Date.now().toString(),
        tenant_id: tenantId,
        property_id: propertyId,
        subject,
        message,
        type,
        status: 'sent',
        created_at: new Date().toISOString(),
        properties: { address: 'Mock Address' },
        tenant: { first_name: 'Mock', last_name: 'Tenant', email: 'mock@example.com' }
      };

      setCommunications(prev => [newCommunication, ...prev]);
      toast({
        title: "Success",
        description: "Message sent successfully",
      });
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
    }
  };

  const initiateScreening = async (applicantId: string, propertyId: string) => {
    try {
      // Mock implementation - add to local state
      const newScreening: TenantScreening = {
        id: Date.now().toString(),
        applicant_id: applicantId,
        property_id: propertyId,
        screening_type: 'background_check',
        status: 'initiated',
        income_verification: 'pending', // Added missing property
        employment_verification: 'pending', // Added missing property
        reference_checks: 'pending', // Added missing property
        recommendation: 'conditional', // Added missing property
        created_at: new Date().toISOString(),
        properties: { address: 'Mock Address' },
        applicant: { first_name: 'Mock', last_name: 'Applicant', email: 'applicant@example.com' }
      };

      setScreenings(prev => [newScreening, ...prev]);
      toast({
        title: "Success",
        description: "Screening initiated successfully",
      });
    } catch (error) {
      console.error('Error initiating screening:', error);
      toast({
        title: "Error",
        description: "Failed to initiate screening",
        variant: "destructive",
      });
    }
  };

  const handleRentAlert = async (alertId: string, action: string) => {
    try {
      // Mock implementation - update local state
      setRentAlerts(prevAlerts => 
        prevAlerts.map(alert => 
          alert.id === alertId 
            ? { ...alert, status: action === 'resolve' ? 'resolved' : 'escalated' }
            : alert
        )
      );

      toast({
        title: "Success",
        description: `Alert ${action}d successfully`,
      });
    } catch (error) {
      console.error('Error handling rent alert:', error);
      toast({
        title: "Error",
        description: "Failed to handle rent alert",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchLeases();
    fetchCommunications();
    fetchRentAlerts();
    fetchScreenings();
  }, [portfolioId]);

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
    refetch: () => {
      fetchLeases();
      fetchCommunications();
      fetchRentAlerts();
      fetchScreenings();
    }
  };
};
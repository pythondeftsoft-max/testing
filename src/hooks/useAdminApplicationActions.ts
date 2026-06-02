
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAdminAudit } from './useAdminAudit';

interface AdminApplicationData {
  id: string;
  property_id: string;
  unit_id: string | null;
  tenant_id: string;
  status: string;
  priority_payment_made: boolean;
  priority_payment_amount: number | null;
  created_at: string;
  updated_at: string;
  tenant_first_name: string | null;
  tenant_last_name: string | null;
  tenant_phone: string | null;
  unit_number: string | null;
  unit_name: string | null;
}

export const useAdminApplicationActions = (propertyId: string) => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { logAdminAccess } = useAdminAudit();

  const listApplications = async (status = 'all', search = ''): Promise<AdminApplicationData[]> => {
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc('admin_list_property_applications', {
        p_property_id: propertyId,
        p_status: status,
        p_search: search
      });

      if (error) throw error;
      
      await logAdminAccess('property_applications', propertyId, 'list', { 
        status_filter: status,
        search_term: search
      });

      return data || [];
    } catch (error: any) {
      console.error('Error listing applications:', error);
      toast({
        title: "Error",
        description: "Failed to load applications",
        variant: "destructive",
      });
      return [];
    } finally {
      setLoading(false);
    }
  };

  const updateApplicationStatus = async (
    applicationId: string, 
    newStatus: string, 
    reason?: string,
    metadata?: Record<string, any>
  ): Promise<boolean> => {
    try {
      setLoading(true);
      const { error } = await supabase.rpc('admin_update_application_status', {
        p_application_id: applicationId,
        p_new_status: newStatus,
        p_reason: reason || null,
        p_metadata: metadata ? JSON.stringify(metadata) : '{}'
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: `Application status updated to ${newStatus}`,
      });

      return true;
    } catch (error: any) {
      console.error('Error updating application status:', error);
      toast({
        title: "Error",
        description: "Failed to update application status",
        variant: "destructive",
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const bulkUpdateStatus = async (
    applicationIds: string[],
    newStatus: string,
    reason?: string,
    metadata?: Record<string, any>
  ): Promise<number> => {
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc('admin_bulk_update_application_status', {
        p_application_ids: applicationIds,
        p_new_status: newStatus,
        p_reason: reason || null,
        p_metadata: metadata ? JSON.stringify(metadata) : '{}'
      });

      if (error) throw error;

      const updatedCount = data || 0;
      toast({
        title: "Success",
        description: `Updated ${updatedCount} application(s) to ${newStatus}`,
      });

      return updatedCount;
    } catch (error: any) {
      console.error('Error bulk updating applications:', error);
      toast({
        title: "Error",
        description: "Failed to bulk update applications",
        variant: "destructive",
      });
      return 0;
    } finally {
      setLoading(false);
    }
  };

  const reassignToUnit = async (
    applicationId: string,
    targetUnitId: string,
    reason?: string,
    metadata?: Record<string, any>
  ): Promise<boolean> => {
    try {
      setLoading(true);
      const { error } = await supabase.rpc('admin_reassign_application_unit', {
        p_application_id: applicationId,
        p_target_unit_id: targetUnitId,
        p_reason: reason || null,
        p_metadata: metadata ? JSON.stringify(metadata) : '{}'
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Application reassigned to new unit",
      });

      return true;
    } catch (error: any) {
      console.error('Error reassigning application:', error);
      toast({
        title: "Error",
        description: "Failed to reassign application",
        variant: "destructive",
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    listApplications,
    updateApplicationStatus,
    bulkUpdateStatus,
    reassignToUnit,
  };
};

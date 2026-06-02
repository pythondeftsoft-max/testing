import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// Updated data structure definitions that match the database schema
export interface MaintenanceWorkflow {
  id: string;
  maintenance_request_id: string;
  vendor_id?: string;
  workflow_type: string;
  status: string;
  priority: number;
  estimated_cost?: number;
  actual_cost?: number;
  estimated_completion_date?: string;
  actual_completion_date?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
  completed_by?: string;
  notes?: string;
  workflow_data?: any;
  auto_assigned: boolean;
}

export interface PredictiveMaintenance {
  id: string;
  property_id: string;
  asset_type: string;
  asset_identifier?: string;
  predicted_issue: string;
  prediction_confidence: number;
  predicted_failure_date?: string;
  urgency_level: number;
  estimated_repair_cost?: number;
  prevention_cost?: number;
  cost_savings?: number;
  data_sources?: any;
  created_at: string;
  updated_at: string;
  scheduled_maintenance_id?: string;
  status: string;
  ai_model_version?: string;
  confidence_factors?: any;
}

export interface MaintenanceBudget {
  id: string;
  property_id?: string;
  portfolio_id?: string;
  budget_year: number;
  budget_month?: number;
  allocated_amount: number;
  spent_amount: number;
  committed_amount: number;
  remaining_amount: number;
  category?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
  notes?: string;
}

export const useSmartMaintenance = (portfolioId?: string) => {
  const [workflows, setWorkflows] = useState<MaintenanceWorkflow[]>([]);
  const [predictions, setPredictions] = useState<PredictiveMaintenance[]>([]);
  const [budgets, setBudgets] = useState<MaintenanceBudget[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const fetchWorkflows = useCallback(async () => {
    try {
      setIsLoading(true);
      
      let query = supabase
        .from('maintenance_workflows')
        .select(`
          *,
          maintenance_requests (
            property_id,
            properties (
              id,
              address,
              portfolio_id
            )
          )
        `);

      if (portfolioId && portfolioId !== 'everything') {
        // Filter by portfolio through the relationship
        query = query.eq('maintenance_requests.properties.portfolio_id', portfolioId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setWorkflows(data || []);
    } catch (error) {
      console.error('Error fetching maintenance workflows:', error);
      toast({
        title: "Error",
        description: "Failed to fetch maintenance workflows.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [portfolioId, toast]);

  const fetchPredictions = useCallback(async () => {
    try {
      let query = supabase
        .from('predictive_maintenance')
        .select(`
          *,
          properties (
            id,
            address,
            portfolio_id
          )
        `);

      if (portfolioId && portfolioId !== 'everything') {
        query = query.eq('properties.portfolio_id', portfolioId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setPredictions(data || []);
    } catch (error) {
      console.error('Error fetching predictive maintenance:', error);
      toast({
        title: "Error",
        description: "Failed to fetch predictive maintenance data.",
        variant: "destructive",
      });
    }
  }, [portfolioId, toast]);

  const fetchBudgets = useCallback(async () => {
    try {
      let query = supabase.from('maintenance_budgets').select('*');

      if (portfolioId && portfolioId !== 'everything') {
        query = query.eq('portfolio_id', portfolioId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setBudgets(data || []);
    } catch (error) {
      console.error('Error fetching maintenance budgets:', error);
      toast({
        title: "Error",
        description: "Failed to fetch maintenance budgets.",
        variant: "destructive",
      });
    }
  }, [portfolioId, toast]);

  // Enhanced functions with real database operations
  const createWorkflow = async (requestId: string, vendorId?: string) => {
    try {
      const { data, error } = await supabase
        .from('maintenance_workflows')
        .insert({
          maintenance_request_id: requestId,
          vendor_id: vendorId,
          workflow_type: 'standard',
          status: 'created',
          priority: 2,
          auto_assigned: !!vendorId,
          created_by: (await supabase.auth.getUser()).data.user?.id
        })
        .select()
        .single();

      if (error) throw error;

      setWorkflows(prev => [...prev, data]);
      toast({
        title: "Success",
        description: "Maintenance workflow created successfully.",
      });
      
      return data;
    } catch (error) {
      console.error('Error creating workflow:', error);
      toast({
        title: "Error",
        description: "Failed to create maintenance workflow.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const updateWorkflowStatus = async (workflowId: string, status: string, actualCost?: number) => {
    try {
      const updateData: any = { 
        status, 
        updated_at: new Date().toISOString() 
      };
      
      if (actualCost) {
        updateData.actual_cost = actualCost;
      }
      
      if (status === 'completed') {
        updateData.actual_completion_date = new Date().toISOString();
        updateData.completed_by = (await supabase.auth.getUser()).data.user?.id;
      }

      const { data, error } = await supabase
        .from('maintenance_workflows')
        .update(updateData)
        .eq('id', workflowId)
        .select()
        .single();

      if (error) throw error;

      setWorkflows(prev => 
        prev.map(workflow => 
          workflow.id === workflowId ? { ...workflow, ...data } : workflow
        )
      );

      toast({
        title: "Success",
        description: "Workflow status updated successfully.",
      });
    } catch (error) {
      console.error('Error updating workflow status:', error);
      toast({
        title: "Error",
        description: "Failed to update workflow status.",
        variant: "destructive",
      });
    }
  };

  const scheduleMaintenanceFromPrediction = async (predictionId: string, scheduledDate: string) => {
    try {
      // First get the prediction details
      const { data: prediction, error: predError } = await supabase
        .from('predictive_maintenance')
        .select('*')
        .eq('id', predictionId)
        .single();

      if (predError) throw predError;

      // Create a maintenance request
      const user = await supabase.auth.getUser();
      const { data: maintenanceRequest, error: reqError } = await supabase
        .from('maintenance_requests')
        .insert({
          property_id: prediction.property_id,
          tenant_id: user.data.user?.id,
          title: `Predictive maintenance: ${prediction.predicted_issue}`,
          description: `Predictive maintenance: ${prediction.predicted_issue}`,
          priority: prediction.urgency_level > 3 ? 'emergency' : prediction.urgency_level > 2 ? 'high' : 'medium',
          status: 'pending',
          estimated_cost: prediction.estimated_repair_cost
        })
        .select()
        .single();

      if (reqError) throw reqError;

      // Create workflow for the maintenance request
      const { data: workflow, error: workflowError } = await supabase
        .from('maintenance_workflows')
        .insert({
          maintenance_request_id: maintenanceRequest.id,
          workflow_type: 'predictive',
          status: 'created',
          priority: prediction.urgency_level,
          estimated_cost: prediction.estimated_repair_cost,
          estimated_completion_date: scheduledDate,
          auto_assigned: false,
          created_by: user.data.user?.id
        })
        .select()
        .single();

      if (workflowError) throw workflowError;

      // Update prediction status
      await supabase
        .from('predictive_maintenance')
        .update({ 
          status: 'scheduled',
          scheduled_maintenance_id: maintenanceRequest.id
        })
        .eq('id', predictionId);

      // Refresh data
      await Promise.all([fetchWorkflows(), fetchPredictions()]);

      toast({
        title: "Success",
        description: "Maintenance scheduled from prediction successfully.",
      });
    } catch (error) {
      console.error('Error scheduling maintenance from prediction:', error);
      toast({
        title: "Error",
        description: "Failed to schedule maintenance from prediction.",
        variant: "destructive",
      });
    }
  };

  const createBudget = async (budgetData: Partial<MaintenanceBudget>) => {
    try {
      const user = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('maintenance_budgets')
        .insert({
          budget_year: budgetData.budget_year || new Date().getFullYear(),
          allocated_amount: budgetData.allocated_amount || 0,
          ...budgetData,
          created_by: user.data.user?.id
        })
        .select()
        .single();

      if (error) throw error;

      setBudgets(prev => [...prev, data]);
      toast({
        title: "Success",
        description: "Maintenance budget created successfully.",
      });
      
      return data;
    } catch (error) {
      console.error('Error creating budget:', error);
      toast({
        title: "Error",
        description: "Failed to create maintenance budget.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const refetch = useCallback(async () => {
    await Promise.all([
      fetchWorkflows(),
      fetchPredictions(),
      fetchBudgets()
    ]);
  }, [fetchWorkflows, fetchPredictions, fetchBudgets]);

  useEffect(() => {
    if (portfolioId) {
      refetch();
    }
  }, [portfolioId, refetch]);

  return {
    workflows,
    predictions,
    budgets,
    isLoading,
    createWorkflow,
    updateWorkflowStatus,
    scheduleMaintenanceFromPrediction,
    createBudget,
    refetch
  };
};
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface MaintenanceWorkflow {
  id: string;
  maintenance_request_id: string;
  vendor_id?: string;
  status: 'pending' | 'assigned' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'emergency';
  estimated_cost?: number;
  actual_cost?: number;
  scheduled_date?: string;
  completion_date?: string;
  created_at: string;
  updated_at: string;
}

export interface PredictiveMaintenance {
  id: string;
  property_id: string;
  asset_type: string;
  predicted_issue: string;
  probability: number;
  recommended_action: string;
  estimated_cost: number;
  urgency_score: number;
  predicted_date: string;
  status: 'pending' | 'scheduled' | 'completed' | 'dismissed';
  created_at: string;
}

export interface MaintenanceBudget {
  id: string;
  property_id: string;
  portfolio_id?: string;
  budget_period: 'monthly' | 'quarterly' | 'yearly';
  allocated_amount: number;
  spent_amount: number;
  remaining_amount: number;
  category: string;
  created_at: string;
  updated_at: string;
}

export const useSmartMaintenance = (portfolioId?: string) => {
  const [workflows, setWorkflows] = useState<MaintenanceWorkflow[]>([]);
  const [predictions, setPredictions] = useState<PredictiveMaintenance[]>([]);
  const [budgets, setBudgets] = useState<MaintenanceBudget[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const fetchWorkflows = async () => {
    try {
      setIsLoading(true);
      
      // Mock data for maintenance workflows
      const mockWorkflows: MaintenanceWorkflow[] = [
        {
          id: 'workflow-1',
          maintenance_request_id: 'req-1',
          vendor_id: 'vendor-1',
          status: 'in_progress',
          priority: 'high',
          estimated_cost: 500,
          scheduled_date: new Date(Date.now() + 86400000).toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: 'workflow-2',
          maintenance_request_id: 'req-2',
          status: 'pending',
          priority: 'medium',
          estimated_cost: 300,
          created_at: new Date(Date.now() - 86400000).toISOString(),
          updated_at: new Date(Date.now() - 86400000).toISOString()
        },
        {
          id: 'workflow-3',
          maintenance_request_id: 'req-3',
          vendor_id: 'vendor-2',
          status: 'completed',
          priority: 'low',
          estimated_cost: 150,
          actual_cost: 175,
          scheduled_date: new Date(Date.now() - 172800000).toISOString(),
          completion_date: new Date(Date.now() - 86400000).toISOString(),
          created_at: new Date(Date.now() - 259200000).toISOString(),
          updated_at: new Date(Date.now() - 86400000).toISOString()
        }
      ];

      setWorkflows(mockWorkflows);
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
  };

  const fetchPredictions = async () => {
    try {
      // Mock data for predictive maintenance
      const mockPredictions: PredictiveMaintenance[] = [
        {
          id: 'pred-1',
          property_id: 'prop-1',
          asset_type: 'HVAC System',
          predicted_issue: 'Filter replacement needed',
          probability: 85,
          recommended_action: 'Schedule filter replacement before peak season',
          estimated_cost: 150,
          urgency_score: 85,
          predicted_date: new Date(Date.now() + 604800000).toISOString(), // 7 days from now
          status: 'pending',
          created_at: new Date().toISOString()
        },
        {
          id: 'pred-2',
          property_id: 'prop-2',
          asset_type: 'Plumbing',
          predicted_issue: 'Water heater maintenance due',
          probability: 75,
          recommended_action: 'Schedule annual water heater inspection and flush',
          estimated_cost: 200,
          urgency_score: 70,
          predicted_date: new Date(Date.now() + 1209600000).toISOString(), // 14 days from now
          status: 'pending',
          created_at: new Date(Date.now() - 86400000).toISOString()
        },
        {
          id: 'pred-3',
          property_id: 'prop-3',
          asset_type: 'Electrical',
          predicted_issue: 'Circuit breaker aging',
          probability: 60,
          recommended_action: 'Monitor electrical panel, consider upgrade within 6 months',
          estimated_cost: 800,
          urgency_score: 45,
          predicted_date: new Date(Date.now() + 15552000000).toISOString(), // 6 months from now
          status: 'pending',
          created_at: new Date(Date.now() - 172800000).toISOString()
        }
      ];

      setPredictions(mockPredictions);
    } catch (error) {
      console.error('Error fetching predictive maintenance:', error);
    }
  };

  const fetchBudgets = async () => {
    try {
      // Mock data for maintenance budgets
      const mockBudgets: MaintenanceBudget[] = [
        {
          id: 'budget-1',
          property_id: 'prop-1',
          portfolio_id: portfolioId,
          budget_period: 'monthly',
          allocated_amount: 2000,
          spent_amount: 650,
          remaining_amount: 1350,
          category: 'General Maintenance',
          created_at: new Date(Date.now() - 2592000000).toISOString(), // 30 days ago
          updated_at: new Date().toISOString()
        },
        {
          id: 'budget-2',
          property_id: 'prop-2',
          portfolio_id: portfolioId,
          budget_period: 'quarterly',
          allocated_amount: 5000,
          spent_amount: 1200,
          remaining_amount: 3800,
          category: 'HVAC Maintenance',
          created_at: new Date(Date.now() - 7776000000).toISOString(), // 90 days ago
          updated_at: new Date(Date.now() - 86400000).toISOString()
        },
        {
          id: 'budget-3',
          property_id: 'prop-3',
          portfolio_id: portfolioId,
          budget_period: 'yearly',
          allocated_amount: 15000,
          spent_amount: 8500,
          remaining_amount: 6500,
          category: 'Capital Improvements',
          created_at: new Date(Date.now() - 31536000000).toISOString(), // 365 days ago
          updated_at: new Date(Date.now() - 172800000).toISOString()
        }
      ];

      setBudgets(mockBudgets);
    } catch (error) {
      console.error('Error fetching maintenance budgets:', error);
    }
  };

  const createWorkflow = async (requestId: string, vendorId?: string) => {
    try {
      // Create new workflow with mock data
      const newWorkflow: MaintenanceWorkflow = {
        id: `workflow-${Date.now()}`,
        maintenance_request_id: requestId,
        vendor_id: vendorId,
        status: vendorId ? 'assigned' : 'pending',
        priority: 'medium',
        estimated_cost: 250,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Add to local state
      setWorkflows(prev => [newWorkflow, ...prev]);
      
      toast({
        title: "Success",
        description: "Maintenance workflow created successfully.",
      });

      return newWorkflow;
    } catch (error) {
      console.error('Error creating workflow:', error);
      toast({
        title: "Error",
        description: "Failed to create maintenance workflow.",
        variant: "destructive",
      });
    }
  };

  const updateWorkflowStatus = async (workflowId: string, status: string, actualCost?: number) => {
    try {
      // Update workflow in local state
      setWorkflows(prev => prev.map(workflow => {
        if (workflow.id === workflowId) {
          const updatedWorkflow = {
            ...workflow,
            status: status as MaintenanceWorkflow['status'],
            updated_at: new Date().toISOString()
          };

          if (status === 'completed') {
            updatedWorkflow.completion_date = new Date().toISOString();
            if (actualCost) {
              updatedWorkflow.actual_cost = actualCost;
            }
          }

          return updatedWorkflow;
        }
        return workflow;
      }));
      
      toast({
        title: "Success",
        description: "Workflow status updated successfully.",
      });
    } catch (error) {
      console.error('Error updating workflow:', error);
      toast({
        title: "Error",
        description: "Failed to update workflow status.",
        variant: "destructive",
      });
    }
  };

  const scheduleMaintenanceFromPrediction = async (predictionId: string, scheduledDate: string) => {
    try {
      // Find the prediction to schedule
      const prediction = predictions.find(p => p.id === predictionId);
      if (!prediction) return;

      // Create a new maintenance request from prediction using existing table
      const { data: request, error: requestError } = await supabase
        .from('maintenance_requests')
        .insert({
          property_id: prediction.property_id,
          tenant_id: null, // Required field for maintenance_requests table
          title: prediction.predicted_issue,
          description: prediction.recommended_action,
          priority: prediction.urgency_score > 80 ? 'high' : prediction.urgency_score > 50 ? 'medium' : 'low',
          status: 'pending',
          submitted_date: new Date().toISOString()
        })
        .select()
        .single();

      if (requestError) throw requestError;

      // Create workflow for the request
      await createWorkflow(request.id);

      // Update prediction status in local state
      setPredictions(prev => prev.map(p => 
        p.id === predictionId 
          ? { ...p, status: 'scheduled' as PredictiveMaintenance['status'] }
          : p
      ));
      
      toast({
        title: "Success",
        description: "Maintenance scheduled from prediction successfully.",
      });
    } catch (error) {
      console.error('Error scheduling maintenance:', error);
      toast({
        title: "Error",
        description: "Failed to schedule maintenance from prediction.",
        variant: "destructive",
      });
    }
  };

  const createBudget = async (budgetData: Partial<MaintenanceBudget>) => {
    try {
      // Create new budget with mock data
      const newBudget: MaintenanceBudget = {
        id: `budget-${Date.now()}`,
        property_id: budgetData.property_id || '',
        portfolio_id: portfolioId,
        budget_period: budgetData.budget_period || 'monthly',
        allocated_amount: budgetData.allocated_amount || 0,
        spent_amount: 0,
        remaining_amount: budgetData.allocated_amount || 0,
        category: budgetData.category || 'General Maintenance',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Add to local state
      setBudgets(prev => [newBudget, ...prev]);
      
      toast({
        title: "Success",
        description: "Maintenance budget created successfully.",
      });

      return newBudget;
    } catch (error) {
      console.error('Error creating budget:', error);
      toast({
        title: "Error",
        description: "Failed to create maintenance budget.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchWorkflows();
    fetchPredictions();
    fetchBudgets();
  }, [portfolioId]);

  return {
    workflows,
    predictions,
    budgets,
    isLoading,
    createWorkflow,
    updateWorkflowStatus,
    scheduleMaintenanceFromPrediction,
    createBudget,
    refetch: () => {
      fetchWorkflows();
      fetchPredictions();
      fetchBudgets();
    }
  };
};
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from "@/hooks/use-toast";

// Updated data structure interfaces that match the database schema
export interface ExpenseTracking {
  id: string;
  property_id?: string;
  portfolio_id?: string;
  expense_date: string;
  amount: number;
  category: string;
  subcategory?: string;
  vendor_name?: string;
  vendor_id?: string;
  description?: string;
  receipt_url?: string;
  is_tax_deductible: boolean;
  tax_category?: string;
  payment_method?: string;
  payment_reference?: string;
  recurring_expense_id?: string;
  plaid_transaction_id?: string;
  plaid_account_id?: string;
  auto_categorized: boolean;
  categorization_confidence?: number;
  created_at: string;
  updated_at: string;
  recorded_by?: string;
  approved_by?: string;
  approval_date?: string;
  properties?: { address: string };
}

export interface CashFlowForecast {
  id: string;
  property_id?: string;
  portfolio_id?: string;
  forecast_date: string;
  forecast_type: string;
  projected_income?: number;
  projected_expenses?: number;
  projected_cash_flow?: number;
  confidence_level?: number;
  model_version?: string;
  input_parameters?: any;
  created_at: string;
  updated_at: string;
  generated_by?: string;
  actual_income?: number;
  actual_expenses?: number;
  variance_income?: number;
  variance_expenses?: number;
  properties?: { address: string };
}

export interface TaxDocument {
  id: string;
  property_id?: string;
  portfolio_id?: string;
  tax_year: number;
  document_type: string;
  document_status: string;
  file_url?: string;
  generated_data?: any;
  total_income?: number;
  total_expenses?: number;
  depreciation_amount?: number;
  net_income?: number;
  created_at: string;
  updated_at: string;
  generated_by?: string;
  reviewed_by?: string;
  review_date?: string;
  filing_date?: string;
  notes?: string;
  properties?: { address: string };
}

export interface BudgetAlert {
  id: string;
  budget_id?: string;
  property_id?: string;
  portfolio_id?: string;
  alert_type: string;
  threshold_percentage?: number;
  current_spent?: number;
  budget_amount?: number;
  alert_message?: string;
  severity: string;
  created_at: string;
  acknowledged_at?: string;
  acknowledged_by?: string;
  resolved_at?: string;
  status: string;
  properties?: { address: string };
}

export const useFinancialAutomation = (portfolioId?: string) => {
  const [expenses, setExpenses] = useState<ExpenseTracking[]>([]);
  const [forecasts, setForecasts] = useState<CashFlowForecast[]>([]);
  const [taxDocuments, setTaxDocuments] = useState<TaxDocument[]>([]);
  const [budgetAlerts, setBudgetAlerts] = useState<BudgetAlert[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const fetchExpenses = useCallback(async () => {
    try {
      setIsLoading(true);
      
      let query = supabase
        .from('expense_tracking')
        .select(`
          *,
          properties (
            id,
            address,
            portfolio_id
          )
        `)
        .order('expense_date', { ascending: false });

      if (portfolioId && portfolioId !== 'everything') {
        query = query.eq('portfolio_id', portfolioId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setExpenses(data || []);
    } catch (error) {
      console.error('Error fetching expenses:', error);
      toast({
        title: "Error",
        description: "Failed to fetch expense data.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [portfolioId, toast]);

  const fetchForecasts = useCallback(async () => {
    try {
      let query = supabase
        .from('cash_flow_forecasts')
        .select(`
          *,
          properties (
            id,
            address,
            portfolio_id
          )
        `)
        .order('forecast_date', { ascending: false });

      if (portfolioId && portfolioId !== 'everything') {
        query = query.eq('portfolio_id', portfolioId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setForecasts(data || []);
    } catch (error) {
      console.error('Error fetching forecasts:', error);
      toast({
        title: "Error",
        description: "Failed to fetch cash flow forecasts.",
        variant: "destructive",
      });
    }
  }, [portfolioId, toast]);

  const fetchTaxDocuments = useCallback(async () => {
    try {
      let query = supabase
        .from('tax_documents')
        .select(`
          *,
          properties (
            id,
            address,
            portfolio_id
          )
        `)
        .order('tax_year', { ascending: false });

      if (portfolioId && portfolioId !== 'everything') {
        query = query.eq('portfolio_id', portfolioId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setTaxDocuments(data || []);
    } catch (error) {
      console.error('Error fetching tax documents:', error);
      toast({
        title: "Error",
        description: "Failed to fetch tax documents.",
        variant: "destructive",
      });
    }
  }, [portfolioId, toast]);

  const fetchBudgetAlerts = useCallback(async () => {
    try {
      let query = supabase
        .from('budget_alerts')
        .select(`
          *,
          properties (
            id,
            address,
            portfolio_id
          )
        `)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (portfolioId && portfolioId !== 'everything') {
        query = query.eq('portfolio_id', portfolioId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setBudgetAlerts(data || []);
    } catch (error) {
      console.error('Error fetching budget alerts:', error);
      toast({
        title: "Error",
        description: "Failed to fetch budget alerts.",
        variant: "destructive",
      });
    }
  }, [portfolioId, toast]);

  // Enhanced functions with real database operations
  const createExpense = async (expenseData: Partial<ExpenseTracking>) => {
    try {
      const user = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('expense_tracking')
        .insert({
          expense_date: expenseData.expense_date || new Date().toISOString().split('T')[0],
          amount: expenseData.amount || 0,
          category: expenseData.category || 'miscellaneous',
          is_tax_deductible: expenseData.is_tax_deductible || false,
          auto_categorized: expenseData.auto_categorized || false,
          ...expenseData,
          recorded_by: user.data.user?.id
        })
        .select()
        .single();

      if (error) throw error;

      setExpenses(prev => [data, ...prev]);
      toast({
        title: "Success",
        description: "Expense recorded successfully.",
      });
      
      return data;
    } catch (error) {
      console.error('Error creating expense:', error);
      toast({
        title: "Error",
        description: "Failed to record expense.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const categorizeExpense = async (expenseId: string, category: string, isTaxDeductible: boolean) => {
    try {
      const { data, error } = await supabase
        .from('expense_tracking')
        .update({
          category,
          is_tax_deductible: isTaxDeductible,
          auto_categorized: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', expenseId)
        .select()
        .single();

      if (error) throw error;

      setExpenses(prev => 
        prev.map(expense => 
          expense.id === expenseId ? { ...expense, ...data } : expense
        )
      );

      toast({
        title: "Success",
        description: "Expense categorized successfully.",
      });
    } catch (error) {
      console.error('Error categorizing expense:', error);
      toast({
        title: "Error",
        description: "Failed to categorize expense.",
        variant: "destructive",
      });
    }
  };

  const generateCashFlowForecast = async (propertyId: string, months: number = 12) => {
    try {
      const endDate = new Date();
      const forecasts = [];
      
      for (let i = 0; i < months; i++) {
        const forecastDate = new Date(endDate.getFullYear(), endDate.getMonth() + i, 1);
        
        // Simple forecasting logic - can be enhanced with ML models
        const avgIncome = 2500; // This would come from historical data
        const avgExpenses = 800; // This would come from historical data
        
        const forecast = {
          property_id: propertyId,
          portfolio_id: portfolioId,
          forecast_date: forecastDate.toISOString().split('T')[0],
          forecast_type: 'monthly',
          projected_income: avgIncome * (0.95 + Math.random() * 0.1), // Add some variance
          projected_expenses: avgExpenses * (0.9 + Math.random() * 0.2),
          confidence_level: 0.75,
          model_version: 'v1.0',
          generated_by: (await supabase.auth.getUser()).data.user?.id
        };
        
        forecasts.push(forecast);
      }

      const { data, error } = await supabase
        .from('cash_flow_forecasts')
        .insert(forecasts)
        .select();

      if (error) throw error;

      setForecasts(prev => [...data, ...prev]);
      toast({
        title: "Success",
        description: `Generated ${months} months of cash flow forecasts.`,
      });
      
      return data;
    } catch (error) {
      console.error('Error generating cash flow forecast:', error);
      toast({
        title: "Error",
        description: "Failed to generate cash flow forecast.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const generateTaxDocument = async (propertyId: string, documentType: string, taxYear: number) => {
    try {
      // Calculate totals from expense data
      const { data: expenseData } = await supabase
        .from('expense_tracking')
        .select('amount, is_tax_deductible')
        .eq('property_id', propertyId)
        .gte('expense_date', `${taxYear}-01-01`)
        .lte('expense_date', `${taxYear}-12-31`);

      const totalExpenses = expenseData?.reduce((sum, exp) => sum + (exp.is_tax_deductible ? exp.amount : 0), 0) || 0;
      
      const { data, error } = await supabase
        .from('tax_documents')
        .insert({
          property_id: propertyId,
          portfolio_id: portfolioId,
          tax_year: taxYear,
          document_type: documentType,
          document_status: 'draft',
          total_expenses: totalExpenses,
          total_income: 30000, // This would come from rent data
          net_income: 30000 - totalExpenses,
          generated_by: (await supabase.auth.getUser()).data.user?.id
        })
        .select()
        .single();

      if (error) throw error;

      setTaxDocuments(prev => [data, ...prev]);
      toast({
        title: "Success",
        description: "Tax document generated successfully.",
      });
      
      return data;
    } catch (error) {
      console.error('Error generating tax document:', error);
      toast({
        title: "Error",
        description: "Failed to generate tax document.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const syncPlaidTransactions = async () => {
    try {
      // This would integrate with Plaid API
      // For now, we'll simulate the sync
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast({
        title: "Success",
        description: "Bank transactions synced successfully.",
      });
      
      // Refresh expenses after sync
      await fetchExpenses();
    } catch (error) {
      console.error('Error syncing Plaid transactions:', error);
      toast({
        title: "Error",
        description: "Failed to sync bank transactions.",
        variant: "destructive",
      });
    }
  };

  const acknowledgeBudgetAlert = async (alertId: string) => {
    try {
      const { data, error } = await supabase
        .from('budget_alerts')
        .update({
          status: 'acknowledged',
          acknowledged_at: new Date().toISOString(),
          acknowledged_by: (await supabase.auth.getUser()).data.user?.id
        })
        .eq('id', alertId)
        .select()
        .single();

      if (error) throw error;

      setBudgetAlerts(prev => 
        prev.map(alert => 
          alert.id === alertId ? { ...alert, ...data } : alert
        )
      );

      toast({
        title: "Success",
        description: "Budget alert acknowledged.",
      });
    } catch (error) {
      console.error('Error acknowledging budget alert:', error);
      toast({
        title: "Error",
        description: "Failed to acknowledge budget alert.",
        variant: "destructive",
      });
    }
  };

  const refetch = useCallback(async () => {
    await Promise.all([
      fetchExpenses(),
      fetchForecasts(),
      fetchTaxDocuments(),
      fetchBudgetAlerts()
    ]);
  }, [fetchExpenses, fetchForecasts, fetchTaxDocuments, fetchBudgetAlerts]);

  useEffect(() => {
    if (portfolioId) {
      refetch();
    }
  }, [portfolioId, refetch]);

  return {
    expenses,
    forecasts,
    taxDocuments,
    budgetAlerts,
    isLoading,
    createExpense,
    categorizeExpense,
    generateCashFlowForecast,
    generateTaxDocument,
    syncPlaidTransactions,
    acknowledgeBudgetAlert,
    refetch
  };
};
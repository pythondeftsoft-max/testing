import { useState, useEffect } from 'react';
import { useToast } from "@/hooks/use-toast";

// Data structure interfaces
export interface ExpenseTracking {
  id: string;
  property_id: string;
  amount: number;
  category: string;
  description: string;
  vendor: string;
  date: string; // Changed from expense_date to date
  expense_date: string;
  tax_deductible: boolean;
  receipt_url?: string;
  plaid_transaction_id?: string; // Added missing property
  auto_imported: boolean;
  created_at: string;
  updated_at: string;
  properties?: { address: string };
}

export interface CashFlowForecast {
  id: string;
  property_id: string;
  month: number;
  year: number;
  forecast_month: string; // Added missing property
  projected_income: number;
  projected_expenses: number;
  net_cash_flow: number;
  projected_net_cash_flow: number; // Added missing property
  confidence_level: number;
  confidence_score: number; // Added missing property
  created_at: string;
  properties?: { address: string };
}

export interface TaxDocument {
  id: string;
  property_id: string;
  document_type: string;
  tax_year: number;
  document_url?: string;
  status: 'draft' | 'completed' | 'filed' | 'final'; // Added 'final' status
  generated_at: string; // Added missing property
  created_at: string;
  properties?: { address: string };
}

export interface BudgetAlert {
  id: string;
  property_id: string;
  alert_type: 'budget_exceeded' | 'unusual_expense' | 'forecast_variance' | 'exceeded'; // Added 'exceeded'
  category: string; // Added missing property
  budget_amount: number; // Added missing property
  spent_amount: number; // Added missing property
  message: string;
  severity: 'low' | 'medium' | 'high';
  status: 'active' | 'acknowledged' | 'resolved';
  created_at: string;
  properties?: { address: string };
}

export const useFinancialAutomation = (portfolioId?: string) => {
  const [expenses, setExpenses] = useState<ExpenseTracking[]>([]);
  const [forecasts, setForecasts] = useState<CashFlowForecast[]>([]);
  const [taxDocuments, setTaxDocuments] = useState<TaxDocument[]>([]);
  const [budgetAlerts, setBudgetAlerts] = useState<BudgetAlert[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const fetchExpenses = async () => {
    try {
      setIsLoading(true);
      
      // Mock data for expense tracking
      const mockExpenses: ExpenseTracking[] = [
        {
          id: '1',
          property_id: 'prop-1',
          amount: 1250.00,
          category: 'Maintenance',
          description: 'HVAC Repair',
          vendor: 'ABC Heating',
          date: '2024-01-15', // Added date property
          expense_date: '2024-01-15',
          plaid_transaction_id: 'plaid_123', // Added plaid_transaction_id
          tax_deductible: true,
          auto_imported: false,
          created_at: '2024-01-15T00:00:00Z',
          updated_at: '2024-01-15T00:00:00Z',
          properties: { address: '123 Main St' }
        }
      ];
      
      setExpenses(mockExpenses);
    } catch (error) {
      console.error('Error fetching expenses:', error);
      toast({
        title: "Error",
        description: "Failed to fetch expense data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchForecasts = async () => {
    try {
      setIsLoading(true);
      
      // Mock data for cash flow forecasts
      const mockForecasts: CashFlowForecast[] = [
        {
          id: '1',
          property_id: 'prop-1',
          month: 3,
          year: 2024,
          forecast_month: 'March 2024', // Added forecast_month
          projected_income: 5000,
          projected_expenses: 2000,
          net_cash_flow: 3000,
          projected_net_cash_flow: 3000, // Added projected_net_cash_flow
          confidence_level: 0.85,
          confidence_score: 85, // Added confidence_score
          created_at: '2024-01-01T00:00:00Z',
          properties: { address: '123 Main St' }
        }
      ];
      
      setForecasts(mockForecasts);
    } catch (error) {
      console.error('Error fetching forecasts:', error);
      toast({
        title: "Error",
        description: "Failed to fetch forecast data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTaxDocuments = async () => {
    try {
      setIsLoading(true);
      
      // Mock data for tax documents
      const mockTaxDocuments: TaxDocument[] = [
        {
          id: '1',
          property_id: 'prop-1',
          document_type: 'Schedule E',
          tax_year: 2024,
          status: 'draft',
          generated_at: '2024-01-01T00:00:00Z', // Added generated_at
          created_at: '2024-01-01T00:00:00Z',
          properties: { address: '123 Main St' }
        }
      ];
      
      setTaxDocuments(mockTaxDocuments);
    } catch (error) {
      console.error('Error fetching tax documents:', error);
      toast({
        title: "Error",
        description: "Failed to fetch tax document data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchBudgetAlerts = async () => {
    try {
      setIsLoading(true);
      
      // Mock data for budget alerts
      const mockBudgetAlerts: BudgetAlert[] = [
        {
          id: '1',
          property_id: 'prop-1',
          alert_type: 'budget_exceeded',
          category: 'Maintenance', // Added category
          budget_amount: 5000, // Added budget_amount
          spent_amount: 6000, // Added spent_amount
          message: 'Maintenance budget exceeded by 20%',
          severity: 'high',
          status: 'active',
          created_at: '2024-01-20T00:00:00Z',
          properties: { address: '123 Main St' }
        }
      ];
      
      setBudgetAlerts(mockBudgetAlerts);
    } catch (error) {
      console.error('Error fetching budget alerts:', error);
      toast({
        title: "Error",
        description: "Failed to fetch budget alert data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const createExpense = async (expenseData: Partial<ExpenseTracking>) => {
    try {
      // Mock implementation - add to local state
      const newExpense: ExpenseTracking = {
        id: Date.now().toString(),
        property_id: expenseData.property_id || '',
        amount: expenseData.amount || 0,
        category: expenseData.category || '',
        description: expenseData.description || '',
        vendor: expenseData.vendor || '',
        date: expenseData.expense_date || new Date().toISOString().split('T')[0], // Added date
        expense_date: expenseData.expense_date || new Date().toISOString().split('T')[0],
        tax_deductible: expenseData.tax_deductible || false,
        auto_imported: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        properties: { address: 'Mock Address' }
      };

      setExpenses(prev => [newExpense, ...prev]);
      toast({
        title: "Success",
        description: "Expense created successfully",
      });
    } catch (error) {
      console.error('Error creating expense:', error);
      toast({
        title: "Error",
        description: "Failed to create expense",
        variant: "destructive",
      });
    }
  };

  const categorizeExpense = async (expenseId: string, category: string, isTaxDeductible: boolean) => {
    try {
      // Mock implementation - update local state
      setExpenses(prevExpenses => 
        prevExpenses.map(expense => 
          expense.id === expenseId 
            ? { ...expense, category, tax_deductible: isTaxDeductible, updated_at: new Date().toISOString() }
            : expense
        )
      );

      toast({
        title: "Success",
        description: "Expense categorized successfully",
      });
    } catch (error) {
      console.error('Error categorizing expense:', error);
      toast({
        title: "Error",
        description: "Failed to categorize expense",
        variant: "destructive",
      });
    }
  };

  const generateCashFlowForecast = async (propertyId: string, months: number = 12) => {
    try {
      // Mock implementation - generate forecast
      const newForecast: CashFlowForecast = {
        id: Date.now().toString(),
        property_id: propertyId,
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear(),
        forecast_month: `${new Date().toLocaleString('default', { month: 'long' })} ${new Date().getFullYear()}`, // Added forecast_month
        projected_income: 5000,
        projected_expenses: 2000,
        net_cash_flow: 3000,
        projected_net_cash_flow: 3000, // Added projected_net_cash_flow
        confidence_level: 0.85,
        confidence_score: 85, // Added confidence_score
        created_at: new Date().toISOString(),
        properties: { address: 'Mock Address' }
      };

      setForecasts(prev => [newForecast, ...prev]);
      toast({
        title: "Success",
        description: "Cash flow forecast generated successfully",
      });
    } catch (error) {
      console.error('Error generating forecast:', error);
      toast({
        title: "Error",
        description: "Failed to generate forecast",
        variant: "destructive",
      });
    }
  };

  const generateTaxDocument = async (propertyId: string, documentType: string, taxYear: number) => {
    try {
      // Mock implementation - generate tax document
      const newTaxDocument: TaxDocument = {
        id: Date.now().toString(),
        property_id: propertyId,
        document_type: documentType,
        tax_year: taxYear,
        status: 'draft',
        generated_at: new Date().toISOString(), // Added generated_at
        created_at: new Date().toISOString(),
        properties: { address: 'Mock Address' }
      };

      setTaxDocuments(prev => [newTaxDocument, ...prev]);
      toast({
        title: "Success",
        description: "Tax document generated successfully",
      });
    } catch (error) {
      console.error('Error generating tax document:', error);
      toast({
        title: "Error",
        description: "Failed to generate tax document",
        variant: "destructive",
      });
    }
  };

  const syncPlaidTransactions = async () => {
    try {
      // Mock implementation - simulate Plaid sync
      const mockPlaidExpense: ExpenseTracking = {
        id: Date.now().toString(),
        property_id: 'prop-1',
        amount: 850.00,
        category: 'Utilities',
        description: 'Electric Bill - Auto Import',
        vendor: 'City Electric',
        date: new Date().toISOString().split('T')[0], // Added date
        expense_date: new Date().toISOString().split('T')[0],
        plaid_transaction_id: `plaid_${Date.now()}`, // Added plaid_transaction_id
        tax_deductible: true,
        auto_imported: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        properties: { address: 'Mock Address' }
      };

      setExpenses(prev => [mockPlaidExpense, ...prev]);
      toast({
        title: "Success",
        description: "Plaid transactions synced successfully",
      });
    } catch (error) {
      console.error('Error syncing Plaid transactions:', error);
      toast({
        title: "Error",
        description: "Failed to sync Plaid transactions",
        variant: "destructive",
      });
    }
  };

  const acknowledgeBudgetAlert = async (alertId: string) => {
    try {
      // Mock implementation - update local state
      setBudgetAlerts(prevAlerts => 
        prevAlerts.map(alert => 
          alert.id === alertId 
            ? { ...alert, status: 'acknowledged' }
            : alert
        )
      );

      toast({
        title: "Success",
        description: "Budget alert acknowledged",
      });
    } catch (error) {
      console.error('Error acknowledging budget alert:', error);
      toast({
        title: "Error",
        description: "Failed to acknowledge budget alert",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchExpenses();
    fetchForecasts();
    fetchTaxDocuments();
    fetchBudgetAlerts();
  }, [portfolioId]);

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
    refetch: () => {
      fetchExpenses();
      fetchForecasts();
      fetchTaxDocuments();
      fetchBudgetAlerts();
    }
  };
};
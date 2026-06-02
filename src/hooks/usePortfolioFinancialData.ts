import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// Balance Sheet Data Types
export interface BalanceSheetData {
  total_cash: number;
  total_receivables: number;
  total_assets: number;
  total_payables: number;
  total_liabilities: number;
  total_equity: number;
  security_deposits_held: number;
  property_count: number;
  occupied_units: number;
}

// Cash Flow Data Types
export interface CashFlowData {
  operating_income: number;
  operating_expenses: number;
  net_operating_cash: number;
  investing_cash_flow: number;
  financing_cash_flow: number;
  net_cash_flow: number;
}

// Rent Roll Data Types
export interface RentRollData {
  property_id: string;
  property_address: string;
  unit_number: string;
  tenant_name: string;
  lease_start_date: string;
  lease_end_date: string;
  monthly_rent: number;
  security_deposit: number;
  rent_status: string;
  days_vacant: number;
}

// Profit & Loss Data Types
export interface ProfitLossData {
  total_rental_income: number;
  total_late_fees: number;
  total_application_fees: number;
  total_other_income: number;
  total_revenue: number;
  total_management_fees: number;
  total_maintenance_costs: number;
  total_insurance_costs: number;
  total_property_taxes: number;
  total_utilities: number;
  total_professional_fees: number;
  total_marketing_costs: number;
  total_office_expenses: number;
  total_operating_expenses: number;
  net_operating_income: number;
  total_interest_income: number;
  total_interest_expense: number;
  total_depreciation: number;
  total_other_expenses: number;
  net_income: number;
  property_count: number;
}

// Owner Statement Data Types
export interface OwnerStatementData {
  property_count: number;
  total_units: number;
  total_rental_collected: number;
  total_late_fees: number;
  total_application_fees: number;
  total_other_income: number;
  total_income: number;
  total_management_fees: number;
  total_maintenance: number;
  total_landscaping: number;
  total_utilities: number;
  total_insurance: number;
  total_other_expenses: number;
  total_expenses: number;
  net_income: number;
  previous_balance: number;
  reserve_allocation: number;
  available_for_distribution: number;
  recommended_distribution: number;
  occupancy_rate: number;
  average_rent: number;
  management_fee_rate: number;
}

// Management Fees Data Types
export interface ManagementFeesData {
  property_id: string;
  property_address: string;
  unit_count: number;
  collected_rent: number;
  base_management_fee: number;
  leasing_fees: number;
  renewal_fees: number;
  other_fees: number;
  total_fees: number;
  management_fee_rate: number;
}

// Hook for Balance Sheet data
export const usePortfolioBalanceSheet = (portfolioId: string, asOfDate?: string) => {
  return useQuery({
    queryKey: ['portfolio-balance-sheet', portfolioId, asOfDate],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_portfolio_balance_sheet', {
        p_portfolio_id: portfolioId,
        p_as_of_date: asOfDate || new Date().toISOString().split('T')[0]
      });

      if (error) throw error;
      return data?.[0] as BalanceSheetData;
    },
    enabled: !!portfolioId,
  });
};

// Hook for Cash Flow data
export const usePortfolioCashFlow = (portfolioId: string, startDate: string, endDate: string) => {
  return useQuery({
    queryKey: ['portfolio-cash-flow', portfolioId, startDate, endDate],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_portfolio_cash_flow', {
        p_portfolio_id: portfolioId,
        p_start_date: startDate,
        p_end_date: endDate
      });

      if (error) throw error;
      return data?.[0] as CashFlowData;
    },
    enabled: !!portfolioId && !!startDate && !!endDate,
  });
};

// Hook for Rent Roll data
export const usePortfolioRentRoll = (portfolioId: string, asOfDate?: string) => {
  return useQuery({
    queryKey: ['portfolio-rent-roll', portfolioId, asOfDate],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_portfolio_rent_roll', {
        p_portfolio_id: portfolioId,
        p_as_of_date: asOfDate || new Date().toISOString().split('T')[0]
      });

      if (error) throw error;
      return data as RentRollData[];
    },
    enabled: !!portfolioId,
  });
};

// Hook for Portfolio Properties (used for owner statements and other reports)
export const usePortfolioProperties = (portfolioId: string) => {
  return useQuery({
    queryKey: ['portfolio-properties', portfolioId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('properties')
        .select(`
          *,
          property_applications!inner(
            *,
            profiles(first_name, last_name, email)
          )
        `)
        .eq('portfolio_id', portfolioId)
        .is('deleted_at', null);

      if (error) throw error;
      return data;
    },
    enabled: !!portfolioId,
  });
};

// Hook for Portfolio Transactions (for detailed cash flow analysis)
export const usePortfolioTransactions = (portfolioId: string, startDate: string, endDate: string) => {
  return useQuery({
    queryKey: ['portfolio-transactions', portfolioId, startDate, endDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('portfolio_transactions')
        .select('*')
        .eq('portfolio_id', portfolioId)
        .gte('transaction_date', startDate)
        .lte('transaction_date', endDate)
        .order('transaction_date', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!portfolioId && !!startDate && !!endDate,
  });
};

// Hook for Portfolio Financial Accounts
export const usePortfolioFinancialAccounts = (portfolioId: string) => {
  return useQuery({
    queryKey: ['portfolio-financial-accounts', portfolioId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('portfolio_financial_accounts')
        .select('*')
        .eq('portfolio_id', portfolioId)
        .order('account_type', { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!portfolioId,
  });
};

// Hook for Profit & Loss data
export const usePortfolioProfitLoss = (portfolioId: string, startDate: string, endDate: string) => {
  return useQuery({
    queryKey: ['portfolio-profit-loss', portfolioId, startDate, endDate],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_portfolio_profit_loss', {
        p_portfolio_id: portfolioId,
        p_start_date: startDate,
        p_end_date: endDate
      });

      if (error) throw error;
      return data?.[0] as ProfitLossData;
    },
    enabled: !!portfolioId && !!startDate && !!endDate,
  });
};

// Hook for Owner Statement data
export const usePortfolioOwnerStatement = (portfolioId: string, startDate: string, endDate: string) => {
  return useQuery({
    queryKey: ['portfolio-owner-statement', portfolioId, startDate, endDate],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_portfolio_owner_statement', {
        p_portfolio_id: portfolioId,
        p_start_date: startDate,
        p_end_date: endDate
      });

      if (error) throw error;
      return data?.[0] as OwnerStatementData;
    },
    enabled: !!portfolioId && !!startDate && !!endDate,
  });
};

// Hook for Management Fees data
export const usePortfolioManagementFees = (portfolioId: string, startDate: string, endDate: string) => {
  return useQuery({
    queryKey: ['portfolio-management-fees', portfolioId, startDate, endDate],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_portfolio_management_fees', {
        p_portfolio_id: portfolioId,
        p_start_date: startDate,
        p_end_date: endDate
      });

      if (error) throw error;
      return data as ManagementFeesData[];
    },
    enabled: !!portfolioId && !!startDate && !!endDate,
  });
};
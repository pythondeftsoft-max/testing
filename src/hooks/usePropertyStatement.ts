import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface PropertyStatementData {
  property_id: string;
  property_address: string;
  // Beginning Balance
  beginning_cash_balance: number;
  
  // Cash Receipts (consolidated)
  income: number; // rental + other income combined
  owner_contributions: number;
  other_additions: number;
  total_cash_receipts: number;
  total_cash_available: number;
  
  // Cash Disbursements (consolidated)
  expenses: number; // operating + mortgage + other expenses combined
  owner_draws: number;
  other_subtractions: number;
  total_cash_disbursements: number;
  
  // Adjustments
  tenant_deposits_held: number;
  property_reserve: number;
  available_for_payment: number;
  
  // Ending Balance
  ending_cash_balance: number;
  calculated_ending_balance: number;
  
  // Income Statement (when enabled)
  net_income?: number;
}

export interface PropertyStatementParams {
  propertyIds?: string[];
  unitIds?: string[];
  portfolioId?: string;
  dateRange: {
    from: string;
    to: string;
  };
  includeIncomeStatement?: boolean;
}

export function usePropertyStatement() {
  const [data, setData] = useState<PropertyStatementData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasRunParams, setHasRunParams] = useState<PropertyStatementParams | null>(null);

  const runReport = useCallback(async (params: PropertyStatementParams) => {
    setHasRunParams(params);
    setIsLoading(true);
    setError(null);

    try {
      // Base query for properties
      let query = supabase
        .from('properties')
        .select(`
          id,
          address,
          beginning_cash_balance,
          ending_cash_balance,
          owner_contributions,
          owner_draws,
          other_additions,
          other_subtractions,
          property_reserve,
          tenant_security_deposits_held,
          other_income,
          other_expenses,
          monthly_rent,
          mortgage_cost,
          insurance_cost,
          property_taxes,
          management_fee,
          repair_costs,
          property_units(
            id,
            unit_number,
            monthly_rent
          )
        `);

      // Apply filters
      if (params.propertyIds && params.propertyIds.length > 0) {
        query = query.in('id', params.propertyIds);
      }
      if (params.portfolioId && params.portfolioId !== 'all') {
        query = query.eq('portfolio_id', params.portfolioId);
      }

      const { data: properties, error: propertiesError } = await query;
      
      if (propertiesError) throw propertiesError;
      if (!properties) {
        setData([]);
        return;
      }

      const reportData: PropertyStatementData[] = [];

      for (const property of properties) {
        // Use property data already fetched
        const propertyData = property;

        // Get rent payments for the period (cash receipts)
        const { data: rentPayments, error: paymentsError } = await supabase
          .from('rent_payments')
          .select('amount, payment_date, payment_type, late_fee_amount')
          .eq('property_id', property.id)
          .gte('payment_date', params.dateRange.from)
          .lte('payment_date', params.dateRange.to)
          .eq('status', 'completed');

        if (paymentsError) {
          console.error('Error fetching rent payments:', paymentsError);
        }

        // Get cash flow transactions for the period
        const { data: cashFlowTransactions, error: cashFlowError } = await supabase
          .from('property_cash_flow')
          .select('amount, transaction_type, category, transaction_date')
          .eq('property_id', property.id)
          .gte('transaction_date', params.dateRange.from)
          .lte('transaction_date', params.dateRange.to);

        if (cashFlowError) {
          console.error('Error fetching cash flow transactions:', cashFlowError);
        }

        // Calculate cash receipts (simplified and consolidated)
        const rentalIncome = rentPayments?.reduce((sum, payment) => 
          sum + (payment.amount || 0), 0) || 0;
        
        const otherIncomeReceived = (propertyData.other_income || 0) + (cashFlowTransactions?.reduce((sum, transaction) => 
          transaction.transaction_type === 'receipt' && transaction.category === 'other_income' 
            ? sum + transaction.amount : sum, 0) || 0);
        
        // Consolidated income (rental + other)
        const totalIncome = rentalIncome + otherIncomeReceived;
        
        const ownerContributionsReceived = (propertyData.owner_contributions || 0) + (cashFlowTransactions?.reduce((sum, transaction) => 
          transaction.transaction_type === 'receipt' && transaction.category === 'owner_contribution' 
            ? sum + transaction.amount : sum, 0) || 0);
        
        const otherAdditions = propertyData.other_additions || 0;

        const totalCashReceipts = totalIncome + ownerContributionsReceived + otherAdditions;

        // Calculate cash disbursements (simplified and consolidated)
        const operatingExpensesPaid = cashFlowTransactions?.reduce((sum, transaction) => 
          transaction.transaction_type === 'disbursement' && transaction.category === 'operating_expense' 
            ? sum + transaction.amount : sum, 0) || 0;
        
        const mortgagePaymentsPaid = cashFlowTransactions?.reduce((sum, transaction) => 
          transaction.transaction_type === 'disbursement' && transaction.category === 'mortgage_payment' 
            ? sum + transaction.amount : sum, 0) || 0;
        
        const otherExpensesPaid = (propertyData.other_expenses || 0) + (cashFlowTransactions?.reduce((sum, transaction) => 
          transaction.transaction_type === 'disbursement' && transaction.category === 'other_expense' 
            ? sum + transaction.amount : sum, 0) || 0);
        
        // Consolidated expenses (operating + mortgage + other)
        const totalExpenses = operatingExpensesPaid + mortgagePaymentsPaid + otherExpensesPaid;
        
        const ownerDrawsPaid = (propertyData.owner_draws || 0) + (cashFlowTransactions?.reduce((sum, transaction) => 
          transaction.transaction_type === 'disbursement' && transaction.category === 'owner_draw' 
            ? sum + transaction.amount : sum, 0) || 0);
        
        const otherSubtractions = propertyData.other_subtractions || 0;

        const totalCashDisbursements = totalExpenses + ownerDrawsPaid + otherSubtractions;

        // Calculate balances
        const beginningBalance = propertyData.beginning_cash_balance || 0;
        const totalCashAvailable = beginningBalance + totalCashReceipts;
        const calculatedEndingBalance = totalCashAvailable - totalCashDisbursements;
        
        // Calculate adjustments
        const tenantDepositsHeld = propertyData.tenant_security_deposits_held || 0;
        const propertyReserve = propertyData.property_reserve || 0;
        const availableForPayment = calculatedEndingBalance - tenantDepositsHeld - propertyReserve;
        
        // Calculate net income (for income statement when enabled)
        const netIncome = totalIncome - totalExpenses;

        reportData.push({
          property_id: property.id,
          property_address: propertyData.address || 'N/A',
          beginning_cash_balance: beginningBalance,
          income: totalIncome,
          owner_contributions: ownerContributionsReceived,
          other_additions: otherAdditions,
          total_cash_receipts: totalCashReceipts,
          total_cash_available: totalCashAvailable,
          expenses: totalExpenses,
          owner_draws: ownerDrawsPaid,
          other_subtractions: otherSubtractions,
          total_cash_disbursements: totalCashDisbursements,
          tenant_deposits_held: tenantDepositsHeld,
          property_reserve: propertyReserve,
          available_for_payment: availableForPayment,
          ending_cash_balance: propertyData.ending_cash_balance || calculatedEndingBalance,
          calculated_ending_balance: calculatedEndingBalance,
          net_income: netIncome,
        });
      }

      setData(reportData);
    } catch (err) {
      console.error('Error generating property statement:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    data,
    isLoading,
    error,
    runReport,
    hasRunParams
  };
}
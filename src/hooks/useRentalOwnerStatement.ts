import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface RentalOwnerStatementData {
  summary_by_property: PropertySummary[];
  income_statement: IncomeStatementData;
  detail_transactions: TransactionDetail[];
  totals: StatementTotals;
}

export interface PropertySummary {
  property_id: string;
  property_address: string;
  owner_name: string;
  beginning_balance: number;
  additions_to_cash: number;
  subtractions_from_cash: number;
  ending_balance: number;
  adjustments: number;
  available_for_payment: number;
  rent_income: number;
  late_fees: number;
  other_income: number;
  owner_contributions: number;
  repairs_maintenance: number;
  management_fees: number;
  other_expenses: number;
  owner_draws: number;
}

export interface IncomeStatementData {
  total_rent_income: number;
  total_late_fees: number;
  total_other_income: number;
  total_income: number;
  total_repairs_maintenance: number;
  total_management_fees: number;
  total_other_expenses: number;
  total_expenses: number;
  net_income: number;
}

export interface TransactionDetail {
  transaction_date: string;
  property_address: string;
  unit_number?: string;
  account_name: string;
  transaction_name: string;
  memo?: string;
  additions_to_cash: number;
  subtractions_from_cash: number;
  running_balance: number;
}

export interface StatementTotals {
  total_beginning_balance: number;
  total_additions: number;
  total_subtractions: number;
  total_ending_balance: number;
  total_adjustments: number;
  total_available_for_payment: number;
}

export interface RentalOwnerStatementParams {
  portfolioId?: string;
  propertyIds?: string[];
  startDate: string;
  endDate: string;
  includeIncomeStatement: boolean;
  includeTransactionDetails: boolean;
  displayTransactionsBy: 'date' | 'additions_subtractions';
}

export const useRentalOwnerStatement = (params?: RentalOwnerStatementParams) => {
  return useQuery({
    queryKey: ['rental-owner-statement', params],
    queryFn: async (): Promise<RentalOwnerStatementData> => {
      if (!params) {
        throw new Error('Parameters required');
      }

      const { 
        portfolioId, 
        propertyIds, 
        startDate, 
        endDate, 
        includeIncomeStatement, 
        includeTransactionDetails, 
        displayTransactionsBy 
      } = params;

      // Build property filter
      let propertyQuery = supabase
        .from('properties')
        .select(`
          id,
          address,
          owner_id,
          portfolio_id,
          beginning_cash_balance,
          ending_cash_balance,
          tenant_security_deposits_held,
          property_reserve,
          owner_contributions,
          owner_draws,
          monthly_rent,
          late_fee_income,
          other_income,
          repair_costs,
          management_fee,
          profiles!properties_owner_id_fkey(first_name, last_name, company_name)
        `)
        .is('deleted_at', null);

      // Apply portfolio filter
      if (portfolioId && portfolioId !== 'all') {
        propertyQuery = propertyQuery.eq('portfolio_id', portfolioId);
      }

      // Apply specific property filter
      if (propertyIds && propertyIds.length > 0) {
        propertyQuery = propertyQuery.in('id', propertyIds);
      }

      const { data: properties, error: propertiesError } = await propertyQuery;

      if (propertiesError) {
        console.error('Error fetching properties:', propertiesError);
        throw propertiesError;
      }

      if (!properties || properties.length === 0) {
        return {
          summary_by_property: [],
          income_statement: {
            total_rent_income: 0,
            total_late_fees: 0,
            total_other_income: 0,
            total_income: 0,
            total_repairs_maintenance: 0,
            total_management_fees: 0,
            total_other_expenses: 0,
            total_expenses: 0,
            net_income: 0
          },
          detail_transactions: [],
          totals: {
            total_beginning_balance: 0,
            total_additions: 0,
            total_subtractions: 0,
            total_ending_balance: 0,
            total_adjustments: 0,
            total_available_for_payment: 0
          }
        };
      }

      const propertyIds_filtered = properties.map(p => p.id);

      // Conditionally fetch cash flow transactions only if needed
      let cashFlowData = null;
      let rentPayments = null;
      
      if (includeTransactionDetails || includeIncomeStatement) {
        // Fetch cash flow transactions
        const { data: cashFlowResult, error: cashFlowError } = await supabase
          .from('property_cash_flow')
          .select(`
            id,
            property_id,
            transaction_date,
            transaction_type,
            category,
            amount,
            description,
            reference_number,
            properties!inner(address)
          `)
          .in('property_id', propertyIds_filtered)
          .gte('transaction_date', startDate)
          .lte('transaction_date', endDate)
          .order('transaction_date', { ascending: displayTransactionsBy === 'date' });

        if (cashFlowError) {
          console.error('Error fetching cash flow data:', cashFlowError);
          throw cashFlowError;
        }
        cashFlowData = cashFlowResult;

        // Fetch rent payments for the period
        const { data: rentResult, error: rentError } = await supabase
          .from('rent_payments')
          .select(`
            id,
            property_id,
            amount,
            late_fee_amount,
            payment_date,
            due_date,
            properties!inner(address)
          `)
          .in('property_id', propertyIds_filtered)
          .gte('payment_date', startDate)
          .lte('payment_date', endDate);

        if (rentError) {
          console.error('Error fetching rent payments:', rentError);
          throw rentError;
        }
        rentPayments = rentResult;
      }

      // Process data for each property
      const summaryByProperty: PropertySummary[] = properties.map(property => {
        const owner = property.profiles;
        const ownerName = owner?.company_name || 
                         (owner?.first_name && owner?.last_name ? `${owner.first_name} ${owner.last_name}` : 'Unknown Owner');

        // Calculate rent income from payments (use actual data if available, fallback to property data)
        const propertyRentPayments = rentPayments?.filter(rp => rp.property_id === property.id) || [];
        const rentIncome = propertyRentPayments.length > 0 
          ? propertyRentPayments.reduce((sum, rp) => sum + (rp.amount || 0), 0)
          : (property.monthly_rent || 0); // Fallback to monthly rent if payments not available
        
        const lateFees = propertyRentPayments.length > 0
          ? propertyRentPayments.reduce((sum, rp) => sum + (rp.late_fee_amount || 0), 0)
          : (property.late_fee_income || 0); // Fallback to property late fee income

        // Calculate cash flow items from transactions (use actual data if available, fallback to property data)
        const propertyCashFlow = cashFlowData?.filter(cf => cf.property_id === property.id) || [];
        
        const cashFlowOwnerContributions = propertyCashFlow.length > 0
          ? propertyCashFlow
              .filter(cf => cf.category === 'owner_contribution')
              .reduce((sum, cf) => sum + (cf.amount || 0), 0)
          : 0;

        const cashFlowOwnerDraws = propertyCashFlow.length > 0
          ? propertyCashFlow
              .filter(cf => cf.category === 'owner_draw')
              .reduce((sum, cf) => sum + (cf.amount || 0), 0)
          : 0;

        const cashFlowRepairsMaintenance = propertyCashFlow.length > 0
          ? propertyCashFlow
              .filter(cf => cf.category === 'repairs' || cf.category === 'maintenance' || cf.category === 'maintenance_repair')
              .reduce((sum, cf) => sum + (cf.amount || 0), 0)
          : 0;

        const cashFlowManagementFees = propertyCashFlow.length > 0
          ? propertyCashFlow
              .filter(cf => cf.category === 'management_fee')
              .reduce((sum, cf) => sum + (cf.amount || 0), 0)
          : 0;

        const cashFlowOtherExpenses = propertyCashFlow.length > 0
          ? propertyCashFlow
              .filter(cf => cf.transaction_type === 'expense' && !['repairs', 'maintenance', 'maintenance_repair', 'management_fee'].includes(cf.category || ''))
              .reduce((sum, cf) => sum + (cf.amount || 0), 0)
          : 0;

        const cashFlowOtherIncome = propertyCashFlow.length > 0
          ? propertyCashFlow
              .filter(cf => cf.transaction_type === 'income' && cf.category !== 'rent' && cf.category !== 'rental_income')
              .reduce((sum, cf) => sum + (cf.amount || 0), 0)
          : 0;

        // Combine property fields with cash flow data for final calculations
        const ownerContributions = (property.owner_contributions || 0) + cashFlowOwnerContributions;
        const ownerDraws = (property.owner_draws || 0) + cashFlowOwnerDraws;
        const repairsMaintenance = (property.repair_costs || 0) + cashFlowRepairsMaintenance;
        const managementFees = (property.management_fee || 0) + cashFlowManagementFees;
        const otherExpenses = cashFlowOtherExpenses;
        const otherIncome = (property.other_income || 0) + lateFees + cashFlowOtherIncome;

        const beginningBalance = property.beginning_cash_balance || 0;
        const additionsToCash = rentIncome + lateFees + otherIncome + ownerContributions;
        const subtractionsFromCash = repairsMaintenance + managementFees + otherExpenses + ownerDraws;
        const endingBalance = beginningBalance + additionsToCash - subtractionsFromCash;
        
        // Adjustments are security deposits and reserves
        const adjustments = (property.tenant_security_deposits_held || 0) + (property.property_reserve || 0);
        const availableForPayment = endingBalance - adjustments;

        return {
          property_id: property.id,
          property_address: property.address || 'Unknown Address',
          owner_name: ownerName,
          beginning_balance: beginningBalance,
          additions_to_cash: additionsToCash,
          subtractions_from_cash: subtractionsFromCash,
          ending_balance: endingBalance,
          adjustments: adjustments,
          available_for_payment: availableForPayment,
          rent_income: rentIncome,
          late_fees: lateFees,
          other_income: otherIncome - lateFees, // Remove lateFees from other_income since it's counted separately
          owner_contributions: ownerContributions,
          repairs_maintenance: repairsMaintenance,
          management_fees: managementFees,
          other_expenses: otherExpenses,
          owner_draws: ownerDraws
        };
      });

      // Calculate income statement totals (only if requested)
      const incomeStatement: IncomeStatementData = includeIncomeStatement ? {
        total_rent_income: summaryByProperty.reduce((sum, p) => sum + p.rent_income, 0),
        total_late_fees: summaryByProperty.reduce((sum, p) => sum + p.late_fees, 0),
        total_other_income: summaryByProperty.reduce((sum, p) => sum + p.other_income, 0),
        total_income: 0, // Will be calculated below
        total_repairs_maintenance: summaryByProperty.reduce((sum, p) => sum + p.repairs_maintenance, 0),
        total_management_fees: summaryByProperty.reduce((sum, p) => sum + p.management_fees, 0),
        total_other_expenses: summaryByProperty.reduce((sum, p) => sum + p.other_expenses, 0),
        total_expenses: 0, // Will be calculated below
        net_income: 0 // Will be calculated below
      } : {
        total_rent_income: 0,
        total_late_fees: 0,
        total_other_income: 0,
        total_income: 0,
        total_repairs_maintenance: 0,
        total_management_fees: 0,
        total_other_expenses: 0,
        total_expenses: 0,
        net_income: 0
      };

      if (includeIncomeStatement) {
        incomeStatement.total_income = incomeStatement.total_rent_income + incomeStatement.total_late_fees + incomeStatement.total_other_income;
        incomeStatement.total_expenses = incomeStatement.total_repairs_maintenance + incomeStatement.total_management_fees + incomeStatement.total_other_expenses;
        incomeStatement.net_income = incomeStatement.total_income - incomeStatement.total_expenses;
      }

      // Generate detailed transactions (only if requested)
      const detailTransactions: TransactionDetail[] = [];
      
      if (includeTransactionDetails && rentPayments && cashFlowData) {
        // Add beginning balance entries
        summaryByProperty.forEach(property => {
          if (property.beginning_balance !== 0) {
            detailTransactions.push({
              transaction_date: startDate,
              property_address: property.property_address,
              account_name: 'Cash',
              transaction_name: 'Beginning Cash Balance',
              memo: 'Opening balance',
              additions_to_cash: property.beginning_balance > 0 ? property.beginning_balance : 0,
              subtractions_from_cash: property.beginning_balance < 0 ? Math.abs(property.beginning_balance) : 0,
              running_balance: property.beginning_balance
            });
          }
        });

        // Add rent payment transactions
        rentPayments.forEach(payment => {
          const property = properties.find(p => p.id === payment.property_id);
          detailTransactions.push({
            transaction_date: payment.payment_date || payment.due_date,
            property_address: property?.address || 'Unknown Property',
            account_name: 'Rent Income',
            transaction_name: 'Rent Payment',
            memo: `Payment for ${payment.due_date}`,
            additions_to_cash: payment.amount || 0,
            subtractions_from_cash: 0,
            running_balance: 0 // Will be calculated after sorting
          });

          if (payment.late_fee_amount && payment.late_fee_amount > 0) {
            detailTransactions.push({
              transaction_date: payment.payment_date || payment.due_date,
              property_address: property?.address || 'Unknown Property',
              account_name: 'Late Fee Income',
              transaction_name: 'Late Fee',
              memo: `Late fee for ${payment.due_date}`,
              additions_to_cash: payment.late_fee_amount,
              subtractions_from_cash: 0,
              running_balance: 0
            });
          }
        });

        // Add cash flow transactions
        cashFlowData.forEach(transaction => {
          const property = properties.find(p => p.id === transaction.property_id);
          const isAddition = transaction.transaction_type === 'income' || transaction.category === 'owner_contribution';
          
          detailTransactions.push({
            transaction_date: transaction.transaction_date,
            property_address: property?.address || 'Unknown Property',
            account_name: transaction.category || 'General',
            transaction_name: transaction.description || 'Transaction',
            memo: transaction.reference_number || '',
            additions_to_cash: isAddition ? (transaction.amount || 0) : 0,
            subtractions_from_cash: !isAddition ? (transaction.amount || 0) : 0,
            running_balance: 0
          });
        });

        // Sort transactions based on display preference
        if (displayTransactionsBy === 'date') {
          detailTransactions.sort((a, b) => new Date(a.transaction_date).getTime() - new Date(b.transaction_date).getTime());
        } else if (displayTransactionsBy === 'additions_subtractions') {
          // Group by additions first, then subtractions, then by date within each group
          detailTransactions.sort((a, b) => {
            // First, sort by type (additions first, then subtractions)
            const aIsAddition = a.additions_to_cash > 0;
            const bIsAddition = b.additions_to_cash > 0;
            
            if (aIsAddition && !bIsAddition) return -1;
            if (!aIsAddition && bIsAddition) return 1;
            
            // Within the same type, sort by date
            return new Date(a.transaction_date).getTime() - new Date(b.transaction_date).getTime();
          });
        }

        // Calculate running balances
        let runningBalance = 0;
        detailTransactions.forEach(transaction => {
          runningBalance += transaction.additions_to_cash - transaction.subtractions_from_cash;
          transaction.running_balance = runningBalance;
        });
      }

      // Calculate totals
      const totals: StatementTotals = {
        total_beginning_balance: summaryByProperty.reduce((sum, p) => sum + p.beginning_balance, 0),
        total_additions: summaryByProperty.reduce((sum, p) => sum + p.additions_to_cash, 0),
        total_subtractions: summaryByProperty.reduce((sum, p) => sum + p.subtractions_from_cash, 0),
        total_ending_balance: summaryByProperty.reduce((sum, p) => sum + p.ending_balance, 0),
        total_adjustments: summaryByProperty.reduce((sum, p) => sum + p.adjustments, 0),
        total_available_for_payment: summaryByProperty.reduce((sum, p) => sum + p.available_for_payment, 0)
      };

      return {
        summary_by_property: summaryByProperty,
        income_statement: incomeStatement,
        detail_transactions: detailTransactions,
        totals: totals
      };
    },
    enabled: !!params,
    staleTime: 1 * 60 * 1000, // 1 minute
  });
};
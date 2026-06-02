import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ConsolidatedAccount {
  account_code: string;
  account_name: string;
  account_type: 'ASSETS' | 'LIABILITIES' | 'INCOME' | 'EXPENSES';
  beginning_balance: number;
  debits: number;
  credits: number;
  net_activity: number;
  ending_balance: number;
}

export interface ConsolidatedTrialBalanceParams {
  propertyIds?: string[];
  portfolioId?: string;
  startDate: string;
  endDate: string;
  accountingBasis: 'cash' | 'accrual';
}

export interface ConsolidatedTrialBalanceData {
  accounts: ConsolidatedAccount[];
  hasCashTransactions: boolean;
  summary: {
    total_debits: number;
    total_credits: number;
    total_assets: number;
    total_liabilities: number;
    total_income: number;
    total_expenses: number;
    date_range: string;
    properties_count: number;
  };
}

export const useTrialBalanceConsolidated = (params?: ConsolidatedTrialBalanceParams) => {
  return useQuery({
    queryKey: ['trial-balance-consolidated', params],
    queryFn: async (): Promise<ConsolidatedTrialBalanceData> => {
      if (!params) {
        return {
          accounts: [],
          hasCashTransactions: false,
          summary: {
            total_debits: 0,
            total_credits: 0,
            total_assets: 0,
            total_liabilities: 0,
            total_income: 0,
            total_expenses: 0,
            date_range: '',
            properties_count: 0
          }
        };
      }

      console.log('🔍 [CONSOLIDATED_TRIAL_BALANCE] Fetching data with params:', params);

      try {
        // Build query for properties with financial data
        let query = supabase
          .from('properties')
          .select(`
            id,
            address,
            monthly_rent,
            insurance_cost,
            mortgage_cost,
            management_fee,
            repair_costs,
            portfolio_id,
            created_at,
            accounts_receivable,
            security_deposits_receivable,
            prepaid_expenses,
            beginning_cash_balance,
            ending_cash_balance,
            security_deposits_held,
            accounts_payable,
            accrued_expenses,
            property_taxes,
            utilities_expense,
            maintenance_reserves,
            property_management_fees,
            advertising_expense,
            legal_professional_fees,
            depreciation_expense,
            other_operating_expenses,
            late_fee_income,
            pet_fee_income,
            application_fee_income,
            other_income
          `)
          .in('status', ['available', 'occupied', 'vacant'])
          .is('deleted_at', null);

        // Apply portfolio filter
        if (params.portfolioId && params.portfolioId !== 'all' && params.portfolioId !== 'everything') {
          query = query.eq('portfolio_id', params.portfolioId);
        }

        // Apply property filter
        if (params.propertyIds && params.propertyIds.length > 0) {
          query = query.in('id', params.propertyIds);
        }

        const { data: properties, error } = await query;

        if (error) {
          console.error('🔍 [CONSOLIDATED_TRIAL_BALANCE] Error fetching properties:', error);
          throw error;
        }

        console.log('🔍 [CONSOLIDATED_TRIAL_BALANCE] Fetched properties:', properties?.length || 0);

        // Fetch rent payments for the period
        const { data: rentPayments, error: rentError } = await supabase
          .from('rent_payments')
          .select(`
            id,
            property_id,
            amount,
            payment_date,
            late_fee_amount,
            status
          `)
          .gte('payment_date', params.startDate)
          .lte('payment_date', params.endDate)
          .eq('status', 'completed');

        if (rentError) {
          console.error('🔍 [CONSOLIDATED_TRIAL_BALANCE] Error fetching rent payments:', rentError);
        }

        // For cash basis accounting, also fetch expense payments to validate cash activity
        let expensePayments: any[] = [];
        if (params.accountingBasis === 'cash') {
          const { data: expenseData, error: expenseError } = await supabase
            .from('properties')
            .select(`
              id,
              insurance_cost,
              mortgage_cost,
              management_fee,
              repair_costs,
              property_taxes,
              utilities_expense,
              legal_professional_fees,
              advertising_expense,
              other_operating_expenses
            `)
            .in('status', ['available', 'occupied', 'vacant'])
            .is('deleted_at', null);
            
          if (!expenseError && expenseData) {
            expensePayments = expenseData;
          }
        }

        // Consolidate accounts by account code/name
        const consolidatedAccounts = new Map<string, ConsolidatedAccount>();

        const addToConsolidated = (accountCode: string, accountName: string, accountType: ConsolidatedAccount['account_type'], beginningBalance: number, debits: number, credits: number) => {
          const key = `${accountCode}-${accountName}`;
          if (consolidatedAccounts.has(key)) {
            const existing = consolidatedAccounts.get(key)!;
            existing.beginning_balance += beginningBalance;
            existing.debits += debits;
            existing.credits += credits;
            // Calculate net activity based on account type normal balance
            if (accountType === 'ASSETS' || accountType === 'EXPENSES') {
              // Debit increases these accounts
              existing.net_activity = existing.debits - existing.credits;
            } else {
              // Credit increases LIABILITIES and INCOME accounts  
              existing.net_activity = existing.credits - existing.debits;
            }
            existing.ending_balance = existing.beginning_balance + existing.net_activity;
          } else {
            // Calculate net activity based on account type normal balance
            let netActivity: number;
            if (accountType === 'ASSETS' || accountType === 'EXPENSES') {
              // Debit increases these accounts
              netActivity = debits - credits;
            } else {
              // Credit increases LIABILITIES and INCOME accounts
              netActivity = credits - debits;
            }
            
            consolidatedAccounts.set(key, {
              account_code: accountCode,
              account_name: accountName,
              account_type: accountType,
              beginning_balance: beginningBalance,
              debits,
              credits,
              net_activity: netActivity,
              ending_balance: beginningBalance + netActivity
            });
          }
        };

        if (properties) {
          properties.forEach(property => {
            const propertyRentPayments = rentPayments?.filter(p => p.property_id === property.id) || [];
            const totalRentReceived = propertyRentPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
            const totalLateFees = propertyRentPayments.reduce((sum, p) => sum + (p.late_fee_amount || 0), 0);

            // Calculate rental income based on accounting basis
            let rentalIncome = 0;
            if (params.accountingBasis === 'cash') {
              // Cash basis: Only actual payments received
              rentalIncome = totalRentReceived;
            } else {
              // Accrual basis: Calculate rent due for the period
              const startDate = new Date(params.startDate);
              const endDate = new Date(params.endDate);
              const monthsDiff = (endDate.getFullYear() - startDate.getFullYear()) * 12 + 
                                (endDate.getMonth() - startDate.getMonth()) + 1;
              const expectedRent = (property.monthly_rent || 0) * Math.min(monthsDiff, 12); // Cap at 12 months
              rentalIncome = Math.max(totalRentReceived, expectedRent);
            }

            // ASSETS - Cash account calculation
            const otherCashIncome = (property.late_fee_income || 0) + (property.pet_fee_income || 0) + (property.application_fee_income || 0) + (property.other_income || 0);
            const totalCashDebits = totalRentReceived + totalLateFees + otherCashIncome;
            const totalCashCredits = (property.insurance_cost || 0) + (property.mortgage_cost || 0) + (property.management_fee || 0) + (property.repair_costs || 0) + (property.legal_professional_fees || 0) + (property.advertising_expense || 0) + (property.property_taxes || 0) + (property.utilities_expense || 0) + (property.other_operating_expenses || 0);
            const beginningCash = property.beginning_cash_balance || 0;
            
            // Only add Cash account if there's actual financial activity or balance
            if (beginningCash > 0 || totalCashDebits > 0 || totalCashCredits > 0) {
              addToConsolidated('1100', 'Cash - Operating', 'ASSETS', beginningCash, totalCashDebits, totalCashCredits);
            }

            // Accrual-based accounts - only include in accrual basis or if cash basis but amounts are significant
            if (params.accountingBasis === 'accrual') {
              // Full accrual accounting - include all receivables and payables
              if ((property.accounts_receivable || 0) > 0) {
                addToConsolidated('1200', 'Accounts Receivable', 'ASSETS', 0, property.accounts_receivable || 0, 0);
              }

              if ((property.security_deposits_receivable || 0) > 0) {
                addToConsolidated('1300', 'Security Deposits Receivable', 'ASSETS', 0, property.security_deposits_receivable || 0, 0);
              }

              if ((property.prepaid_expenses || 0) > 0) {
                addToConsolidated('1400', 'Prepaid Expenses', 'ASSETS', 0, property.prepaid_expenses || 0, 0);
              }

              // LIABILITIES - full accrual
              if ((property.accounts_payable || 0) > 0) {
                addToConsolidated('2200', 'Accounts Payable', 'LIABILITIES', 0, 0, property.accounts_payable || 0);
              }

              if ((property.accrued_expenses || 0) > 0) {
                addToConsolidated('2300', 'Accrued Expenses', 'LIABILITIES', 0, 0, property.accrued_expenses || 0);
              }
            } else {
              // Cash basis - only include accrual accounts if they represent actual cash impact
              // For example, if there are significant unpaid receivables that need to be tracked
              if ((property.accounts_receivable || 0) > 1000) { // Only show significant receivables
                addToConsolidated('1200', 'Accounts Receivable', 'ASSETS', 0, property.accounts_receivable || 0, 0);
              }
            }

            // Security deposits are always tracked regardless of basis (represent actual cash held)
            if ((property.security_deposits_held || 0) > 0) {
              addToConsolidated('2100', 'Security Deposits Held', 'LIABILITIES', 0, 0, property.security_deposits_held || 0);
            }

            // INCOME - Use calculated rental income based on accounting basis
            if (rentalIncome > 0) {
              addToConsolidated('4100', 'Rental Income', 'INCOME', 0, 0, rentalIncome);
            }

            if ((property.late_fee_income || 0) > 0 || totalLateFees > 0) {
              addToConsolidated('4200', 'Late Fee Income', 'INCOME', 0, 0, (property.late_fee_income || 0) + totalLateFees);
            }

            if ((property.pet_fee_income || 0) > 0) {
              addToConsolidated('4300', 'Pet Fee Income', 'INCOME', 0, 0, property.pet_fee_income || 0);
            }

            if ((property.application_fee_income || 0) > 0) {
              addToConsolidated('4400', 'Application Fee Income', 'INCOME', 0, 0, property.application_fee_income || 0);
            }

            if ((property.other_income || 0) > 0) {
              addToConsolidated('4500', 'Other Income', 'INCOME', 0, 0, property.other_income || 0);
            }

            // EXPENSES - Handle differently based on accounting basis
            const expenses = [
              { code: '5100', name: 'Insurance Expense', amount: property.insurance_cost || 0 },
              { code: '5200', name: 'Mortgage Interest', amount: property.mortgage_cost || 0 },
              { code: '5300', name: 'Management Fees', amount: property.management_fee || 0 },
              { code: '5400', name: 'Repairs & Maintenance', amount: property.repair_costs || 0 },
              { code: '5500', name: 'Property Taxes', amount: property.property_taxes || 0 },
              { code: '5600', name: 'Utilities Expense', amount: property.utilities_expense || 0 },
              { code: '5700', name: 'Legal & Professional Fees', amount: property.legal_professional_fees || 0 },
              { code: '5800', name: 'Advertising & Marketing', amount: property.advertising_expense || 0 },
              { code: '6000', name: 'Other Operating Expenses', amount: property.other_operating_expenses || 0 }
            ];

            expenses.forEach(({ code, name, amount }) => {
              if (amount > 0) {
                if (params.accountingBasis === 'cash') {
                  // Cash basis: Only include expenses that were actually paid (simplified - assume all are paid for now)
                  // In a real system, we'd track payment dates
                  addToConsolidated(code, name, 'EXPENSES', 0, amount, 0);
                } else {
                  // Accrual basis: Include all expenses incurred in the period
                  addToConsolidated(code, name, 'EXPENSES', 0, amount, 0);
                }
              }
            });

            // Depreciation is only in accrual accounting (non-cash expense)
            if (params.accountingBasis === 'accrual' && (property.depreciation_expense || 0) > 0) {
              addToConsolidated('5900', 'Depreciation Expense', 'EXPENSES', 0, property.depreciation_expense || 0, 0);
            }
          });
        }

        // Convert to array and sort by account type priority and then by account code
        const accountTypeOrder = { 'ASSETS': 1, 'LIABILITIES': 2, 'INCOME': 3, 'EXPENSES': 4 };
        const accounts = Array.from(consolidatedAccounts.values()).sort((a, b) => {
          const typeComparison = accountTypeOrder[a.account_type] - accountTypeOrder[b.account_type];
          if (typeComparison !== 0) return typeComparison;
          return a.account_code.localeCompare(b.account_code);
        });

        // Calculate summary
        const summary = {
          total_debits: accounts.reduce((sum, acc) => sum + acc.debits, 0),
          total_credits: accounts.reduce((sum, acc) => sum + acc.credits, 0),
          total_assets: accounts.filter(acc => acc.account_type === 'ASSETS').reduce((sum, acc) => sum + acc.ending_balance, 0),
          total_liabilities: accounts.filter(acc => acc.account_type === 'LIABILITIES').reduce((sum, acc) => sum + acc.ending_balance, 0),
          total_income: accounts.filter(acc => acc.account_type === 'INCOME').reduce((sum, acc) => sum + acc.ending_balance, 0),
          total_expenses: accounts.filter(acc => acc.account_type === 'EXPENSES').reduce((sum, acc) => sum + acc.ending_balance, 0),
          date_range: `${params.startDate} to ${params.endDate}`,
          properties_count: properties?.length || 0
        };

        // Check if there are any cash transactions in the period
        const hasRentPayments = (rentPayments?.length || 0) > 0;
        const hasExpenseActivity = expensePayments.some(p => 
          (p.insurance_cost || 0) > 0 || (p.mortgage_cost || 0) > 0 || 
          (p.management_fee || 0) > 0 || (p.repair_costs || 0) > 0 ||
          (p.property_taxes || 0) > 0 || (p.utilities_expense || 0) > 0 ||
          (p.legal_professional_fees || 0) > 0 || (p.advertising_expense || 0) > 0 ||
          (p.other_operating_expenses || 0) > 0
        );
        const hasCashTransactions = hasRentPayments || hasExpenseActivity;

        console.log('🔍 [CONSOLIDATED_TRIAL_BALANCE] Generated consolidated accounts:', accounts.length);
        console.log('🔍 [CONSOLIDATED_TRIAL_BALANCE] Cash transactions found:', hasCashTransactions);
        console.log('🔍 [CONSOLIDATED_TRIAL_BALANCE] Summary:', summary);

        return {
          accounts,
          hasCashTransactions,
          summary
        };

      } catch (error) {
        console.error('🔍 [CONSOLIDATED_TRIAL_BALANCE] Error:', error);
        throw error;
      }
    },
    enabled: !!params, // Only run when params are provided (button clicked)
    staleTime: 15 * 1000, // 15 seconds for quick manual refreshes
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false, // Prevent automatic refetch on mount
  });
};
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface TrialBalanceAccount {
  account_code: string;
  account_name: string;
  account_type: 'ASSETS' | 'LIABILITIES' | 'INCOME' | 'EXPENSES';
  beginning_balance: number;
  debits: number;
  credits: number;
  net_activity: number;
  ending_balance: number;
}

export interface TrialBalanceParams {
  propertyIds?: string[];
  portfolioId?: string;
  startDate: string;
  endDate: string;
  accountingBasis: 'cash' | 'accrual';
}

export interface TrialBalanceData {
  accounts: TrialBalanceAccount[];
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
    is_balanced: boolean;
  };
}

export const useTrialBalance = (params?: TrialBalanceParams) => {
  return useQuery({
    queryKey: ['trial-balance', params],
    queryFn: async (): Promise<TrialBalanceData> => {
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
            properties_count: 0,
            is_balanced: false
          }
        };
      }

      console.log('🔍 [TRIAL_BALANCE] Fetching data with params:', params);

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
          console.error('🔍 [TRIAL_BALANCE] Error fetching properties:', error);
          throw error;
        }

        console.log('🔍 [TRIAL_BALANCE] Fetched properties:', properties?.length || 0);

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
          console.error('🔍 [TRIAL_BALANCE] Error fetching rent payments:', rentError);
        }

        // Initialize consolidated account totals
        const accountTotals: Record<string, {
          account_code: string;
          account_name: string;
          account_type: 'ASSETS' | 'LIABILITIES' | 'INCOME' | 'EXPENSES';
          beginning_balance: number;
          debits: number;
          credits: number;
        }> = {};

        // Helper function to add to account totals
        const addToAccount = (
          code: string, 
          name: string, 
          type: 'ASSETS' | 'LIABILITIES' | 'INCOME' | 'EXPENSES',
          beginningBalance: number, 
          debits: number, 
          credits: number
        ) => {
          if (!accountTotals[code]) {
            accountTotals[code] = {
              account_code: code,
              account_name: name,
              account_type: type,
              beginning_balance: 0,
              debits: 0,
              credits: 0
            };
          }
          accountTotals[code].beginning_balance += beginningBalance;
          accountTotals[code].debits += debits;
          accountTotals[code].credits += credits;
        };

        let actualCashTransactions = 0;
        let propertiesCount = 0;

        if (properties) {
          propertiesCount = properties.length;

          properties.forEach(property => {
            const propertyRentPayments = rentPayments?.filter(p => p.property_id === property.id) || [];
            const totalRentReceived = propertyRentPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
            const totalLateFees = propertyRentPayments.reduce((sum, p) => sum + (p.late_fee_amount || 0), 0);

            // Count actual cash transactions (not estimated values)
            // Only count rent payments that actually occurred
            if (totalRentReceived > 0) {
              actualCashTransactions += propertyRentPayments.length;
            }
            
            // Count expense transactions with actual values
            const hasExpenseActivity = (property.insurance_cost || 0) > 0 || 
                                     (property.mortgage_cost || 0) > 0 || 
                                     (property.management_fee || 0) > 0 || 
                                     (property.repair_costs || 0) > 0 ||
                                     (property.property_taxes || 0) > 0 || 
                                     (property.utilities_expense || 0) > 0 ||
                                     (property.legal_professional_fees || 0) > 0 || 
                                     (property.advertising_expense || 0) > 0 ||
                                     (property.other_operating_expenses || 0) > 0;
            
            if (hasExpenseActivity) {
              actualCashTransactions += 1;
            }

            // Calculate cash activity for accounting purposes
            const cashDebits = totalRentReceived + totalLateFees + (property.late_fee_income || 0) + 
                             (property.pet_fee_income || 0) + (property.application_fee_income || 0) + 
                             (property.other_income || 0);
            const cashCredits = (property.insurance_cost || 0) + (property.mortgage_cost || 0) + 
                              (property.management_fee || 0) + (property.repair_costs || 0) + 
                              (property.legal_professional_fees || 0) + (property.advertising_expense || 0) + 
                              (property.property_taxes || 0) + (property.utilities_expense || 0) + 
                              (property.other_operating_expenses || 0);

            // ASSETS
            // Cash - Operating (consolidate all cash across properties)
            const beginningCash = property.beginning_cash_balance || 0;
            if (beginningCash > 0 || cashDebits > 0 || cashCredits > 0) {
              addToAccount('1100', 'Cash - Operating', 'ASSETS', beginningCash, cashDebits, cashCredits);
            }

            // Accounts Receivable
            if ((property.accounts_receivable || 0) > 0) {
              addToAccount('1200', 'Accounts Receivable', 'ASSETS', 0, property.accounts_receivable || 0, 0);
            }

            // Security Deposits Receivable
            if ((property.security_deposits_receivable || 0) > 0) {
              addToAccount('1300', 'Security Deposits Receivable', 'ASSETS', 0, property.security_deposits_receivable || 0, 0);
            }

            // Prepaid Expenses
            if ((property.prepaid_expenses || 0) > 0) {
              addToAccount('1400', 'Prepaid Expenses', 'ASSETS', 0, property.prepaid_expenses || 0, 0);
            }

            // LIABILITIES
            // Security Deposits Held
            if ((property.security_deposits_held || 0) > 0) {
              addToAccount('2100', 'Security Deposits Held', 'LIABILITIES', 0, 0, property.security_deposits_held || 0);
            }

            // Accounts Payable
            if ((property.accounts_payable || 0) > 0) {
              addToAccount('2200', 'Accounts Payable', 'LIABILITIES', 0, 0, property.accounts_payable || 0);
            }

            // Accrued Expenses
            if ((property.accrued_expenses || 0) > 0) {
              addToAccount('2300', 'Accrued Expenses', 'LIABILITIES', 0, 0, property.accrued_expenses || 0);
            }

            // INCOME
            // Rental Income (consolidate all rental income)
            if (totalRentReceived > 0) {
              addToAccount('4100', 'Rental Income', 'INCOME', 0, 0, totalRentReceived);
            }

            // Late Fee Income
            if ((property.late_fee_income || 0) > 0 || totalLateFees > 0) {
              addToAccount('4200', 'Late Fee Income', 'INCOME', 0, 0, (property.late_fee_income || 0) + totalLateFees);
            }

            // Pet Fee Income
            if ((property.pet_fee_income || 0) > 0) {
              addToAccount('4300', 'Pet Fee Income', 'INCOME', 0, 0, property.pet_fee_income || 0);
            }

            // Application Fee Income
            if ((property.application_fee_income || 0) > 0) {
              addToAccount('4400', 'Application Fee Income', 'INCOME', 0, 0, property.application_fee_income || 0);
            }

            // Other Income
            if ((property.other_income || 0) > 0) {
              addToAccount('4500', 'Other Income', 'INCOME', 0, 0, property.other_income || 0);
            }

            // EXPENSES
            // Insurance Expense (consolidate all insurance costs)
            if ((property.insurance_cost || 0) > 0) {
              addToAccount('5100', 'Insurance Expense', 'EXPENSES', 0, property.insurance_cost || 0, 0);
            }

            // Mortgage Interest
            if ((property.mortgage_cost || 0) > 0) {
              addToAccount('5200', 'Mortgage Interest', 'EXPENSES', 0, property.mortgage_cost || 0, 0);
            }

            // Management Fees
            if ((property.management_fee || 0) > 0) {
              addToAccount('5300', 'Management Fees', 'EXPENSES', 0, property.management_fee || 0, 0);
            }

            // Repairs & Maintenance
            if ((property.repair_costs || 0) > 0) {
              addToAccount('5400', 'Repairs & Maintenance', 'EXPENSES', 0, property.repair_costs || 0, 0);
            }

            // Property Taxes
            if ((property.property_taxes || 0) > 0) {
              addToAccount('5500', 'Property Taxes', 'EXPENSES', 0, property.property_taxes || 0, 0);
            }

            // Utilities Expense
            if ((property.utilities_expense || 0) > 0) {
              addToAccount('5600', 'Utilities Expense', 'EXPENSES', 0, property.utilities_expense || 0, 0);
            }

            // Legal & Professional Fees
            if ((property.legal_professional_fees || 0) > 0) {
              addToAccount('5700', 'Legal & Professional Fees', 'EXPENSES', 0, property.legal_professional_fees || 0, 0);
            }

            // Advertising & Marketing
            if ((property.advertising_expense || 0) > 0) {
              addToAccount('5800', 'Advertising & Marketing', 'EXPENSES', 0, property.advertising_expense || 0, 0);
            }

            // Depreciation Expense
            if ((property.depreciation_expense || 0) > 0) {
              addToAccount('5900', 'Depreciation Expense', 'EXPENSES', 0, property.depreciation_expense || 0, 0);
            }

            // Other Operating Expenses
            if ((property.other_operating_expenses || 0) > 0) {
              addToAccount('5950', 'Other Operating Expenses', 'EXPENSES', 0, property.other_operating_expenses || 0, 0);
            }
          });
        }

        // Convert account totals to final accounts with proper calculations
        const accounts: TrialBalanceAccount[] = Object.values(accountTotals).map(account => {
          let netActivity: number;
          let endingBalance: number;

          // Calculate net activity and ending balance based on account type
          switch (account.account_type) {
            case 'ASSETS':
            case 'EXPENSES':
              // Assets and Expenses: debits increase, credits decrease
              netActivity = account.debits - account.credits;
              endingBalance = account.beginning_balance + netActivity;
              break;
            case 'LIABILITIES':
            case 'INCOME':
              // Liabilities and Income: credits increase, debits decrease
              netActivity = account.credits - account.debits;
              endingBalance = account.beginning_balance + netActivity;
              break;
            default:
              netActivity = account.debits - account.credits;
              endingBalance = account.beginning_balance + netActivity;
          }

          return {
            ...account,
            net_activity: netActivity,
            ending_balance: endingBalance
          };
        });

        // Calculate summary totals
        let totalDebits = 0;
        let totalCredits = 0;
        let totalAssets = 0;
        let totalLiabilities = 0;
        let totalIncome = 0;
        let totalExpenses = 0;

        accounts.forEach(account => {
          totalDebits += account.debits;
          totalCredits += account.credits;

          switch (account.account_type) {
            case 'ASSETS':
              totalAssets += account.ending_balance;
              break;
            case 'LIABILITIES':
              totalLiabilities += account.ending_balance;
              break;
            case 'INCOME':
              totalIncome += account.ending_balance;
              break;
            case 'EXPENSES':
              totalExpenses += account.ending_balance;
              break;
          }
        });

        // Sort accounts by account code
        accounts.sort((a, b) => a.account_code.localeCompare(b.account_code));

        const hasCashTransactions = actualCashTransactions > 0;
        const isBalanced = Math.abs(totalDebits - totalCredits) < 0.01; // Allow for small rounding differences

        console.log('🔍 [TRIAL_BALANCE] Processed accounts:', accounts.length);
        console.log('🔍 [TRIAL_BALANCE] Total debits:', totalDebits, 'Total credits:', totalCredits);
        console.log('🔍 [TRIAL_BALANCE] Is balanced:', isBalanced);

        return {
          accounts,
          hasCashTransactions,
          summary: {
            total_debits: totalDebits,
            total_credits: totalCredits,
            total_assets: totalAssets,
            total_liabilities: totalLiabilities,
            total_income: totalIncome,
            total_expenses: totalExpenses,
            date_range: `${params.startDate} to ${params.endDate}`,
            properties_count: propertiesCount,
            is_balanced: isBalanced
          }
        };

      } catch (error) {
        console.error('🔍 [TRIAL_BALANCE] Error in query function:', error);
        throw error;
      }
    },
    enabled: !!params,
    staleTime: 30000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });
};

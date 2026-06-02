import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, parseISO } from 'date-fns';
import { assessFinancialDataSource, calculatePropertiesDataQuality, FinancialDataAssessment } from '@/utils/dataQuality';
import { PropertyDataQuality } from '@/components/reporting/DataCompletenessIndicator';

export interface BalanceSheetEntry {
  id: string;
  name: string;
  amount: number;
  level: number; // 1 = main category, 2 = subcategory, 3 = line item
  isTotal?: boolean;
  parentId?: string;
  dataAssessment?: FinancialDataAssessment;
}

export interface PropertyBalanceSheet {
  propertyId: string;
  propertyAddress: string;
  assets: BalanceSheetEntry[];
  liabilities: BalanceSheetEntry[];
  equity: BalanceSheetEntry[];
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
}

export interface BalanceSheetSummary {
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
  propertyCount: number;
  asOfDate: string;
}

export interface BalanceSheetData {
  properties: PropertyBalanceSheet[];
  summary: BalanceSheetSummary;
  dataQuality: PropertyDataQuality[];
}

interface UseBalanceSheetDataParams {
  userId: string;
  portfolioId?: string;
  propertyIds?: string[];
  asOfDate: string;
  accountingBasis?: 'cash' | 'accrual';
}

export const useBalanceSheetData = ({
  userId,
  portfolioId,
  propertyIds,
  asOfDate,
  accountingBasis = 'accrual',
  enabled = true
}: UseBalanceSheetDataParams & { enabled?: boolean }) => {
  return useQuery({
    queryKey: ['balanceSheet', userId, portfolioId, propertyIds, asOfDate, accountingBasis],
    queryFn: async (): Promise<BalanceSheetData> => {
      console.log('🔍 [BALANCE_SHEET] Fetching balance sheet data:', {
        userId,
        portfolioId,
        propertyIds,
        asOfDate,
        accountingBasis
      });

      if (!userId) {
        console.error('🚨 [BALANCE_SHEET] Missing userId');
        throw new Error('User ID is required for balance sheet data');
      }
      
      if (!asOfDate) {
        console.error('🚨 [BALANCE_SHEET] Missing asOfDate');
        throw new Error('As Of Date is required for balance sheet data');
      }

      // Validate date format
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(asOfDate)) {
        console.error('🚨 [BALANCE_SHEET] Invalid date format:', asOfDate);
        throw new Error('Invalid date format. Expected YYYY-MM-DD');
      }

      try {
        // Fetch properties with financial data - no inner join to get ALL properties
        let query = supabase
          .from('properties')
          .select(`
            id,
            address,
            monthly_rent,
            security_deposit_amount,
            current_market_value,
            purchase_price,
            outstanding_mortgage_balance,
            cash_reserves,
            accounts_payable,
            prepaid_expenses,
            accumulated_depreciation,
            insurance_cost,
            repair_costs,
            management_fee,
            mortgage_cost,
            portfolio_id
          `)
          .eq('owner_id', userId)
          .is('deleted_at', null);

        // Apply portfolio filter
        if (portfolioId && portfolioId !== 'everything') {
          query = query.eq('portfolio_id', portfolioId);
        }

        // Apply property filter
        if (propertyIds && propertyIds.length > 0) {
          query = query.in('id', propertyIds);
        }

        const { data: properties, error: propertiesError } = await query;

        if (propertiesError) {
          console.error('🚨 [BALANCE_SHEET] Error fetching properties:', propertiesError);
          throw propertiesError;
        }

        console.log('✅ [BALANCE_SHEET] Properties fetched:', properties?.length || 0);

        // Fetch outstanding rent payments
        const { data: rentPayments, error: rentError } = await supabase
          .from('rent_payments')
          .select('property_id, amount, status, due_date')
          .in('property_id', properties?.map(p => p.id) || [])
          .lte('due_date', asOfDate)
          .neq('status', 'completed');

        if (rentError) {
          console.error('🚨 [BALANCE_SHEET] Error fetching rent payments:', rentError);
        }

        // Process data into balance sheet format
        const processedProperties: PropertyBalanceSheet[] = (properties || []).map(property => {
          const outstandingRent = rentPayments
            ?.filter(payment => payment.property_id === property.id)
            ?.reduce((sum, payment) => sum + (payment.amount || 0), 0) || 0;

          // Intelligent property value estimation with data source tracking
          const monthlyRent = property.monthly_rent || 0;
          let propertyValue: number;
          let propertyValueSource: FinancialDataAssessment;
          
          if (property.current_market_value && property.current_market_value > 0) {
            propertyValue = property.current_market_value;
            propertyValueSource = assessFinancialDataSource(propertyValue, property.current_market_value, 'current_market_value');
          } else if (property.purchase_price && property.purchase_price > 0) {
            propertyValue = property.purchase_price;
            propertyValueSource = assessFinancialDataSource(propertyValue, property.purchase_price, 'purchase_price');
          } else if (monthlyRent > 0) {
            // Use more conservative multiplier based on property type
            propertyValue = monthlyRent * 120; // 10 years of rent
            propertyValueSource = assessFinancialDataSource(propertyValue, null, 'current_market_value', monthlyRent);
          } else {
            // No data available - show as missing
            propertyValue = 0;
            propertyValueSource = assessFinancialDataSource(0, null, 'current_market_value');
          }

          const accumulatedDepreciation = Math.abs(property.accumulated_depreciation || 0);
          const netPropertyValue = Math.max(0, propertyValue - accumulatedDepreciation);
          
          const securityDeposit = property.security_deposit_amount || 0;
          const cashReserves = property.cash_reserves || 0;
          const prepaidExpenses = property.prepaid_expenses || 0;
          
          const outstandingMortgage = property.outstanding_mortgage_balance || 0;
          const accountsPayable = property.accounts_payable || 0;

          // ASSETS
          const assets: BalanceSheetEntry[] = [
            {
              id: `${property.id}-current-assets`,
              name: 'Current Assets',
              amount: 0,
              level: 1,
              isTotal: true
            },
            {
              id: `${property.id}-cash`,
              name: 'Cash and Cash Equivalents',
              amount: cashReserves,
              level: 2,
              parentId: `${property.id}-current-assets`
            },
            {
              id: `${property.id}-receivables`,
              name: 'Accounts Receivable',
              amount: outstandingRent,
              level: 2,
              parentId: `${property.id}-current-assets`
            },
            {
              id: `${property.id}-prepaid`,
              name: 'Prepaid Expenses',
              amount: prepaidExpenses,
              level: 2,
              parentId: `${property.id}-current-assets`
            },
            {
              id: `${property.id}-fixed-assets`,
              name: 'Fixed Assets',
              amount: 0,
              level: 1,
              isTotal: true
            },
            {
              id: `${property.id}-property-gross`,
              name: 'Real Estate Property (Gross)',
              amount: propertyValue,
              level: 2,
              parentId: `${property.id}-fixed-assets`,
              dataAssessment: propertyValueSource
            },
            {
              id: `${property.id}-depreciation`,
              name: 'Less: Accumulated Depreciation',
              amount: -accumulatedDepreciation,
              level: 2,
              parentId: `${property.id}-fixed-assets`
            }
          ];

          // Update totals
          const currentAssetsTotal = cashReserves + outstandingRent + prepaidExpenses;
          const fixedAssetsTotal = netPropertyValue;
          const totalAssets = currentAssetsTotal + fixedAssetsTotal;

          assets[0].amount = currentAssetsTotal;
          assets[4].amount = fixedAssetsTotal;

          // LIABILITIES
          const liabilities: BalanceSheetEntry[] = [
            {
              id: `${property.id}-current-liabilities`,
              name: 'Current Liabilities',
              amount: 0,
              level: 1,
              isTotal: true
            },
            {
              id: `${property.id}-security-deposits`,
              name: 'Security Deposit Liability',
              amount: securityDeposit,
              level: 2,
              parentId: `${property.id}-current-liabilities`
            },
            {
              id: `${property.id}-accounts-payable`,
              name: 'Accounts Payable',
              amount: accountsPayable,
              level: 2,
              parentId: `${property.id}-current-liabilities`
            }
          ];

          const currentLiabilitiesTotal = securityDeposit + accountsPayable;
          let longTermLiabilitiesTotal = 0;
          let totalLiabilities = currentLiabilitiesTotal;

          // Add long-term debt if exists
          if (outstandingMortgage > 0) {
            liabilities.push(
              {
                id: `${property.id}-long-term-liabilities`,
                name: 'Long-term Liabilities',
                amount: outstandingMortgage,
                level: 1,
                isTotal: true
              },
              {
                id: `${property.id}-mortgage`,
                name: 'Outstanding Mortgage Balance',
                amount: outstandingMortgage,
                level: 2,
                parentId: `${property.id}-long-term-liabilities`
              }
            );
            longTermLiabilitiesTotal = outstandingMortgage;
            totalLiabilities += outstandingMortgage;
          }

          liabilities[0].amount = currentLiabilitiesTotal;
          if (outstandingMortgage > 0 && liabilities.length > 2) {
            liabilities[2].amount = longTermLiabilitiesTotal; // Update long-term liabilities total
          }

          // EQUITY
          const totalEquity = totalAssets - totalLiabilities;
          const retainedEarnings = totalEquity * 0.7; // Estimate
          const ownerEquity = totalEquity * 0.3; // Estimate

          const equity: BalanceSheetEntry[] = [
            {
              id: `${property.id}-owner-equity`,
              name: 'Owner Equity',
              amount: ownerEquity,
              level: 1
            },
            {
              id: `${property.id}-retained-earnings`,
              name: 'Retained Earnings',
              amount: retainedEarnings,
              level: 1
            }
          ];

          return {
            propertyId: property.id,
            propertyAddress: property.address,
            assets,
            liabilities,
            equity,
            totalAssets,
            totalLiabilities,
            totalEquity
          };
        });

        // Calculate data quality
        const dataQuality = calculatePropertiesDataQuality(properties || []);
        
        // Calculate summary
        const summary: BalanceSheetSummary = {
          totalAssets: processedProperties.reduce((sum, p) => sum + p.totalAssets, 0),
          totalLiabilities: processedProperties.reduce((sum, p) => sum + p.totalLiabilities, 0),
          totalEquity: processedProperties.reduce((sum, p) => sum + p.totalEquity, 0),
          propertyCount: processedProperties.length,
          asOfDate
        };

        console.log('✅ [BALANCE_SHEET] Balance sheet data processed:', {
          propertiesCount: processedProperties.length,
          totalAssets: summary.totalAssets,
          totalLiabilities: summary.totalLiabilities,
          totalEquity: summary.totalEquity
        });

        return {
          properties: processedProperties,
          summary,
          dataQuality
        };

      } catch (error) {
        console.error('🚨 [BALANCE_SHEET] Error processing balance sheet data:', error);
        throw error;
      }
    },
    enabled: Boolean(userId && asOfDate && enabled),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2
  });
};
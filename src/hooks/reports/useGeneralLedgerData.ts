import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, parseISO } from 'date-fns';
import { assessFinancialDataSource, calculatePropertiesDataQuality, FinancialDataAssessment } from '@/utils/dataQuality';
import { PropertyDataQuality } from '@/components/reporting/DataCompletenessIndicator';

export interface GeneralLedgerTransaction {
  id: string;
  date: string;
  type: string;
  unit?: string;
  name: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
  propertyId?: string;
  propertyAddress?: string;
}

export interface GeneralLedgerAccount {
  id: string;
  name: string;
  category: 'assets' | 'liabilities' | 'income' | 'expenses';
  transactions: GeneralLedgerTransaction[];
  openingBalance: number;
  closingBalance: number;
  totalDebits: number;
  totalCredits: number;
}

export interface GeneralLedgerData {
  accounts: GeneralLedgerAccount[];
  summary: {
    totalDebits: number;
    totalCredits: number;
    transactionCount: number;
    dateRange: {
      from: string;
      to: string;
    };
    propertyCount: number;
  };
  dataQuality: PropertyDataQuality[];
}

interface UseGeneralLedgerDataParams {
  userId: string;
  portfolioId?: string;
  propertyIds?: string[];
  fromDate: string;
  toDate: string;
  accountingBasis?: 'cash' | 'accrual';
}

export const useGeneralLedgerData = ({
  userId,
  portfolioId,
  propertyIds,
  fromDate,
  toDate,
  accountingBasis = 'accrual',
  enabled = true
}: UseGeneralLedgerDataParams & { enabled?: boolean }) => {
  return useQuery({
    queryKey: ['generalLedger', userId, portfolioId, propertyIds, fromDate, toDate, accountingBasis],
    queryFn: async (): Promise<GeneralLedgerData> => {
      console.log('🔍 [GENERAL_LEDGER] Fetching general ledger data:', {
        userId,
        portfolioId,
        propertyIds,
        fromDate,
        toDate,
        accountingBasis
      });

      if (!userId) {
        console.error('🚨 [GENERAL_LEDGER] Missing userId');
        throw new Error('User ID is required for general ledger data');
      }
      
      if (!fromDate || !toDate) {
        console.error('🚨 [GENERAL_LEDGER] Missing date range');
        throw new Error('Date range is required for general ledger data');
      }

      // Validate date format
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(fromDate) || !dateRegex.test(toDate)) {
        console.error('🚨 [GENERAL_LEDGER] Invalid date format');
        throw new Error('Invalid date format. Expected YYYY-MM-DD');
      }

      try {
        // Fetch properties
        let propertiesQuery = supabase
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
            portfolio_id
          `)
          .eq('owner_id', userId)
          .is('deleted_at', null);

        if (portfolioId && portfolioId !== 'everything') {
          propertiesQuery = propertiesQuery.eq('portfolio_id', portfolioId);
        }

        if (propertyIds && propertyIds.length > 0) {
          propertiesQuery = propertiesQuery.in('id', propertyIds);
        }

        const { data: properties, error: propertiesError } = await propertiesQuery;

        if (propertiesError) {
          console.error('🚨 [GENERAL_LEDGER] Error fetching properties:', propertiesError);
          throw propertiesError;
        }

        console.log('✅ [GENERAL_LEDGER] Properties fetched:', properties?.length || 0);

        // Fetch rent payments (for income transactions)
        const { data: rentPayments, error: rentError } = await supabase
          .from('rent_payments')
          .select('*')
          .in('property_id', properties?.map(p => p.id) || [])
          .gte('payment_date', fromDate)
          .lte('payment_date', toDate)
          .order('payment_date', { ascending: true });

        if (rentError) {
          console.error('🚨 [GENERAL_LEDGER] Error fetching rent payments:', rentError);
        }

        // Fetch HAP payments
        const { data: hapPayments, error: hapError } = await supabase
          .from('hap_payments')
          .select('*')
          .in('property_id', properties?.map(p => p.id) || [])
          .gte('payment_date', fromDate)
          .lte('payment_date', toDate)
          .order('payment_date', { ascending: true });

        if (hapError) {
          console.error('🚨 [GENERAL_LEDGER] Error fetching HAP payments:', hapError);
        }

        // Fetch maintenance requests (for expense transactions)
        const { data: maintenanceRequests, error: maintenanceError } = await supabase
          .from('maintenance_requests')
          .select('*')
          .in('property_id', properties?.map(p => p.id) || [])
          .gte('created_at', fromDate)
          .lte('created_at', toDate)
          .order('created_at', { ascending: true });

        if (maintenanceError) {
          console.error('🚨 [GENERAL_LEDGER] Error fetching maintenance requests:', maintenanceError);
        }

        // Build transactions
        const allTransactions: GeneralLedgerTransaction[] = [];
        let transactionIdCounter = 1;

        // Process rent payments as income
        rentPayments?.forEach(payment => {
          const property = properties?.find(p => p.id === payment.property_id);
          if (payment.payment_date) {
            allTransactions.push({
              id: `rent-${payment.id}`,
              date: payment.payment_date,
              type: 'Rent Payment',
              name: 'Tenant Payment',
              description: `Rent payment for ${property?.address || 'Property'}`,
              debit: 0,
              credit: payment.amount || 0,
              balance: 0, // Will be calculated later
              propertyId: payment.property_id,
              propertyAddress: property?.address
            });
          }
        });

        // Process HAP payments as income
        hapPayments?.forEach(payment => {
          const property = properties?.find(p => p.id === payment.property_id);
          if (payment.payment_date) {
            allTransactions.push({
              id: `hap-${payment.id}`,
              date: payment.payment_date,
              type: 'HAP Payment',
              name: 'Housing Authority',
              description: `HAP payment for ${property?.address || 'Property'}`,
              debit: 0,
              credit: payment.actual_amount || payment.expected_amount || 0,
              balance: 0,
              propertyId: payment.property_id,
              propertyAddress: property?.address
            });
          }
        });

        // Process maintenance as expenses
        maintenanceRequests?.forEach(request => {
          const property = properties?.find(p => p.id === request.property_id);
          if (request.estimated_cost && request.estimated_cost > 0) {
            allTransactions.push({
              id: `maintenance-${request.id}`,
              date: format(parseISO(request.created_at), 'yyyy-MM-dd'),
              type: 'Maintenance',
              name: 'Maintenance Expense',
              description: request.description || 'Maintenance work',
              debit: request.estimated_cost,
              credit: 0,
              balance: 0,
              propertyId: request.property_id,
              propertyAddress: property?.address
            });
          }
        });

        // Sort all transactions by date
        allTransactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        // Group transactions into accounts
        const accounts: GeneralLedgerAccount[] = [
          {
            id: 'accounts-receivable',
            name: 'Accounts Receivable',
            category: 'assets',
            transactions: [],
            openingBalance: 0,
            closingBalance: 0,
            totalDebits: 0,
            totalCredits: 0
          },
          {
            id: 'security-deposit-liability',
            name: 'Security Deposit Liability',
            category: 'liabilities',
            transactions: [],
            openingBalance: 0,
            closingBalance: 0,
            totalDebits: 0,
            totalCredits: 0
          },
          {
            id: 'rent-income',
            name: 'Rent Income',
            category: 'income',
            transactions: allTransactions.filter(t => t.type === 'Rent Payment'),
            openingBalance: 0,
            closingBalance: 0,
            totalDebits: 0,
            totalCredits: 0
          },
          {
            id: 'hap-income',
            name: 'HAP Income',
            category: 'income',
            transactions: allTransactions.filter(t => t.type === 'HAP Payment'),
            openingBalance: 0,
            closingBalance: 0,
            totalDebits: 0,
            totalCredits: 0
          },
          {
            id: 'maintenance-expense',
            name: 'Maintenance Expense',
            category: 'expenses',
            transactions: allTransactions.filter(t => t.type === 'Maintenance'),
            openingBalance: 0,
            closingBalance: 0,
            totalDebits: 0,
            totalCredits: 0
          }
        ];

        // Calculate running balances and totals for each account
        accounts.forEach(account => {
          let runningBalance = account.openingBalance;
          account.transactions.forEach(transaction => {
            runningBalance += transaction.credit - transaction.debit;
            transaction.balance = runningBalance;
            account.totalDebits += transaction.debit;
            account.totalCredits += transaction.credit;
          });
          account.closingBalance = runningBalance;
        });

        // Calculate data quality
        const dataQuality = calculatePropertiesDataQuality(properties || []);

        // Calculate summary
        const totalDebits = accounts.reduce((sum, acc) => sum + acc.totalDebits, 0);
        const totalCredits = accounts.reduce((sum, acc) => sum + acc.totalCredits, 0);
        const transactionCount = allTransactions.length;

        const summary = {
          totalDebits,
          totalCredits,
          transactionCount,
          dateRange: {
            from: fromDate,
            to: toDate
          },
          propertyCount: properties?.length || 0
        };

        console.log('✅ [GENERAL_LEDGER] General ledger data processed:', {
          accountsCount: accounts.length,
          transactionCount,
          totalDebits,
          totalCredits
        });

        return {
          accounts: accounts.filter(acc => acc.transactions.length > 0 || acc.openingBalance !== 0 || acc.closingBalance !== 0),
          summary,
          dataQuality
        };

      } catch (error) {
        console.error('🚨 [GENERAL_LEDGER] Error processing general ledger data:', error);
        throw error;
      }
    },
    enabled: Boolean(userId && fromDate && toDate && enabled),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2
  });
};
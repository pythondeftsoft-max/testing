import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ConsolidatedTransaction {
  date: string;
  type: string;
  unit: string;
  property: string;
  name: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
  accountType: string;
  accountName: string;
}

export interface ConsolidatedAccount {
  accountName: string;
  accountType: string;
  transactions: ConsolidatedTransaction[];
  previousBalance: number;
  totalDebits: number;
  totalCredits: number;
  endingBalance: number;
}

export interface ConsolidatedSection {
  sectionName: string;
  accounts: ConsolidatedAccount[];
  sectionTotal: number;
}

export const useGeneralLedgerConsolidated = () => {
  const [sections, setSections] = useState<ConsolidatedSection[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [runParams, setRunParams] = useState<{
    portfolioId?: string;
    startDate?: string;
    endDate?: string;
    propertyIds?: string[];
    accountingBasis: 'cash' | 'accrual';
  } | null>(null);

  const fetchConsolidatedData = async (
    portfolioId?: string,
    startDate?: string,
    endDate?: string,
    propertyIds?: string[],
    accountingBasis: 'cash' | 'accrual' = 'accrual'
  ) => {
    if (!startDate || !endDate) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      console.log('🔍 Fetching Consolidated General Ledger data:', {
        portfolioId,
        startDate,
        endDate,
        propertyIds,
        accountingBasis
      });

      // Fetch all relevant properties
      let propertiesQuery = supabase
        .from('properties')
        .select('id, address, monthly_rent, owner_id, portfolio_id, city, state, status')
        .is('deleted_at', null)
        .order('address', { ascending: true });

      // Only filter by portfolio if it's not 'everything' and is a valid UUID
      if (portfolioId && portfolioId !== 'everything' && portfolioId.length === 36) {
        propertiesQuery = propertiesQuery.eq('portfolio_id', portfolioId);
      }

      // Filter by specific properties if provided
      if (propertyIds && propertyIds.length > 0) {
        propertiesQuery = propertiesQuery.in('id', propertyIds);
      }

      const { data: propertiesData, error: propertiesError } = await propertiesQuery;
      if (propertiesError) throw propertiesError;

      console.log('🏠 Properties found:', propertiesData?.length || 0);
      console.log('🏠 Properties data:', propertiesData);

      if (!propertiesData || propertiesData.length === 0) {
        console.warn('❌ No properties found with current filters');
        setSections([]);
        return;
      }

      const propertyIds_internal = propertiesData.map(p => p.id);

      // Fetch all financial data in parallel
      const [rentPaymentsResult, maintenanceResult, recurringChargesResult, propertyApplicationsResult, previousPaymentsResult] = await Promise.all([
        // Rent payments with unit information
        supabase
          .from('rent_payments')
          .select(`
            *,
            property_units(id, unit_number, tenant_id)
          `)
          .in('property_id', propertyIds_internal)
          .gte('payment_date', startDate)
          .lte('payment_date', endDate),
        
        // Maintenance requests
        supabase
          .from('maintenance_requests')
          .select('*')
          .in('property_id', propertyIds_internal)
          .gte('created_at', startDate)
          .lte('created_at', endDate)
          .eq('status', 'completed'),
        
        // Recurring charges
        supabase
          .from('recurring_charges')
          .select('*')
          .in('property_id', propertyIds_internal)
          .eq('is_active', true),

        // Property applications for security deposits
        supabase
          .from('property_applications')
          .select('*')
          .in('property_id', propertyIds_internal)
          .gte('created_at', startDate)
          .lte('created_at', endDate),

        // Previous payments for accurate previous balance calculation
        supabase
          .from('rent_payments')
          .select('amount, status, property_id')
          .in('property_id', propertyIds_internal)
          .lt('payment_date', startDate)
      ]);

      if (rentPaymentsResult.error) throw rentPaymentsResult.error;
      if (maintenanceResult.error) throw maintenanceResult.error;
      if (recurringChargesResult.error) throw recurringChargesResult.error;
      if (propertyApplicationsResult.error) throw propertyApplicationsResult.error;
      if (previousPaymentsResult.error) throw previousPaymentsResult.error;

      const rentPayments = rentPaymentsResult.data || [];
      const maintenanceRequests = maintenanceResult.data || [];
      const recurringCharges = recurringChargesResult.data || [];
      const propertyApplications = propertyApplicationsResult.data || [];
      const previousPayments = previousPaymentsResult.data || [];

      console.log('💰 Financial data found:', {
        rentPayments: rentPayments.length,
        maintenanceRequests: maintenanceRequests.length,
        recurringCharges: recurringCharges.length,
        propertyApplications: propertyApplications.length
      });

      // Consolidate data by account type
      const consolidatedAccounts: { [key: string]: ConsolidatedAccount } = {};
      const allTransactions: ConsolidatedTransaction[] = [];

      // Initialize accounts dynamically based on data found
      const initializeAccount = (accountName: string) => {
        if (!consolidatedAccounts[accountName]) {
          consolidatedAccounts[accountName] = {
            accountType: getAccountType(accountName),
            accountName,
            transactions: [],
            previousBalance: 0,
            totalDebits: 0,
            totalCredits: 0,
            endingBalance: 0
          };
        }
      };

      // Always initialize core accounts
      const coreAccounts = [
        'Accounts Receivable',
        'Security Deposit Liability', 
        'Rent Income',
        'Maintenance Expenses',
        'Late Fee Income'
      ];
      
      coreAccounts.forEach(initializeAccount);

      // Create property lookup for addresses
      const propertyLookup = propertiesData.reduce((acc, property) => {
        acc[property.id] = property;
        return acc;
      }, {} as { [key: string]: any });

      // Calculate actual previous balances from historical data
      const beginningDate = startDate;
      const previousBalanceByProperty: { [key: string]: number } = {};
      
      previousPayments.forEach((payment) => {
        if (payment.status !== 'paid') {
          previousBalanceByProperty[payment.property_id] = 
            (previousBalanceByProperty[payment.property_id] || 0) + Number(payment.amount || 0);
        }
      });

      // Add previous balance entries (beginning of period)
      propertiesData.forEach((property) => {
        const previousBalance = previousBalanceByProperty[property.id] || 0;
        if (previousBalance > 0) {
          allTransactions.push({
            date: beginningDate,
            type: 'Previous Balance',
            unit: 'N/A',
            property: property.address || 'Unknown Address',
            name: 'Previous Balance',
            description: 'Beginning balance - Accounts Receivable',
            debit: previousBalance,
            credit: 0,
            balance: 0, // Will be calculated later
            accountType: 'Assets',
            accountName: 'Accounts Receivable'
          });
          consolidatedAccounts['Accounts Receivable'].previousBalance += previousBalance;
        }
      });

      // Process rent payments - create detailed transaction entries
      rentPayments.forEach((payment: any) => {
        const property = propertyLookup[payment.property_id];
        const propertyAddress = property?.address || 'Unknown Property';
        const paymentDate = payment.payment_date || payment.due_date;
        const unitNumber = payment.property_units?.unit_number || 'N/A';
        
        if (payment.amount > 0) {
          const amount = Number(payment.amount);
          
          // Create rent charge entry (Accounts Receivable debit, Rent Income credit)
          if (accountingBasis === 'accrual' || payment.status === 'paid') {
            allTransactions.push({
              date: paymentDate,
              type: 'Charge',
              unit: unitNumber,
              property: propertyAddress,
              name: 'Rent Charge',
              description: `Monthly rent - ${propertyAddress}`,
              debit: amount,
              credit: 0,
              balance: 0, // Will be calculated later
              accountType: 'Assets',
              accountName: 'Accounts Receivable'
            });
            consolidatedAccounts['Accounts Receivable'].totalDebits += amount;

            allTransactions.push({
              date: paymentDate,
              type: 'Charge',
              unit: unitNumber,
              property: propertyAddress,
              name: 'Rent Income',
              description: `Monthly rent income - ${propertyAddress}`,
              debit: 0,
              credit: amount,
              balance: 0, // Will be calculated later
              accountType: 'Income',
              accountName: 'Rent Income'
            });
            consolidatedAccounts['Rent Income'].totalCredits += amount;
          }
          
          // If payment is made, create payment entry
          if (payment.status === 'paid') {
            allTransactions.push({
              date: paymentDate,
              type: 'Payment',
              unit: unitNumber,
              property: propertyAddress,
              name: 'Rent Payment',
              description: `Payment received - ${propertyAddress}`,
              debit: 0,
              credit: amount,
              balance: 0, // Will be calculated later
              accountType: 'Assets',
              accountName: 'Accounts Receivable'
            });
            consolidatedAccounts['Accounts Receivable'].totalCredits += amount;
          }
        }

        // Process late fees
        if (payment.late_fee_amount && payment.late_fee_amount > 0) {
          const lateFee = Number(payment.late_fee_amount);
          
          if (payment.status === 'paid' || accountingBasis === 'accrual') {
            allTransactions.push({
              date: paymentDate,
              type: 'Fee',
              unit: unitNumber,
              property: propertyAddress,
              name: 'Late Fee',
              description: `Late fee - ${propertyAddress}`,
              debit: 0,
              credit: lateFee,
              balance: 0, // Will be calculated later
              accountType: 'Income',
              accountName: 'Late Fee Income'
            });
            consolidatedAccounts['Late Fee Income'].totalCredits += lateFee;
          }
        }
      });

      // Process maintenance expenses
      maintenanceRequests.forEach((request) => {
        const property = propertyLookup[request.property_id];
        const propertyAddress = property?.address || 'Unknown Property';
        const requestDate = request.created_at?.split('T')[0] || new Date().toISOString().split('T')[0];
        
        // Apply accounting basis for maintenance expenses
        const shouldInclude = accountingBasis === 'accrual' || (request.status === 'completed' && request.actual_cost);
        
        if (shouldInclude && request.actual_cost && request.actual_cost > 0) {
          const cost = Number(request.actual_cost);
          allTransactions.push({
            date: requestDate,
            type: 'Expense',
            unit: 'N/A',
            property: propertyAddress,
            name: 'Maintenance',
            description: `${request.description || 'Maintenance work'} - ${propertyAddress}`,
            debit: cost,
            credit: 0,
            balance: 0, // Will be calculated later
            accountType: 'Expenses',
            accountName: 'Maintenance Expenses'
          });
          consolidatedAccounts['Maintenance Expenses'].totalDebits += cost;
        }
      });

      // Process security deposits from applications
      propertyApplications.forEach((application) => {
        const property = propertyLookup[application.property_id];
        const propertyAddress = property?.address || 'Unknown Property';
        const applicationDate = application.created_at?.split('T')[0] || new Date().toISOString().split('T')[0];
        
        if (application.priority_payment_amount && application.priority_payment_amount > 0) {
          const deposit = Number(application.priority_payment_amount);
          allTransactions.push({
            date: applicationDate,
            type: 'Deposit',
            unit: 'N/A',
            property: propertyAddress,
            name: 'Security Deposit',
            description: `Security deposit received - ${propertyAddress}`,
            debit: 0,
            credit: deposit,
            balance: 0, // Will be calculated later
            accountType: 'Liabilities',
            accountName: 'Security Deposit Liability'
          });
          consolidatedAccounts['Security Deposit Liability'].totalCredits += deposit;
        }
      });

      // Process recurring charges (utilities, etc.) as income transactions
      recurringCharges.forEach((charge) => {
        const property = propertyLookup[charge.property_id];
        const propertyAddress = property?.address || 'Unknown Property';
        const chargeDate = charge.next_due_date || charge.start_date;
        
        // Only include charges within date range
        if (chargeDate && chargeDate >= startDate && chargeDate <= endDate && charge.amount > 0) {
          const amount = Number(charge.amount);
          const accountName = `${charge.charge_type || 'Other'} Income`;
          
          initializeAccount(accountName);
          
          // For accrual basis, record the charge when due
          if (accountingBasis === 'accrual') {
            // Debit Accounts Receivable for the charge
            allTransactions.push({
              date: chargeDate,
              type: 'Charge',
              unit: 'N/A',
              property: propertyAddress,
              name: charge.charge_name || 'Utility Charge',
              description: `${charge.charge_name || 'Utility charge'} - ${propertyAddress}`,
              debit: amount,
              credit: 0,
              balance: 0,
              accountType: 'Assets',
              accountName: 'Accounts Receivable'
            });
            consolidatedAccounts['Accounts Receivable'].totalDebits += amount;
            
            // Credit the appropriate income account
            allTransactions.push({
              date: chargeDate,
              type: 'Charge',
              unit: 'N/A',
              property: propertyAddress,
              name: charge.charge_name || 'Utility Income',
              description: `${charge.charge_name || 'Utility'} income - ${propertyAddress}`,
              debit: 0,
              credit: amount,
              balance: 0,
              accountType: 'Income',
              accountName: accountName
            });
            consolidatedAccounts[accountName].totalCredits += amount;
          }
        }
      });

      // Sort all transactions by date and assign to accounts
      allTransactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      
      // Calculate running balances and assign transactions to accounts
      const accountBalances: { [key: string]: number } = {};
      
      // Initialize account balances with previous balances
      Object.keys(consolidatedAccounts).forEach(accountName => {
        accountBalances[accountName] = consolidatedAccounts[accountName].previousBalance;
      });

      allTransactions.forEach((transaction) => {
        // Update account balance based on transaction
        if (transaction.accountType === 'Assets' || transaction.accountType === 'Expenses') {
          // For assets and expenses: debits increase, credits decrease
          accountBalances[transaction.accountName] += transaction.debit - transaction.credit;
        } else {
          // For liabilities and income: credits increase, debits decrease
          accountBalances[transaction.accountName] += transaction.credit - transaction.debit;
        }
        
        // Set the running balance for this transaction
        transaction.balance = accountBalances[transaction.accountName];
        
        // Add transaction to appropriate account
        consolidatedAccounts[transaction.accountName].transactions.push(transaction);
      });

      // Calculate ending balances for accounts
      Object.values(consolidatedAccounts).forEach((account) => {
        if (account.accountType === 'Assets' || account.accountType === 'Expenses') {
          account.endingBalance = account.previousBalance + account.totalDebits - account.totalCredits;
        } else {
          account.endingBalance = account.previousBalance + account.totalCredits - account.totalDebits;
        }
      });

      // Group accounts by section
      const assetAccounts = Object.values(consolidatedAccounts).filter(acc => acc.accountType === 'Assets');
      const liabilityAccounts = Object.values(consolidatedAccounts).filter(acc => acc.accountType === 'Liabilities');
      const incomeAccounts = Object.values(consolidatedAccounts).filter(acc => acc.accountType === 'Income');
      const expenseAccounts = Object.values(consolidatedAccounts).filter(acc => acc.accountType === 'Expenses');

      const consolidatedSections: ConsolidatedSection[] = [];

      if (assetAccounts.length > 0) {
        consolidatedSections.push({
          sectionName: 'Assets',
          accounts: assetAccounts,
          sectionTotal: assetAccounts.reduce((sum, acc) => sum + acc.endingBalance, 0)
        });
      }

      if (liabilityAccounts.length > 0) {
        consolidatedSections.push({
          sectionName: 'Liabilities',
          accounts: liabilityAccounts,
          sectionTotal: liabilityAccounts.reduce((sum, acc) => sum + acc.endingBalance, 0)
        });
      }

      if (incomeAccounts.length > 0) {
        consolidatedSections.push({
          sectionName: 'Income',
          accounts: incomeAccounts,
          sectionTotal: incomeAccounts.reduce((sum, acc) => sum + acc.endingBalance, 0)
        });
      }

      if (expenseAccounts.length > 0) {
        consolidatedSections.push({
          sectionName: 'Expenses',
          accounts: expenseAccounts,
          sectionTotal: expenseAccounts.reduce((sum, acc) => sum + acc.endingBalance, 0)
        });
      }

      console.log('✅ Processed consolidated sections:', consolidatedSections.length);
      console.log('📊 Section details:', consolidatedSections);
      
      if (consolidatedSections.length === 0) {
        console.warn('❌ No sections created - may indicate no financial data for selected properties/dates');
        // Create empty sections with just the core accounts for display
        const emptySections: ConsolidatedSection[] = [
          {
            sectionName: 'Assets',
            accounts: Object.values(consolidatedAccounts).filter(acc => acc.accountType === 'Assets'),
            sectionTotal: 0
          },
          {
            sectionName: 'Liabilities', 
            accounts: Object.values(consolidatedAccounts).filter(acc => acc.accountType === 'Liabilities'),
            sectionTotal: 0
          },
          {
            sectionName: 'Income',
            accounts: Object.values(consolidatedAccounts).filter(acc => acc.accountType === 'Income'), 
            sectionTotal: 0
          },
          {
            sectionName: 'Expenses',
            accounts: Object.values(consolidatedAccounts).filter(acc => acc.accountType === 'Expenses'),
            sectionTotal: 0
          }
        ].filter(section => section.accounts.length > 0);
        
        setSections(emptySections);
      } else {
        setSections(consolidatedSections);
      }
    } catch (err) {
      console.error('Error fetching consolidated general ledger data:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Helper function to determine account type
  const getAccountType = (accountName: string): string => {
    if (accountName.includes('Receivable') || accountName.includes('Cash') || accountName.includes('Bank')) {
      return 'Assets';
    }
    if (accountName.includes('Liability') || accountName.includes('Payable') || accountName.includes('Deposit')) {
      return 'Liabilities';
    }
    if (accountName.includes('Income') || accountName.includes('Revenue') || accountName.includes('Fee')) {
      return 'Income';
    }
    if (accountName.includes('Expense') || accountName.includes('Cost') || accountName.includes('Maintenance')) {
      return 'Expenses';
    }
    return 'Assets'; // Default
  };

  useEffect(() => {
    if (runParams) {
      fetchConsolidatedData(
        runParams.portfolioId,
        runParams.startDate,
        runParams.endDate,
        runParams.propertyIds,
        runParams.accountingBasis
      );
    }
  }, [runParams]);

  const grandTotal = sections.reduce((sum, section) => {
    if (section.sectionName === 'Assets' || section.sectionName === 'Expenses') {
      return sum + section.sectionTotal;
    } else {
      return sum - section.sectionTotal; // Liabilities and Income are subtracted for net worth calculation
    }
  }, 0);

  const runReport = (
    portfolioId?: string,
    startDate?: string,
    endDate?: string,
    propertyIds?: string[],
    accountingBasis: 'cash' | 'accrual' = 'accrual'
  ) => {
    console.log('🔍 [useGeneralLedgerConsolidated] Running report with params:', {
      portfolioId,
      startDate,
      endDate,
      propertyIds,
      accountingBasis
    });
    setRunParams({
      portfolioId,
      startDate,
      endDate,
      propertyIds,
      accountingBasis
    });
  };

  const refetch = () => {
    if (runParams) {
      console.log('🔍 [useGeneralLedgerConsolidated] Manual refetch triggered');
      setError(null);
      setLoading(true);
      fetchConsolidatedData(
        runParams.portfolioId,
        runParams.startDate,
        runParams.endDate,
        runParams.propertyIds,
        runParams.accountingBasis
      );
    }
  };

  return {
    sections,
    grandTotal,
    loading,
    error,
    runReport,
    refetch,
    hasRunParams: !!runParams
  };
};
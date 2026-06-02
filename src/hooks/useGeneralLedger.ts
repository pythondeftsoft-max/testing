import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface GeneralLedgerTransaction {
  id: string;
  date: string;
  type: string;
  unit: string;
  name: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
  account: string;
}

export interface GeneralLedgerAccount {
  name: string;
  transactions: GeneralLedgerTransaction[];
  previousBalance: number;
  totalDebits: number;
  totalCredits: number;
  endingBalance: number;
}

export interface GeneralLedgerProperty {
  id: string;
  address: string;
  accounts: GeneralLedgerAccount[];
  totalDebits: number;
  totalCredits: number;
  netBalance: number;
}

export const useGeneralLedger = () => {
  const [properties, setProperties] = useState<GeneralLedgerProperty[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [runParams, setRunParams] = useState<{
    portfolioId?: string;
    startDate?: string;
    endDate?: string;
    propertyIds?: string[];
    accountingBasis: 'cash' | 'accrual';
  } | null>(null);

  const fetchGeneralLedgerData = async (
    portfolioId?: string,
    startDate?: string,
    endDate?: string,
    propertyIds?: string[],
    accountingBasis: 'cash' | 'accrual' = 'accrual'
  ) => {
      // Only fetch if we have the required parameters
      if (!startDate || !endDate) {
        setLoading(false);
        return;
      }

      // Don't fetch if portfolioId is invalid (e.g., "everything")
      if (portfolioId && (portfolioId === 'everything' || portfolioId.length !== 36)) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        
        console.log('🔍 Fetching General Ledger data (Property-First):', {
          portfolioId,
          startDate,
          endDate,
          propertyIds,
          accountingBasis
        });

        // First, fetch all relevant properties
        let propertiesQuery = supabase
          .from('properties')
          .select(`
            id,
            address,
            monthly_rent,
            owner_id,
            portfolio_id,
            city,
            state,
            property_units (
              id,
              unit_number
            )
          `)
          .eq('status', 'occupied')
          .order('address', { ascending: true });

        // Apply portfolio filter
        if (portfolioId && portfolioId !== 'everything' && portfolioId.length === 36) {
          propertiesQuery = propertiesQuery.eq('portfolio_id', portfolioId);
        }

        // Apply property filter
        if (propertyIds && propertyIds.length > 0) {
          propertiesQuery = propertiesQuery.in('id', propertyIds);
        }

        const { data: propertiesData, error: propertiesError } = await propertiesQuery;
        if (propertiesError) throw propertiesError;

        if (!propertiesData || propertiesData.length === 0) {
          console.log('No properties found for the given criteria');
          setProperties([]);
          return;
        }

        console.log('🏠 Found properties:', propertiesData.length);

        // For each property, fetch financial data and build accounts
        const processedProperties: GeneralLedgerProperty[] = [];

        for (const property of propertiesData) {
          // Fetch rent payments for this property
          const { data: rentPayments } = await supabase
            .from('rent_payments')
            .select(`
              *,
              profiles!rent_payments_tenant_id_fkey (
                first_name,
                last_name
              )
            `)
            .eq('property_id', property.id)
            .gte('payment_date', startDate)
            .lte('payment_date', endDate)
            .order('payment_date', { ascending: true });

          // Fetch maintenance requests for this property
          const { data: maintenanceRequests } = await supabase
            .from('maintenance_requests')
            .select(`
              *,
              profiles!maintenance_requests_tenant_id_fkey (
                first_name,
                last_name
              )
            `)
            .eq('property_id', property.id)
            .gte('created_at', startDate)
            .lte('created_at', endDate)
            .order('created_at', { ascending: true });

          // Fetch recurring charges for this property
          const { data: recurringCharges } = await supabase
            .from('recurring_charges')
            .select('*')
            .eq('property_id', property.id)
            .eq('is_active', true);

          // Build accounts for this property
          const propertyAccounts: GeneralLedgerAccount[] = [];

          // 1. ACCOUNTS RECEIVABLE ACCOUNT
          const arTransactions: GeneralLedgerTransaction[] = [];
          let arBalance = 0;

          // Previous balance (should be calculated from historical data)
          const arPreviousBalance = 0;
          arBalance = arPreviousBalance;

          arTransactions.push({
            id: `prev-balance-ar-${property.id}`,
            date: startDate,
            type: 'Previous Balance',
            unit: '',
            name: '',
            description: 'Previous Balance',
            debit: 0,
            credit: 0,
            balance: arPreviousBalance,
            account: 'Accounts Receivable'
          });

          // Process rent payments
          rentPayments?.forEach((payment) => {
            const tenant = payment.profiles;
            const tenantName = tenant ? `${tenant.first_name} ${tenant.last_name}` : 'Unknown Tenant';
            
            // Get unit display
            let unitDisplay = 'Main Unit';
            if (property.property_units && property.property_units.length > 0) {
              const unit = property.property_units.find(u => u.id === payment.unit_id) || property.property_units[0];
              unitDisplay = unit.unit_number ? `Unit ${unit.unit_number}` : 'Main Unit';
            }

            // Determine transaction type
            let transactionType = 'Charge';
            if (payment.payment_source === 'hap' || payment.payment_source === 'housing_authority') {
              transactionType = 'SLHA';
            } else if (payment.payment_type === 'security_deposit') {
              transactionType = 'MSD';
            }

            // Add rent charge (debit to AR)
            if (payment.payment_type === 'rent' && payment.amount > 0) {
              if (accountingBasis === 'accrual' || payment.status !== 'pending') {
                arBalance += payment.amount;
                arTransactions.push({
                  id: `charge-${payment.id}`,
                  date: payment.payment_date || payment.created_at.split('T')[0],
                  type: transactionType,
                  unit: unitDisplay,
                  name: tenantName,
                  description: `Rent Charge - ${new Date(payment.payment_date || payment.created_at).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })}`,
                  debit: payment.amount,
                  credit: 0,
                  balance: arBalance,
                  account: 'Accounts Receivable'
                });
              }

              // Add payment (credit to AR) if not pending
              if (payment.status !== 'pending') {
                arBalance -= payment.amount;
                arTransactions.push({
                  id: `payment-${payment.id}`,
                  date: payment.payment_date || payment.created_at.split('T')[0],
                  type: 'Payment',
                  unit: unitDisplay,
                  name: tenantName,
                  description: `Rent Payment - ${payment.payment_method || 'Card'}`,
                  debit: 0,
                  credit: payment.amount,
                  balance: arBalance,
                  account: 'Accounts Receivable'
                });
              }
            }
          });

          const arTotalDebits = arTransactions.reduce((sum, t) => sum + t.debit, 0);
          const arTotalCredits = arTransactions.reduce((sum, t) => sum + t.credit, 0);

          propertyAccounts.push({
            name: 'Assets > Accounts Receivable',
            transactions: arTransactions,
            previousBalance: arPreviousBalance,
            totalDebits: arTotalDebits,
            totalCredits: arTotalCredits,
            endingBalance: arBalance
          });

          // 2. RENT INCOME ACCOUNT
          const rentIncomeTransactions: GeneralLedgerTransaction[] = [];
          let rentIncomeBalance = 0;
          const riPreviousBalance = 0;
          rentIncomeBalance = riPreviousBalance;

          rentIncomeTransactions.push({
            id: `prev-balance-ri-${property.id}`,
            date: startDate,
            type: 'Previous Balance',
            unit: '',
            name: '',
            description: 'Previous Balance',
            debit: 0,
            credit: 0,
            balance: riPreviousBalance,
            account: 'Rent Income'
          });

          // Process completed rent payments as income
          rentPayments?.forEach((payment) => {
            if (payment.status !== 'pending' && payment.payment_type === 'rent') {
              const tenant = payment.profiles;
              const tenantName = tenant ? `${tenant.first_name} ${tenant.last_name}` : 'Unknown Tenant';
              
              let unitDisplay = 'Main Unit';
              if (property.property_units && property.property_units.length > 0) {
                const unit = property.property_units.find(u => u.id === payment.unit_id) || property.property_units[0];
                unitDisplay = unit.unit_number ? `Unit ${unit.unit_number}` : 'Main Unit';
              }

              rentIncomeBalance += payment.amount;
              rentIncomeTransactions.push({
                id: `income-${payment.id}`,
                date: payment.payment_date || payment.created_at.split('T')[0],
                type: 'Income',
                unit: unitDisplay,
                name: tenantName,
                description: `Rent Income - ${new Date(payment.payment_date || payment.created_at).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })}`,
                debit: 0,
                credit: payment.amount,
                balance: rentIncomeBalance,
                account: 'Rent Income'
              });
            }
          });

          const riTotalDebits = rentIncomeTransactions.reduce((sum, t) => sum + t.debit, 0);
          const riTotalCredits = rentIncomeTransactions.reduce((sum, t) => sum + t.credit, 0);

          propertyAccounts.push({
            name: 'Income > Rent Income',
            transactions: rentIncomeTransactions,
            previousBalance: riPreviousBalance,
            totalDebits: riTotalDebits,
            totalCredits: riTotalCredits,
            endingBalance: rentIncomeBalance
          });

          // 3. MAINTENANCE EXPENSES ACCOUNT
          const maintenanceTransactions: GeneralLedgerTransaction[] = [];
          let maintenanceBalance = 0;
          const mePreviousBalance = 0;
          maintenanceBalance = mePreviousBalance;

          maintenanceTransactions.push({
            id: `prev-balance-me-${property.id}`,
            date: startDate,
            type: 'Previous Balance',
            unit: '',
            name: '',
            description: 'Previous Balance',
            debit: 0,
            credit: 0,
            balance: mePreviousBalance,
            account: 'Maintenance Expenses'
          });

          // Process maintenance requests as expenses
          maintenanceRequests?.forEach((request) => {
            if (request.actual_cost && request.actual_cost > 0 && request.status === 'completed') {
              const tenant = request.profiles;
              const tenantName = tenant ? `${tenant.first_name} ${tenant.last_name}` : 'Landlord';
              
              let unitDisplay = 'Main Unit';
              if (property.property_units && property.property_units.length > 0) {
                const unit = property.property_units.find(u => u.id === request.unit_id) || property.property_units[0];
                unitDisplay = unit.unit_number ? `Unit ${unit.unit_number}` : 'Main Unit';
              }

              maintenanceBalance += request.actual_cost;
              maintenanceTransactions.push({
                id: `expense-${request.id}`,
                date: request.completed_date?.split('T')[0] || request.created_at.split('T')[0],
                type: 'Expense',
                unit: unitDisplay,
                name: tenantName,
                description: `${request.category || 'Maintenance'} - ${request.title}`,
                debit: request.actual_cost,
                credit: 0,
                balance: maintenanceBalance,
                account: 'Maintenance Expenses'
              });
            }
          });

          const meTotalDebits = maintenanceTransactions.reduce((sum, t) => sum + t.debit, 0);
          const meTotalCredits = maintenanceTransactions.reduce((sum, t) => sum + t.credit, 0);

          if (maintenanceTransactions.length > 1) { // Only add if there are actual transactions beyond previous balance
            propertyAccounts.push({
              name: 'Expenses > Maintenance Expenses',
              transactions: maintenanceTransactions,
              previousBalance: mePreviousBalance,
              totalDebits: meTotalDebits,
              totalCredits: meTotalCredits,
              endingBalance: maintenanceBalance
            });
          }

          // 4. SECURITY DEPOSIT LIABILITY ACCOUNT
          const sdTransactions: GeneralLedgerTransaction[] = [];
          const sdPreviousBalance = 1200; // Example - should be calculated from historical data
          
          sdTransactions.push({
            id: `prev-balance-sd-${property.id}`,
            date: startDate,
            type: 'Previous Balance',
            unit: '',
            name: '',
            description: 'Previous Balance',
            debit: 0,
            credit: 0,
            balance: sdPreviousBalance,
            account: 'Security Deposit Liability'
          });

          propertyAccounts.push({
            name: 'Liabilities > Security Deposit Liability',
            transactions: sdTransactions,
            previousBalance: sdPreviousBalance,
            totalDebits: 0,
            totalCredits: 0,
            endingBalance: sdPreviousBalance
          });

          // Calculate property totals
          const propertyTotalDebits = propertyAccounts.reduce((sum, acc) => sum + acc.totalDebits, 0);
          const propertyTotalCredits = propertyAccounts.reduce((sum, acc) => sum + acc.totalCredits, 0);
          const propertyNetBalance = propertyTotalCredits - propertyTotalDebits; // Income - Expenses

          processedProperties.push({
            id: property.id,
            address: property.address,
            accounts: propertyAccounts,
            totalDebits: propertyTotalDebits,
            totalCredits: propertyTotalCredits,
            netBalance: propertyNetBalance
          });
        }

        console.log('✅ Processed properties:', processedProperties.length);
        setProperties(processedProperties);
      } catch (err) {
        console.error('Error fetching general ledger data:', err);
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
  };

  useEffect(() => {
    if (runParams) {
      fetchGeneralLedgerData(
        runParams.portfolioId,
        runParams.startDate,
        runParams.endDate,
        runParams.propertyIds,
        runParams.accountingBasis
      );
    }
  }, [runParams]);

  const grandTotal = properties.reduce((sum, property) => sum + property.netBalance, 0);

  const runReport = (
    portfolioId?: string,
    startDate?: string,
    endDate?: string,
    propertyIds?: string[],
    accountingBasis: 'cash' | 'accrual' = 'accrual'
  ) => {
    console.log('🔍 [useGeneralLedger] Running report with params:', {
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
      console.log('🔍 [useGeneralLedger] Manual refetch triggered');
      setError(null);
      setLoading(true);
      fetchGeneralLedgerData(
        runParams.portfolioId,
        runParams.startDate,
        runParams.endDate,
        runParams.propertyIds,
        runParams.accountingBasis
      );
    }
  };

  return {
    properties,
    accounts: properties.flatMap(p => p.accounts), // For backwards compatibility
    grandTotal,
    loading,
    error,
    runReport,
    refetch,
    hasRunParams: !!runParams
  };
};
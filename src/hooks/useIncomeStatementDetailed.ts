import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface ReportParams {
  propertyIds?: string[];
  unitIds?: string[];
  portfolioId?: string;
  dateRange: {
    from: string;
    to: string;
  };
  accountingBasis: 'cash' | 'accrual';
}

export interface IncomeStatementDetailedItem {
  id: string;
  type: 'property' | 'category' | 'subcategory' | 'transaction' | 'subtotal' | 'total' | 'net';
  name: string;
  level: number;
  amount: number | null;
  isTotal: boolean;
  date?: string;
  transactionType?: string;
  checkNo?: string;
  memo?: string;
  dataSource: 'actual' | 'pending' | 'expected' | 'calculated';
}

// Hook to check if cash transactions exist for the given filters
export function useCheckCashTransactions(params?: {
  propertyIds?: string[];
  unitIds?: string[];
  portfolioId?: string;
  dateRange?: { from: string; to: string };
}) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['check-cash-transactions', user?.id, params?.propertyIds, params?.unitIds, params?.portfolioId, params?.dateRange],
    queryFn: async () => {
      if (!user?.id || !params?.dateRange?.from || !params?.dateRange?.to) {
        return false;
      }

      // Get properties based on filters
      let propertiesQuery = supabase
        .from('properties')
        .select('id');

      // Filter by portfolio
      if (params.portfolioId && params.portfolioId !== 'all') {
        propertiesQuery = propertiesQuery.eq('portfolio_id', params.portfolioId);
      } else {
        propertiesQuery = propertiesQuery.eq('owner_id', user.id);
      }

      const { data: properties, error: propertiesError } = await propertiesQuery;

      if (propertiesError) {
        console.error('Error fetching properties:', propertiesError);
        return false;
      }

      if (!properties || properties.length === 0) {
        return false;
      }

      let propertiesToCheck = properties.map(p => p.id);

      // Filter by property IDs if specified
      if (params.propertyIds && params.propertyIds.length > 0) {
        propertiesToCheck = propertiesToCheck.filter(id => params.propertyIds!.includes(id));
      }

      // If unit IDs are specified, get properties that have those units
      if (params.unitIds && params.unitIds.length > 0) {
        const { data: units, error: unitsError } = await supabase
          .from('property_units')
          .select('property_id')
          .in('id', params.unitIds);

        if (unitsError) {
          console.error('Error fetching units:', unitsError);
          return false;
        }

        if (units && units.length > 0) {
          const unitPropertyIds = units.map(u => u.property_id);
          propertiesToCheck = propertiesToCheck.filter(id => unitPropertyIds.includes(id));
        } else {
          return false;
        }
      }

      if (propertiesToCheck.length === 0) {
        return false;
      }

      // Check if any cash transactions exist
      const { data: payments, error: paymentsError } = await supabase
        .from('rent_payments')
        .select('id', { count: 'exact', head: true })
        .in('property_id', propertiesToCheck)
        .gte('payment_date', params.dateRange.from)
        .lte('payment_date', params.dateRange.to)
        .limit(1);

      if (paymentsError) {
        console.error('Error checking payments:', paymentsError);
        return false;
      }

      return payments !== null;
    },
    enabled: !!(user?.id && params?.dateRange?.from && params?.dateRange?.to),
    staleTime: 30 * 1000, // Cache for 30 seconds
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
  });
}

export function useIncomeStatementDetailed() {
  const [data, setData] = useState<IncomeStatementDetailedItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasRunParams, setHasRunParams] = useState<ReportParams | null>(null);
  const [hasCashTransactions, setHasCashTransactions] = useState<boolean>(false);

  const runReport = useCallback(async (params: ReportParams) => {
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
          monthly_rent,
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

      // Fetch actual rent payments for the date range with unit and tenant info
      let paymentsQuery = supabase
        .from('rent_payments')
        .select(`
          *,
          property_units(unit_number),
          tenant:profiles!tenant_id(first_name, last_name)
        `)
        .in('property_id', properties.map(p => p.id))
        .gte('payment_date', params.dateRange.from)
        .lte('payment_date', params.dateRange.to);

      // If specific units are selected, filter by those units
      if (params.unitIds && params.unitIds.length > 0) {
        paymentsQuery = paymentsQuery.in('unit_id', params.unitIds);
      }

      const { data: rentPayments, error: paymentsError } = await paymentsQuery;

      if (paymentsError) throw paymentsError;

      // Filter properties for cash basis reporting
      let propertiesToProcess = properties;
      if (params.accountingBasis === 'cash') {
        // For cash basis, only include properties that have actual payments
        const propertiesWithPayments = new Set(rentPayments?.map(p => p.property_id) || []);
        propertiesToProcess = properties.filter(property => propertiesWithPayments.has(property.id));
      }

      // Check if we have cash transactions after filtering
      const hasCashTransactionsForPeriod = propertiesToProcess.length > 0 && rentPayments && rentPayments.length > 0;
      setHasCashTransactions(hasCashTransactionsForPeriod);

      // For cash basis without cash transactions, return empty data with warning
      if (params.accountingBasis === 'cash' && !hasCashTransactionsForPeriod) {
        setData([]);
        return;
      }

      // Transform data into hierarchical structure
      const reportData: IncomeStatementDetailedItem[] = [];

      for (const property of propertiesToProcess) {
        // Property header
        const propertyHeader: IncomeStatementDetailedItem = {
          id: `property-${property.id}`,
          type: 'property',
          name: property.address,
          level: 0,
          amount: null,
          isTotal: false,
          dataSource: 'actual'
        };
        reportData.push(propertyHeader);

        // Income section
        const incomeHeader: IncomeStatementDetailedItem = {
          id: `income-${property.id}`,
          type: 'category',
          name: 'Income',
          level: 1,
          amount: null,
          isTotal: false,
          dataSource: 'actual'
        };
        reportData.push(incomeHeader);

        // Rent Income section header
        const rentIncomeHeader: IncomeStatementDetailedItem = {
          id: `rent-income-${property.id}`,
          type: 'subcategory', 
          name: 'Rent Income',
          level: 2,
          amount: null,
          isTotal: false,
          dataSource: 'actual'
        };
        reportData.push(rentIncomeHeader);

        // Process rent transactions
        let totalRentIncome = 0;
        const propertyPayments = rentPayments?.filter(payment => payment.property_id === property.id) || [];

        if (params.accountingBasis === 'cash' && propertyPayments.length > 0) {
          // Show actual payments for cash basis
          propertyPayments.forEach(payment => {
            // Determine the name to display (unit number or payer name)
            let displayName = 'Rent Payment';
            if (payment.property_units?.unit_number) {
              displayName = `Unit ${payment.property_units.unit_number}`;
            } else if (payment.tenant) {
              const firstName = payment.tenant.first_name || '';
              const lastName = payment.tenant.last_name || '';
              displayName = `${firstName} ${lastName}`.trim() || 'Tenant';
            }

            // Format date as M/D/YYYY (e.g., "9/1/2025")
            const paymentDate = new Date(payment.payment_date);
            const formattedDate = `${paymentDate.getMonth() + 1}/${paymentDate.getDate()}/${paymentDate.getFullYear()}`;

            // Create abbreviated memo (max 30 characters)
            const memo = payment.notes ? 
              (payment.notes.length > 30 ? payment.notes.substring(0, 30) + '...' : payment.notes) :
              'Rent payment';

            const rentTransaction: IncomeStatementDetailedItem = {
              id: `rent-${payment.id}`,
              type: 'transaction',
              name: displayName,
              level: 3,
              amount: Number(payment.amount),
              isTotal: false,
              date: formattedDate,
              transactionType: 'Charge',
              checkNo: payment.reference_number || '',
              memo: memo,
              dataSource: payment.status === 'completed' ? 'actual' : 'pending'
            };
            reportData.push(rentTransaction);
            totalRentIncome += Number(payment.amount);
          });
        } else {
          // Generate expected entries for accrual basis or when no payments exist
          const startDate = new Date(params.dateRange.from);
          const endDate = new Date(params.dateRange.to);
          
          for (let d = new Date(startDate); d <= endDate; d.setMonth(d.getMonth() + 1)) {
            // Format as "MMM YYYY" (e.g., "Dec 2024")
            const monthYear = d.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
            
            if (property.property_units && property.property_units.length > 0) {
              // Multi-unit property - filter by selected units if any
              const unitsToProcess = params.unitIds && params.unitIds.length > 0 
                ? property.property_units.filter(unit => params.unitIds!.includes(unit.id))
                : property.property_units;
              
              for (const unit of unitsToProcess) {
                if (unit.monthly_rent) {
                  const rentTransaction: IncomeStatementDetailedItem = {
                    id: `rent-${property.id}-${unit.id}-${d.getTime()}`,
                    type: 'transaction',
                    name: `Unit ${unit.unit_number}`,
                    level: 3,
                    amount: unit.monthly_rent,
                    isTotal: false,
                    date: monthYear,
                    transactionType: 'Expected Rent',
                    checkNo: '',
                    memo: `Expected - ${monthYear}`,
                    dataSource: 'expected'
                  };
                  reportData.push(rentTransaction);
                  totalRentIncome += unit.monthly_rent;
                }
              }
            } else if (property.monthly_rent) {
              // Single unit property
              const rentTransaction: IncomeStatementDetailedItem = {
                id: `rent-${property.id}-${d.getTime()}`,
                type: 'transaction',
                name: 'Expected Rent',
                level: 3,
                amount: property.monthly_rent,
                isTotal: false,
                date: monthYear,
                transactionType: 'Expected Rent',
                checkNo: '',
                memo: `Expected - ${monthYear}`,
                dataSource: 'expected'
              };
              reportData.push(rentTransaction);
              totalRentIncome += property.monthly_rent;
            }
          }
        }

        // Rent Income total
        const rentIncomeTotal: IncomeStatementDetailedItem = {
          id: `rent-income-total-${property.id}`,
          type: 'subtotal',
          name: 'Total Rent Income',
          level: 2,
          amount: totalRentIncome,
          isTotal: true,
          dataSource: 'calculated'
        };
        reportData.push(rentIncomeTotal);

        // Utility Income section (placeholder for now - could be expanded with recurring_charges data)
        const utilityIncomeHeader: IncomeStatementDetailedItem = {
          id: `utility-income-${property.id}`,
          type: 'subcategory',
          name: 'Utility Income',
          level: 2,
          amount: null,
          isTotal: false,
          dataSource: 'actual'
        };
        reportData.push(utilityIncomeHeader);

        const totalUtilityIncome = 0; // TODO: Implement when recurring_charges has data

        const utilityIncomeTotal: IncomeStatementDetailedItem = {
          id: `utility-income-total-${property.id}`,
          type: 'subtotal',
          name: 'Total Utility Income',
          level: 2,
          amount: totalUtilityIncome,
          isTotal: true,
          dataSource: 'calculated'
        };
        reportData.push(utilityIncomeTotal);

        // Total Income for property
        const totalIncome: IncomeStatementDetailedItem = {
          id: `total-income-${property.id}`,
          type: 'total',
          name: 'Total Income',
          level: 1,
          amount: totalRentIncome + totalUtilityIncome,
          isTotal: true,
          dataSource: 'calculated'
        };
        reportData.push(totalIncome);

        // Net Income for property
        const netIncome: IncomeStatementDetailedItem = {
          id: `net-income-${property.id}`,
          type: 'net',
          name: `Net Income - ${property.address}`,
          level: 0,
          amount: totalRentIncome + totalUtilityIncome,
          isTotal: true,
          dataSource: 'calculated'
        };
        reportData.push(netIncome);
      }

      setData(reportData);
    } catch (err) {
      console.error('Error fetching income statement detailed data:', err);
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
    hasRunParams,
    hasCashTransactions
  };
}

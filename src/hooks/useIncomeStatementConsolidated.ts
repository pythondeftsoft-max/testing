import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface ConsolidatedIncomeData {
  income: {
    rentIncome: number;
    utilityIncome: number;
    totalIncome: number;
  };
  netOperatingIncome: number;
  netIncome: number;
  hasCashTransactions: boolean;
  intervals?: {
    [key: string]: ConsolidatedIncomeData;
  };
}

export const useIncomeStatementConsolidated = () => {
  const [data, setData] = useState<ConsolidatedIncomeData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [runParams, setRunParams] = useState<{
    portfolioId?: string;
    startDate?: string;
    endDate?: string;
    propertyIds?: string[];
    interval: 'none' | 'month' | 'quarter';
    accountingBasis: 'cash' | 'accrual';
  } | null>(null);

  const runReport = async (
    portfolioId?: string,
    startDate?: string,
    endDate?: string,
    propertyIds?: string[],
    interval: 'none' | 'month' | 'quarter' = 'none',
    accountingBasis: 'cash' | 'accrual' = 'accrual'
  ) => {
    if (!startDate || !endDate) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      console.log('🔍 Fetching Consolidated Income Statement data:', {
        portfolioId,
        startDate,
        endDate,
        propertyIds,
        interval,
        accountingBasis
      });

      // Store run parameters
      setRunParams({
        portfolioId,
        startDate,
        endDate,
        propertyIds,
        interval,
        accountingBasis
      });

      // Fetch all relevant properties with units and expenses
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
          status, 
          insurance_cost, 
          management_fee, 
          repair_costs,
          mortgage_cost,
          electric_cost,
          gas_cost,
          water_cost,
          sewer_cost,
          other_income,
          utility_reimbursements,
          late_fee_income,
          laundry_income,
          property_units (
            id,
            unit_number,
            unit_name,
            monthly_rent,
            status
          )
        `)
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

      if (!propertiesData || propertiesData.length === 0) {
        console.warn('❌ No properties found with current filters');
        setData(null);
        return;
      }

      const propertyIds_internal = propertiesData.map(p => p.id);

      // Fetch rent payments data for cash basis calculations (including late fees)
      const rentPaymentsResult = await supabase
        .from('rent_payments')
        .select(`
          id,
          property_id,
          unit_id,
          amount,
          late_fee_amount,
          payment_date,
          status
        `)
        .in('property_id', propertyIds_internal)
        .gte('payment_date', startDate)
        .lte('payment_date', endDate)
        .in('status', ['completed', 'paid']);

      if (rentPaymentsResult.error) throw rentPaymentsResult.error;

      const rentPayments = rentPaymentsResult.data || [];
      
      // Fetch expense tracking data for cash basis calculations
      const expensesResult = await supabase
        .from('expense_tracking')
        .select(`
          id,
          property_id,
          category,
          amount,
          expense_date
        `)
        .in('property_id', propertyIds_internal)
        .gte('expense_date', startDate)
        .lte('expense_date', endDate);

      if (expensesResult.error) throw expensesResult.error;

      const expenses = expensesResult.data || [];
      const hasCashTransactions = rentPayments.length > 0;

      console.log('💰 Financial data found:', {
        rentPayments: rentPayments.length,
        hasCashTransactions
      });

      // Calculate consolidated totals
      let consolidatedData: ConsolidatedIncomeData;

      if (interval === 'none') {
        // Single period calculation
        consolidatedData = calculatePeriodData(
          propertiesData,
          rentPayments,
          expenses,
          startDate,
          endDate,
          accountingBasis
        );
        consolidatedData.hasCashTransactions = hasCashTransactions;
      } else {
        // Calculate intervals
        const intervals: { [key: string]: ConsolidatedIncomeData } = {};
        const intervalDates = generateIntervalDates(startDate, endDate, interval);

        for (const intervalDate of intervalDates) {
          const intervalRentPayments = rentPayments.filter(payment => 
            payment.payment_date >= intervalDate.start && payment.payment_date <= intervalDate.end
          );
          const intervalExpenses = expenses.filter(expense =>
            expense.expense_date >= intervalDate.start && expense.expense_date <= intervalDate.end
          );

          intervals[intervalDate.label] = calculatePeriodData(
            propertiesData,
            intervalRentPayments,
            intervalExpenses,
            intervalDate.start,
            intervalDate.end,
            accountingBasis
          );
        }

        // Calculate totals across all intervals
        consolidatedData = {
          income: {
            rentIncome: Object.values(intervals).reduce((sum, period) => sum + period.income.rentIncome, 0),
            utilityIncome: Object.values(intervals).reduce((sum, period) => sum + period.income.utilityIncome, 0),
            totalIncome: Object.values(intervals).reduce((sum, period) => sum + period.income.totalIncome, 0)
          },
          netOperatingIncome: Object.values(intervals).reduce((sum, period) => sum + period.netOperatingIncome, 0),
          netIncome: Object.values(intervals).reduce((sum, period) => sum + period.netIncome, 0),
          hasCashTransactions,
          intervals
        };
      }

      console.log('✅ Processed consolidated income statement data:', consolidatedData);
      setData(consolidatedData);

    } catch (err) {
      console.error('Error fetching consolidated income statement data:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const calculatePeriodData = (
    properties: any[],
    rentPayments: any[],
    expenses: any[],
    startDate: string,
    endDate: string,
    accountingBasis: 'cash' | 'accrual'
  ): ConsolidatedIncomeData => {
    const startDateObj = new Date(startDate);
    const endDateObj = new Date(endDate);
    const monthsInPeriod = (endDateObj.getFullYear() - startDateObj.getFullYear()) * 12 + 
                          (endDateObj.getMonth() - startDateObj.getMonth()) + 1;

    let rentIncome = 0;
    let utilityIncome = 0;

    // Calculate income based on accounting basis
    if (accountingBasis === 'accrual') {
      // Accrual basis: Use expected rent from units
      for (const property of properties) {
        const propertyUnits = (property as any).property_units || [];
        const unitRentTotal = propertyUnits.reduce((sum: number, unit: any) => {
          return sum + (unit.monthly_rent || 0);
        }, 0);
        
        // Use unit rent if available, otherwise fallback to property rent
        const monthlyRent = unitRentTotal > 0 ? unitRentTotal : (property.monthly_rent || 0);
        rentIncome += monthlyRent * monthsInPeriod;
        
        // Add utility income
        utilityIncome += (property.utility_reimbursements || 0) * monthsInPeriod;
      }
    } else {
      // Cash basis: Use actual payments
      rentIncome = rentPayments.reduce((sum, payment) => {
        return sum + (payment.amount || 0);
      }, 0);
      
      // For utility income, still use accrual since payments don't track this separately
      for (const property of properties) {
        utilityIncome += (property.utility_reimbursements || 0) * monthsInPeriod;
      }
    }

    const totalIncome = rentIncome + utilityIncome;

    // Calculate expenses based on accounting basis
    let totalExpenses = 0;
    if (accountingBasis === 'accrual') {
      // Accrual: Use property fields × months
      totalExpenses = properties.reduce((sum, property) => {
        const propertyExpenses = (property.insurance_cost || 0) + 
                                (property.management_fee || 0) + 
                                (property.repair_costs || 0) +
                                (property.mortgage_cost || 0) +
                                (property.electric_cost || 0) +
                                (property.gas_cost || 0) +
                                (property.water_cost || 0) +
                                (property.sewer_cost || 0);
        return sum + (propertyExpenses * monthsInPeriod);
      }, 0);
    } else {
      // Cash basis: Use actual expenses from expense_tracking
      totalExpenses = expenses.reduce((sum, expense) => sum + (expense.amount || 0), 0);
    }

    const netOperatingIncome = totalIncome - totalExpenses;
    const netIncome = netOperatingIncome;

    return {
      income: {
        rentIncome,
        utilityIncome,
        totalIncome
      },
      netOperatingIncome,
      netIncome,
      hasCashTransactions: true // This will be overridden at the main level
    };
  };

  const generateIntervalDates = (startDate: string, endDate: string, interval: 'month' | 'quarter') => {
    const intervals = [];
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (interval === 'quarter') {
      const year = start.getFullYear();
      const quarters = [
        { label: `Q1 ${year}`, start: `${year}-01-01`, end: `${year}-03-31` },
        { label: `Q2 ${year}`, start: `${year}-04-01`, end: `${year}-06-30` },
        { label: `Q3 ${year}`, start: `${year}-07-01`, end: `${year}-09-30` },
        { label: `Q4 ${year}`, start: `${year}-10-01`, end: `${year}-12-31` }
      ];
      
      return quarters.filter(quarter => {
        const quarterStart = new Date(quarter.start);
        const quarterEnd = new Date(quarter.end);
        return quarterStart <= end && quarterEnd >= start;
      });
    } else {
      // Monthly intervals
      const current = new Date(start);
      while (current <= end) {
        const monthStart = new Date(current.getFullYear(), current.getMonth(), 1);
        const monthEnd = new Date(current.getFullYear(), current.getMonth() + 1, 0);
        
        intervals.push({
          label: monthStart.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
          start: monthStart.toISOString().split('T')[0],
          end: monthEnd.toISOString().split('T')[0]
        });
        
        current.setMonth(current.getMonth() + 1);
      }
      
      return intervals;
    }
  };

  return {
    data,
    loading,
    error,
    runReport,
    hasRunParams: !!runParams,
    runParams
  };
};

// Hook to check if cash transactions exist for the given filters
export function useCheckCashTransactions(params?: {
  propertyIds?: string[];
  unitIds?: string[];
  portfolioId?: string;
  dateRange?: { from: string; to: string };
}, enabled?: boolean) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['check-cash-transactions-consolidated', user?.id, params?.propertyIds, params?.unitIds, params?.portfolioId, params?.dateRange],
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

      // Check if any cash transactions exist for these properties in the date range
      const { data: cashTransactions, error: transactionsError } = await supabase
        .from('rent_payments')
        .select('id', { count: 'exact', head: true })
        .in('property_id', propertiesToCheck)
        .gte('payment_date', params.dateRange.from)
        .lte('payment_date', params.dateRange.to)
        .in('status', ['completed', 'paid'])
        .limit(1);

      if (transactionsError) {
        console.error('Error checking cash transactions:', transactionsError);
        return false;
      }

      return cashTransactions !== null && cashTransactions !== undefined;
    },
    enabled: enabled !== false && Boolean(user?.id && params?.dateRange?.from && params?.dateRange?.to),
    staleTime: 30 * 1000, // 30 seconds
  });
};
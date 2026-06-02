import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface IntervalData {
  // Income
  rentIncome: number;
  lateFeeIncome: number;
  utilityIncome: number;
  laundryIncome: number;
  petFeeIncome: number;
  parkingIncome: number;
  storageIncome: number;
  vendingIncome: number;
  amenityFees: number;
  otherIncome: number;
  totalIncome: number;
  // Operating Expenses
  insuranceExpense: number;
  propertyTaxesExpense: number;
  managementExpense: number;
  repairMaintenanceExpense: number;
  waterExpense: number;
  electricExpense: number;
  gasExpense: number;
  sewerExpense: number;
  trashExpense: number;
  landscapingExpense: number;
  cleaningExpense: number;
  legalFeesExpense: number;
  accountingFeesExpense: number;
  marketingExpense: number;
  hoaFeesExpense: number;
  otherOperatingExpenses: number;
  totalOperatingExpenses: number;
  netOperatingIncome: number;
  // Non-Operating Expenses
  mortgageExpense: number;
  totalNonOperatingExpenses: number;
  netIncome: number;
}

export interface IncomeStatementProperty {
  id: string;
  address: string;
  // Income
  rentIncome: number;
  lateFeeIncome: number;
  utilityIncome: number;
  laundryIncome: number;
  petFeeIncome: number;
  parkingIncome: number;
  storageIncome: number;
  vendingIncome: number;
  amenityFees: number;
  otherIncome: number;
  totalIncome: number;
  // Operating Expenses
  insuranceExpense: number;
  propertyTaxesExpense: number;
  managementExpense: number;
  repairMaintenanceExpense: number;
  waterExpense: number;
  electricExpense: number;
  gasExpense: number;
  sewerExpense: number;
  trashExpense: number;
  landscapingExpense: number;
  cleaningExpense: number;
  legalFeesExpense: number;
  accountingFeesExpense: number;
  marketingExpense: number;
  hoaFeesExpense: number;
  otherOperatingExpenses: number;
  totalOperatingExpenses: number;
  netOperatingIncome: number;
  // Non-Operating Expenses
  mortgageExpense: number;
  totalNonOperatingExpenses: number;
  netIncome: number;
  intervalData?: IntervalData[];
  intervalLabels?: string[];
}

export const useIncomeStatement = () => {
  const [properties, setProperties] = useState<IncomeStatementProperty[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [runParams, setRunParams] = useState<{
    portfolioId?: string;
    startDate?: string;
    endDate?: string;
    propertyIds?: string[];
    accountingBasis: 'cash' | 'accrual';
    interval: 'month' | 'quarter' | 'year' | 'none';
  } | null>(null);

  const fetchIncomeStatementData = async (
    portfolioId?: string,
    startDate?: string,
    endDate?: string,
    propertyIds?: string[],
    accountingBasis: 'cash' | 'accrual' = 'accrual',
    interval: 'month' | 'quarter' | 'year' | 'none' = 'none'
  ) => {
    if (!startDate || !endDate) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      // Query properties with their units and all expense fields
      let propertiesQuery = supabase
        .from('properties')
        .select(`
          id,
          address,
          monthly_rent,
          insurance_cost,
          property_taxes,
          mortgage_cost,
          management_fee,
          repair_costs,
          water_cost,
          electric_cost,
          gas_cost,
          sewer_cost,
          trash_cost,
          landscaping_cost,
          cleaning_cost,
          legal_fees,
          accounting_fees,
          marketing_cost,
          hoa_fees,
          utility_reimbursements,
          late_fee_income,
          laundry_income,
          pet_monthly_fee,
          parking_fee,
          storage_fee,
          vending_income,
          amenity_fees,
          other_income,
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

      if (portfolioId && portfolioId !== 'everything' && portfolioId.length === 36) {
        propertiesQuery = propertiesQuery.eq('portfolio_id', portfolioId);
      }

      if (propertyIds && propertyIds.length > 0) {
        propertiesQuery = propertiesQuery.in('id', propertyIds);
      }

      const { data: propertiesData, error: propertiesError } = await propertiesQuery;
      if (propertiesError) throw propertiesError;

      // Query rent payments for cash basis calculation (including late fees)
      let rentPaymentsQuery = supabase
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
        .gte('payment_date', startDate)
        .lte('payment_date', endDate)
        .in('status', ['completed', 'paid']);

      if (propertyIds && propertyIds.length > 0) {
        rentPaymentsQuery = rentPaymentsQuery.in('property_id', propertyIds);
      }

      const { data: rentPaymentsData, error: paymentsError } = await rentPaymentsQuery;
      if (paymentsError) throw paymentsError;

      // Query expense tracking for cash basis calculation
      let expenseQuery = supabase
        .from('expense_tracking')
        .select(`
          id,
          property_id,
          category,
          amount,
          expense_date
        `)
        .gte('expense_date', startDate)
        .lte('expense_date', endDate);

      if (propertyIds && propertyIds.length > 0) {
        expenseQuery = expenseQuery.in('property_id', propertyIds);
      }

      const { data: expenseData, error: expenseError } = await expenseQuery;
      if (expenseError) throw expenseError;

      if (!propertiesData || propertiesData.length === 0) {
        setProperties([]);
        return;
      }

      const processedProperties: IncomeStatementProperty[] = [];

      const startDateObj = new Date(startDate);
      const endDateObj = new Date(endDate);
      
      // Generate interval labels and data
      const { intervals, labels } = generateIntervals(startDateObj, endDateObj, interval);

      for (const property of propertiesData) {
        // Calculate unit-level rent income
        const propertyUnits = (property as any).property_units || [];
        const propertyRentPayments = rentPaymentsData?.filter(payment => payment.property_id === property.id) || [];
        const propertyExpenses = expenseData?.filter(expense => expense.property_id === property.id) || [];
        
        let intervalData: IntervalData[] = [];
        let intervalLabels: string[] = [];

        if (interval !== 'none' && intervals.length > 0) {
          intervalLabels = labels;
          
          // Calculate data for each interval
          intervalData = intervals.map(({ start, end }) => {
            const monthsInInterval = (end.getFullYear() - start.getFullYear()) * 12 + 
                                   (end.getMonth() - start.getMonth()) + 1;

            // Calculate rent income based on accounting basis
            let rentIncome = 0;
            if (accountingBasis === 'accrual') {
              // Accrual basis: Use expected rent from units
              rentIncome = propertyUnits.reduce((sum: number, unit: any) => {
                return sum + (unit.monthly_rent || 0);
              }, 0) * monthsInInterval;
              // Fallback to property-level rent if no units
              if (rentIncome === 0) {
                rentIncome = (property.monthly_rent || 0) * monthsInInterval;
              }
            } else {
              // Cash basis: Use actual payments within interval
              const intervalPayments = propertyRentPayments.filter(payment => {
                const paymentDate = new Date(payment.payment_date);
                return paymentDate >= start && paymentDate <= end;
              });
              rentIncome = intervalPayments.reduce((sum, payment) => sum + (payment.amount || 0), 0);
            }

            // Calculate late fee income based on accounting basis
            let lateFeeIncome = 0;
            if (accountingBasis === 'accrual') {
              lateFeeIncome = (property.late_fee_income || 0) * monthsInInterval;
            } else {
              // Cash basis: Use actual late fees from payments within interval
              const intervalPayments = propertyRentPayments.filter(payment => {
                const paymentDate = new Date(payment.payment_date);
                return paymentDate >= start && paymentDate <= end;
              });
              lateFeeIncome = intervalPayments.reduce((sum, payment) => sum + (payment.late_fee_amount || 0), 0);
            }
            
            const utilityIncome = (property.utility_reimbursements || 0) * monthsInInterval;
            const laundryIncome = (property.laundry_income || 0) * monthsInInterval;
            const petFeeIncome = (property.pet_monthly_fee || 0) * monthsInInterval;
            const parkingIncome = (property.parking_fee || 0) * monthsInInterval;
            const storageIncome = (property.storage_fee || 0) * monthsInInterval;
            const vendingIncome = (property.vending_income || 0) * monthsInInterval;
            const amenityFees = (property.amenity_fees || 0) * monthsInInterval;
            const otherIncome = (property.other_income || 0) * monthsInInterval;
            
            const totalIncome = rentIncome + lateFeeIncome + utilityIncome + laundryIncome + 
                              petFeeIncome + parkingIncome + storageIncome + vendingIncome + 
                              amenityFees + otherIncome;

            // Calculate all operating expenses based on accounting basis
            let insuranceExpense, propertyTaxesExpense, managementExpense, repairMaintenanceExpense;
            let waterExpense, electricExpense, gasExpense, sewerExpense, trashExpense;
            let landscapingExpense, cleaningExpense, legalFeesExpense, accountingFeesExpense;
            let marketingExpense, hoaFeesExpense, otherOperatingExpenses;
            
            if (accountingBasis === 'accrual') {
              // Accrual: Use property fields × months
              insuranceExpense = (property.insurance_cost || 0) * monthsInInterval;
              propertyTaxesExpense = (property.property_taxes || 0) * monthsInInterval;
              managementExpense = (property.management_fee || 0) * monthsInInterval;
              repairMaintenanceExpense = (property.repair_costs || 0) * monthsInInterval;
              waterExpense = (property.water_cost || 0) * monthsInInterval;
              electricExpense = (property.electric_cost || 0) * monthsInInterval;
              gasExpense = (property.gas_cost || 0) * monthsInInterval;
              sewerExpense = (property.sewer_cost || 0) * monthsInInterval;
              trashExpense = (property.trash_cost || 0) * monthsInInterval;
              landscapingExpense = (property.landscaping_cost || 0) * monthsInInterval;
              cleaningExpense = (property.cleaning_cost || 0) * monthsInInterval;
              legalFeesExpense = (property.legal_fees || 0) * monthsInInterval;
              accountingFeesExpense = (property.accounting_fees || 0) * monthsInInterval;
              marketingExpense = (property.marketing_cost || 0) * monthsInInterval;
              hoaFeesExpense = (property.hoa_fees || 0) * monthsInInterval;
              otherOperatingExpenses = 0;
            } else {
              // Cash basis: Use actual expenses from expense_tracking within interval
              const intervalExpenses = propertyExpenses.filter(expense => {
                const expenseDate = new Date(expense.expense_date);
                return expenseDate >= start && expenseDate <= end;
              });
              
              insuranceExpense = intervalExpenses.filter(e => e.category === 'insurance').reduce((sum, e) => sum + (e.amount || 0), 0);
              propertyTaxesExpense = intervalExpenses.filter(e => e.category === 'property_tax').reduce((sum, e) => sum + (e.amount || 0), 0);
              managementExpense = intervalExpenses.filter(e => e.category === 'management').reduce((sum, e) => sum + (e.amount || 0), 0);
              repairMaintenanceExpense = intervalExpenses.filter(e => e.category === 'maintenance' || e.category === 'repairs').reduce((sum, e) => sum + (e.amount || 0), 0);
              waterExpense = intervalExpenses.filter(e => e.category === 'water').reduce((sum, e) => sum + (e.amount || 0), 0);
              electricExpense = intervalExpenses.filter(e => e.category === 'electric' || e.category === 'electricity').reduce((sum, e) => sum + (e.amount || 0), 0);
              gasExpense = intervalExpenses.filter(e => e.category === 'gas').reduce((sum, e) => sum + (e.amount || 0), 0);
              sewerExpense = intervalExpenses.filter(e => e.category === 'sewer').reduce((sum, e) => sum + (e.amount || 0), 0);
              trashExpense = intervalExpenses.filter(e => e.category === 'trash' || e.category === 'garbage').reduce((sum, e) => sum + (e.amount || 0), 0);
              landscapingExpense = intervalExpenses.filter(e => e.category === 'landscaping').reduce((sum, e) => sum + (e.amount || 0), 0);
              cleaningExpense = intervalExpenses.filter(e => e.category === 'cleaning').reduce((sum, e) => sum + (e.amount || 0), 0);
              legalFeesExpense = intervalExpenses.filter(e => e.category === 'legal').reduce((sum, e) => sum + (e.amount || 0), 0);
              accountingFeesExpense = intervalExpenses.filter(e => e.category === 'accounting').reduce((sum, e) => sum + (e.amount || 0), 0);
              marketingExpense = intervalExpenses.filter(e => e.category === 'marketing' || e.category === 'advertising').reduce((sum, e) => sum + (e.amount || 0), 0);
              hoaFeesExpense = intervalExpenses.filter(e => e.category === 'hoa').reduce((sum, e) => sum + (e.amount || 0), 0);
              otherOperatingExpenses = intervalExpenses.filter(e => e.category === 'other' || !['insurance', 'property_tax', 'management', 'maintenance', 'repairs', 'water', 'electric', 'electricity', 'gas', 'sewer', 'trash', 'garbage', 'landscaping', 'cleaning', 'legal', 'accounting', 'marketing', 'advertising', 'hoa', 'mortgage'].includes(e.category)).reduce((sum, e) => sum + (e.amount || 0), 0);
            }

            const totalOperatingExpenses = insuranceExpense + propertyTaxesExpense + managementExpense + 
                                         repairMaintenanceExpense + waterExpense + electricExpense + 
                                         gasExpense + sewerExpense + trashExpense + landscapingExpense + 
                                         cleaningExpense + legalFeesExpense + accountingFeesExpense + 
                                         marketingExpense + hoaFeesExpense + otherOperatingExpenses;
            
            const netOperatingIncome = totalIncome - totalOperatingExpenses;
            
            // Calculate non-operating expenses based on accounting basis
            let mortgageExpense;
            if (accountingBasis === 'accrual') {
              mortgageExpense = (property.mortgage_cost || 0) * monthsInInterval;
            } else {
              // Cash basis: Use actual mortgage payments from expense_tracking
              const intervalExpenses = propertyExpenses.filter(expense => {
                const expenseDate = new Date(expense.expense_date);
                return expenseDate >= start && expenseDate <= end;
              });
              mortgageExpense = intervalExpenses.filter(e => e.category === 'mortgage').reduce((sum, e) => sum + (e.amount || 0), 0);
            }
            const totalNonOperatingExpenses = mortgageExpense;
            
            const netIncome = netOperatingIncome - totalNonOperatingExpenses;

            return {
              rentIncome,
              lateFeeIncome,
              utilityIncome,
              laundryIncome,
              petFeeIncome,
              parkingIncome,
              storageIncome,
              vendingIncome,
              amenityFees,
              otherIncome,
              totalIncome,
              insuranceExpense,
              propertyTaxesExpense,
              managementExpense,
              repairMaintenanceExpense,
              waterExpense,
              electricExpense,
              gasExpense,
              sewerExpense,
              trashExpense,
              landscapingExpense,
              cleaningExpense,
              legalFeesExpense,
              accountingFeesExpense,
              marketingExpense,
              hoaFeesExpense,
              otherOperatingExpenses,
              totalOperatingExpenses,
              netOperatingIncome,
              mortgageExpense,
              totalNonOperatingExpenses,
              netIncome
            };
          });
        }

        // Calculate totals for the entire period
        const monthsInPeriod = (endDateObj.getFullYear() - startDateObj.getFullYear()) * 12 + 
                              (endDateObj.getMonth() - startDateObj.getMonth()) + 1;

        // Calculate rent income based on accounting basis
        let rentIncome = 0;
        if (accountingBasis === 'accrual') {
          // Accrual basis: Use expected rent from units
          rentIncome = propertyUnits.reduce((sum: number, unit: any) => {
            return sum + (unit.monthly_rent || 0);
          }, 0) * monthsInPeriod;
          // Fallback to property-level rent if no units
          if (rentIncome === 0) {
            rentIncome = (property.monthly_rent || 0) * monthsInPeriod;
          }
        } else {
          // Cash basis: Use actual payments within period
          rentIncome = propertyRentPayments.reduce((sum, payment) => sum + (payment.amount || 0), 0);
        }

        // Calculate late fee income based on accounting basis
        let lateFeeIncome = 0;
        if (accountingBasis === 'accrual') {
          lateFeeIncome = (property.late_fee_income || 0) * monthsInPeriod;
        } else {
          // Cash basis: Use actual late fees from payments
          lateFeeIncome = propertyRentPayments.reduce((sum, payment) => sum + (payment.late_fee_amount || 0), 0);
        }
        
        const utilityIncome = (property.utility_reimbursements || 0) * monthsInPeriod;
        const laundryIncome = (property.laundry_income || 0) * monthsInPeriod;
        const petFeeIncome = (property.pet_monthly_fee || 0) * monthsInPeriod;
        const parkingIncome = (property.parking_fee || 0) * monthsInPeriod;
        const storageIncome = (property.storage_fee || 0) * monthsInPeriod;
        const vendingIncome = (property.vending_income || 0) * monthsInPeriod;
        const amenityFees = (property.amenity_fees || 0) * monthsInPeriod;
        const otherIncome = (property.other_income || 0) * monthsInPeriod;
        
        const totalIncome = rentIncome + lateFeeIncome + utilityIncome + laundryIncome + 
                          petFeeIncome + parkingIncome + storageIncome + vendingIncome + 
                          amenityFees + otherIncome;

        // Calculate all operating expenses based on accounting basis
        let insuranceExpense, propertyTaxesExpense, managementExpense, repairMaintenanceExpense;
        let waterExpense, electricExpense, gasExpense, sewerExpense, trashExpense;
        let landscapingExpense, cleaningExpense, legalFeesExpense, accountingFeesExpense;
        let marketingExpense, hoaFeesExpense, otherOperatingExpenses;
        
        if (accountingBasis === 'accrual') {
          // Accrual: Use property fields × months
          insuranceExpense = (property.insurance_cost || 0) * monthsInPeriod;
          propertyTaxesExpense = (property.property_taxes || 0) * monthsInPeriod;
          managementExpense = (property.management_fee || 0) * monthsInPeriod;
          repairMaintenanceExpense = (property.repair_costs || 0) * monthsInPeriod;
          waterExpense = (property.water_cost || 0) * monthsInPeriod;
          electricExpense = (property.electric_cost || 0) * monthsInPeriod;
          gasExpense = (property.gas_cost || 0) * monthsInPeriod;
          sewerExpense = (property.sewer_cost || 0) * monthsInPeriod;
          trashExpense = (property.trash_cost || 0) * monthsInPeriod;
          landscapingExpense = (property.landscaping_cost || 0) * monthsInPeriod;
          cleaningExpense = (property.cleaning_cost || 0) * monthsInPeriod;
          legalFeesExpense = (property.legal_fees || 0) * monthsInPeriod;
          accountingFeesExpense = (property.accounting_fees || 0) * monthsInPeriod;
          marketingExpense = (property.marketing_cost || 0) * monthsInPeriod;
          hoaFeesExpense = (property.hoa_fees || 0) * monthsInPeriod;
          otherOperatingExpenses = 0;
        } else {
          // Cash basis: Use actual expenses from expense_tracking
          insuranceExpense = propertyExpenses.filter(e => e.category === 'insurance').reduce((sum, e) => sum + (e.amount || 0), 0);
          propertyTaxesExpense = propertyExpenses.filter(e => e.category === 'property_tax').reduce((sum, e) => sum + (e.amount || 0), 0);
          managementExpense = propertyExpenses.filter(e => e.category === 'management').reduce((sum, e) => sum + (e.amount || 0), 0);
          repairMaintenanceExpense = propertyExpenses.filter(e => e.category === 'maintenance' || e.category === 'repairs').reduce((sum, e) => sum + (e.amount || 0), 0);
          waterExpense = propertyExpenses.filter(e => e.category === 'water').reduce((sum, e) => sum + (e.amount || 0), 0);
          electricExpense = propertyExpenses.filter(e => e.category === 'electric' || e.category === 'electricity').reduce((sum, e) => sum + (e.amount || 0), 0);
          gasExpense = propertyExpenses.filter(e => e.category === 'gas').reduce((sum, e) => sum + (e.amount || 0), 0);
          sewerExpense = propertyExpenses.filter(e => e.category === 'sewer').reduce((sum, e) => sum + (e.amount || 0), 0);
          trashExpense = propertyExpenses.filter(e => e.category === 'trash' || e.category === 'garbage').reduce((sum, e) => sum + (e.amount || 0), 0);
          landscapingExpense = propertyExpenses.filter(e => e.category === 'landscaping').reduce((sum, e) => sum + (e.amount || 0), 0);
          cleaningExpense = propertyExpenses.filter(e => e.category === 'cleaning').reduce((sum, e) => sum + (e.amount || 0), 0);
          legalFeesExpense = propertyExpenses.filter(e => e.category === 'legal').reduce((sum, e) => sum + (e.amount || 0), 0);
          accountingFeesExpense = propertyExpenses.filter(e => e.category === 'accounting').reduce((sum, e) => sum + (e.amount || 0), 0);
          marketingExpense = propertyExpenses.filter(e => e.category === 'marketing' || e.category === 'advertising').reduce((sum, e) => sum + (e.amount || 0), 0);
          hoaFeesExpense = propertyExpenses.filter(e => e.category === 'hoa').reduce((sum, e) => sum + (e.amount || 0), 0);
          otherOperatingExpenses = propertyExpenses.filter(e => e.category === 'other' || !['insurance', 'property_tax', 'management', 'maintenance', 'repairs', 'water', 'electric', 'electricity', 'gas', 'sewer', 'trash', 'garbage', 'landscaping', 'cleaning', 'legal', 'accounting', 'marketing', 'advertising', 'hoa', 'mortgage'].includes(e.category)).reduce((sum, e) => sum + (e.amount || 0), 0);
        }

        const totalOperatingExpenses = insuranceExpense + propertyTaxesExpense + managementExpense + 
                                     repairMaintenanceExpense + waterExpense + electricExpense + 
                                     gasExpense + sewerExpense + trashExpense + landscapingExpense + 
                                     cleaningExpense + legalFeesExpense + accountingFeesExpense + 
                                     marketingExpense + hoaFeesExpense + otherOperatingExpenses;
        
        const netOperatingIncome = totalIncome - totalOperatingExpenses;
        
        // Calculate non-operating expenses based on accounting basis
        let mortgageExpense;
        if (accountingBasis === 'accrual') {
          mortgageExpense = (property.mortgage_cost || 0) * monthsInPeriod;
        } else {
          // Cash basis: Use actual mortgage payments from expense_tracking
          mortgageExpense = propertyExpenses.filter(e => e.category === 'mortgage').reduce((sum, e) => sum + (e.amount || 0), 0);
        }
        const totalNonOperatingExpenses = mortgageExpense;
        
        const netIncome = netOperatingIncome - totalNonOperatingExpenses;

        processedProperties.push({
          id: property.id,
          address: property.address,
          rentIncome,
          lateFeeIncome,
          utilityIncome,
          laundryIncome,
          petFeeIncome,
          parkingIncome,
          storageIncome,
          vendingIncome,
          amenityFees,
          otherIncome,
          totalIncome,
          insuranceExpense,
          propertyTaxesExpense,
          managementExpense,
          repairMaintenanceExpense,
          waterExpense,
          electricExpense,
          gasExpense,
          sewerExpense,
          trashExpense,
          landscapingExpense,
          cleaningExpense,
          legalFeesExpense,
          accountingFeesExpense,
          marketingExpense,
          hoaFeesExpense,
          otherOperatingExpenses,
          totalOperatingExpenses,
          netOperatingIncome,
          mortgageExpense,
          totalNonOperatingExpenses,
          netIncome,
          intervalData: interval !== 'none' ? intervalData : undefined,
          intervalLabels: interval !== 'none' ? intervalLabels : undefined
        });
      }

      setProperties(processedProperties);
    } catch (err) {
      console.error('Error fetching income statement data:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (runParams) {
      fetchIncomeStatementData(
        runParams.portfolioId,
        runParams.startDate,
        runParams.endDate,
        runParams.propertyIds,
        runParams.accountingBasis,
        runParams.interval
      );
    }
  }, [runParams]);

  const runReport = (
    portfolioId?: string,
    startDate?: string,
    endDate?: string,
    propertyIds?: string[],
    accountingBasis: 'cash' | 'accrual' = 'accrual',
    interval: 'month' | 'quarter' | 'year' | 'none' = 'none'
  ) => {
    setRunParams({
      portfolioId,
      startDate,
      endDate,
      propertyIds,
      accountingBasis,
      interval
    });
  };

  return {
    properties,
    loading,
    error,
    runReport,
    hasRunParams: !!runParams
  };
};

// Helper function to generate interval periods
function generateIntervals(startDate: Date, endDate: Date, interval: 'month' | 'quarter' | 'year' | 'none') {
  const intervals: { start: Date; end: Date }[] = [];
  const labels: string[] = [];

  if (interval === 'none') {
    return { intervals, labels };
  }

  const current = new Date(startDate);
  
  while (current <= endDate) {
    let intervalEnd = new Date(current);
    let label = '';

    switch (interval) {
      case 'month':
        intervalEnd = new Date(current.getFullYear(), current.getMonth() + 1, 0);
        if (intervalEnd > endDate) intervalEnd = new Date(endDate);
        label = current.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        break;
      
      case 'quarter':
        const quarterNum = Math.floor(current.getMonth() / 3) + 1;
        intervalEnd = new Date(current.getFullYear(), quarterNum * 3, 0);
        if (intervalEnd > endDate) intervalEnd = new Date(endDate);
        label = `Q${quarterNum} ${current.getFullYear()}`;
        break;
      
      case 'year':
        intervalEnd = new Date(current.getFullYear(), 11, 31);
        if (intervalEnd > endDate) intervalEnd = new Date(endDate);
        label = current.getFullYear().toString();
        break;
    }

    intervals.push({ start: new Date(current), end: intervalEnd });
    labels.push(label);

    // Move to next interval
    switch (interval) {
      case 'month':
        current.setMonth(current.getMonth() + 1, 1);
        break;
      case 'quarter':
        current.setMonth(current.getMonth() + 3, 1);
        break;
      case 'year':
        current.setFullYear(current.getFullYear() + 1, 0, 1);
        break;
    }

    // Safety check to prevent infinite loops
    if (current > endDate) break;
  }

  return { intervals, labels };
}
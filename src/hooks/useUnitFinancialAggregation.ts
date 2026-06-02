
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface PropertyUnit {
  id: string;
  unit_number: string;
  unit_name: string | null;
  monthly_rent: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  square_feet: number | null;
  status: string;
  tenant_id: string | null;
  // Unit-specific financial fields (may not exist in DB yet)
  security_deposit_amount: number | null;
  additional_income: number | null;
  utility_costs: number | null;
  maintenance_costs: number | null;
  insurance_allocation: number | null;
  property_tax_allocation: number | null;
  management_fee_allocation: number | null;
  // Allow additional properties that may come from the database
  [key: string]: any;
}

interface PropertyLevelFinancials {
  id: string;
  monthly_rent: number | null;
  mortgage_cost: number | null;
  insurance_cost: number | null;
  management_fee: number | null;
  repair_costs: number | null;
  property_taxes: number | null;
  unit_count: number | null;
}

interface UnitFinancialSummary {
  unitId: string;
  unitNumber: string;
  unitName: string | null;
  status: string;
  monthlyRent: number;
  additionalIncome: number;
  totalUnitIncome: number;
  unitOperatingExpenses: number;
  unitNetIncome: number;
  occupancyStatus: 'occupied' | 'vacant' | 'maintenance';
}

interface AggregatedFinancials {
  // Unit-level aggregated income
  totalPotentialRent: number;
  totalActualRent: number;
  totalAdditionalIncome: number;
  totalUnitIncome: number;
  
  // Unit-level aggregated expenses
  totalUnitOperatingExpenses: number;
  totalUtilityCosts: number;
  totalUnitMaintenanceCosts: number;
  totalInsuranceAllocation: number;
  totalPropertyTaxAllocation: number;
  totalManagementFeeAllocation: number;
  
  // Property-level expenses (applied to entire property)
  propertyMortgageCost: number;
  propertyInsuranceCost: number;
  propertyManagementFee: number;
  propertyRepairCosts: number;
  propertyTaxes: number;
  totalPropertyLevelExpenses: number;
  
  // Combined totals
  totalIncome: number;
  totalExpenses: number;
  netOperatingIncome: number;
  
  // Performance Metrics
  occupancyRate: number;
  vacancyRate: number;
  averageRentPerUnit: number;
  
  // Unit Summary
  totalUnits: number;
  occupiedUnits: number;
  vacantUnits: number;
  maintenanceUnits: number;
  
  // Unit Details
  unitSummaries: UnitFinancialSummary[];
}

export const useUnitFinancialAggregation = (propertyId: string) => {
  const [units, setUnits] = useState<PropertyUnit[]>([]);
  const [propertyFinancials, setPropertyFinancials] = useState<PropertyLevelFinancials | null>(null);
  const [aggregatedData, setAggregatedData] = useState<AggregatedFinancials | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (propertyId) {
      fetchFinancialData();
    }
  }, [propertyId]);

  const fetchFinancialData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch property-level financial data
      const { data: propertyData, error: propertyError } = await supabase
        .from('properties')
        .select(`
          id,
          monthly_rent,
          mortgage_cost,
          insurance_cost,
          management_fee,
          repair_costs,
          property_taxes,
          unit_count
        `)
        .eq('id', propertyId)
        .single();

      if (propertyError) throw propertyError;

      // Fetch unit-level data including new financial columns
      const { data: unitsData, error: unitsError } = await supabase
        .from('property_units')
        .select(`
          id,
          unit_number,
          unit_name,
          monthly_rent,
          bedrooms,
          bathrooms,
          square_feet,
          status,
          tenant_id,
          additional_income,
          security_deposit_amount,
          utility_costs,
          maintenance_costs,
          insurance_allocation,
          property_tax_allocation,
          management_fee_allocation
        `)
        .eq('property_id', propertyId)
        .order('unit_number');

      if (unitsError) throw unitsError;

      setPropertyFinancials(propertyData as PropertyLevelFinancials);
      
      // Transform the data with proper type casting for financial fields
      const typedUnitsData: PropertyUnit[] = (unitsData || []).map(unit => ({
        ...unit,
        // Ensure financial fields have default values if null
        additional_income: unit.additional_income || 0,
        utility_costs: unit.utility_costs || 0,
        maintenance_costs: unit.maintenance_costs || 0,
        insurance_allocation: unit.insurance_allocation || 0,
        property_tax_allocation: unit.property_tax_allocation || 0,
        management_fee_allocation: unit.management_fee_allocation || 0,
      }));
      
      setUnits(typedUnitsData);
      calculateAggregatedFinancials(
        typedUnitsData, 
        propertyData as PropertyLevelFinancials
      );
    } catch (err) {
      console.error('Error fetching financial data:', err);
      setError('Failed to load financial data');
    } finally {
      setLoading(false);
    }
  };

  const calculateAggregatedFinancials = (
    unitsData: PropertyUnit[], 
    propertyData: PropertyLevelFinancials
  ) => {
    if (!unitsData.length || !propertyData) {
      setAggregatedData(null);
      return;
    }

    // Calculate unit-level summaries
    const unitSummaries: UnitFinancialSummary[] = unitsData.map(unit => {
      const monthlyRent = unit.monthly_rent || 0;
      const additionalIncome = unit.additional_income || 0;
      const totalUnitIncome = monthlyRent + additionalIncome;
      
      const unitOperatingExpenses = (unit.utility_costs || 0) + 
                                   (unit.maintenance_costs || 0) + 
                                   (unit.insurance_allocation || 0) + 
                                   (unit.property_tax_allocation || 0) + 
                                   (unit.management_fee_allocation || 0);
      
      const unitNetIncome = totalUnitIncome - unitOperatingExpenses;
      
      return {
        unitId: unit.id,
        unitNumber: unit.unit_number,
        unitName: unit.unit_name,
        status: unit.status,
        monthlyRent,
        additionalIncome,
        totalUnitIncome,
        unitOperatingExpenses,
        unitNetIncome,
        occupancyStatus: unit.status as 'occupied' | 'vacant' | 'maintenance'
      };
    });

    // Aggregate unit-level data
    const totalPotentialRent = unitsData.reduce((sum, unit) => sum + (unit.monthly_rent || 0), 0);
    const occupiedUnits = unitsData.filter(unit => unit.status === 'occupied');
    const totalActualRent = occupiedUnits.reduce((sum, unit) => sum + (unit.monthly_rent || 0), 0);
    const totalAdditionalIncome = unitsData.reduce((sum, unit) => sum + (unit.additional_income || 0), 0);
    
    const totalUtilityCosts = unitsData.reduce((sum, unit) => sum + (unit.utility_costs || 0), 0);
    const totalUnitMaintenanceCosts = unitsData.reduce((sum, unit) => sum + (unit.maintenance_costs || 0), 0);
    const totalInsuranceAllocation = unitsData.reduce((sum, unit) => sum + (unit.insurance_allocation || 0), 0);
    const totalPropertyTaxAllocation = unitsData.reduce((sum, unit) => sum + (unit.property_tax_allocation || 0), 0);
    const totalManagementFeeAllocation = unitsData.reduce((sum, unit) => sum + (unit.management_fee_allocation || 0), 0);
    
    const totalUnitOperatingExpenses = totalUtilityCosts + totalUnitMaintenanceCosts + 
                                      totalInsuranceAllocation + totalPropertyTaxAllocation + totalManagementFeeAllocation;
    
    const totalUnitIncome = totalActualRent + totalAdditionalIncome;

    // Property-level expenses (these apply to the entire property)
    const propertyMortgageCost = propertyData.mortgage_cost || 0;
    const propertyInsuranceCost = propertyData.insurance_cost || 0;
    const propertyManagementFee = propertyData.management_fee || 0;
    const propertyRepairCosts = propertyData.repair_costs || 0;
    const propertyTaxes = propertyData.property_taxes || 0;
    const totalPropertyLevelExpenses = propertyMortgageCost + propertyInsuranceCost + 
                                      propertyManagementFee + propertyRepairCosts + propertyTaxes;

    // Combined calculations
    const totalIncome = totalUnitIncome;
    const totalExpenses = totalUnitOperatingExpenses + totalPropertyLevelExpenses;
    const netOperatingIncome = totalIncome - totalExpenses;
    
    const totalUnits = unitsData.length;
    const vacantUnits = unitsData.filter(unit => unit.status === 'vacant').length;
    const maintenanceUnits = unitsData.filter(unit => unit.status === 'maintenance').length;
    
    const occupancyRate = totalUnits > 0 ? (occupiedUnits.length / totalUnits) * 100 : 0;
    const vacancyRate = 100 - occupancyRate;
    const averageRentPerUnit = totalUnits > 0 ? totalPotentialRent / totalUnits : 0;
    
    const aggregated: AggregatedFinancials = {
      // Unit-level aggregated income
      totalPotentialRent,
      totalActualRent,
      totalAdditionalIncome,
      totalUnitIncome,
      
      // Unit-level aggregated expenses
      totalUnitOperatingExpenses,
      totalUtilityCosts,
      totalUnitMaintenanceCosts,
      totalInsuranceAllocation,
      totalPropertyTaxAllocation,
      totalManagementFeeAllocation,
      
      // Property-level expenses
      propertyMortgageCost,
      propertyInsuranceCost,
      propertyManagementFee,
      propertyRepairCosts,
      propertyTaxes,
      totalPropertyLevelExpenses,
      
      // Combined totals
      totalIncome,
      totalExpenses,
      netOperatingIncome,
      
      // Performance metrics
      occupancyRate,
      vacancyRate,
      averageRentPerUnit,
      
      // Unit summary
      totalUnits,
      occupiedUnits: occupiedUnits.length,
      vacantUnits,
      maintenanceUnits,
      unitSummaries
    };

    setAggregatedData(aggregated);
  };

  const refreshData = () => {
    fetchFinancialData();
  };

  return {
    units,
    propertyFinancials,
    aggregatedData,
    loading,
    error,
    refreshData
  };
};

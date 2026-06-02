
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useUnitFinancialAggregation } from '@/hooks/useUnitFinancialAggregation';

interface PropertyFinancialBreakdownProps {
  property: {
    id: string;
    monthly_rent: number;
    mortgage_cost?: number;
    insurance_cost?: number;
    management_fee?: number;
    repair_costs?: number;
    property_taxes?: number;
    unit_count?: number;
    // Enhanced comprehensive financial fields
    purchase_price?: number;
    current_market_value?: number;
    down_payment_amount?: number;
    loan_amount?: number;
    interest_rate?: number;
    security_deposit_amount?: number;
    application_fee?: number;
    late_fee_amount?: number;
    pet_deposit?: number;
    pet_fee_monthly?: number;
    utility_water?: number;
    utility_electric?: number;
    utility_gas?: number;
    utility_trash?: number;
    landscaping_cost?: number;
    advertising_cost?: number;
    legal_professional_fees?: number;
    capital_improvements?: number;
    property_management_software?: number;
    turnover_costs?: number;
    tenant_screening_costs?: number;
    lease_renewal_rate?: number;
    average_rent_increase?: number;
    target_noi?: number;
    target_cap_rate?: number;
    expected_annual_appreciation?: number;
    reserve_fund_target?: number;
    other_income_sources?: number;
    other_income_description?: string;
  };
}

const PropertyFinancialBreakdown = ({ property }: PropertyFinancialBreakdownProps) => {
  const { aggregatedData, loading, error, propertyFinancials } = useUnitFinancialAggregation(property.id);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatPercentage = (percentage: number) => {
    return `${percentage.toFixed(1)}%`;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="h-8 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !aggregatedData || !propertyFinancials) {
    // Fallback to property-level data only
    const monthlyRent = property.monthly_rent || 0;
    const mortgage = property.mortgage_cost || 0;
    const insurance = property.insurance_cost || 0;
    const management = property.management_fee || 0;
    const repairs = property.repair_costs || 0;
    const taxes = property.property_taxes || 0;
    
    const totalExpenses = mortgage + insurance + management + repairs + taxes;
    const netProfit = monthlyRent - totalExpenses;
    const annualProfit = netProfit * 12;
    const roi = monthlyRent > 0 ? (netProfit / monthlyRent) * 100 : 0;

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Monthly Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-green-600 font-medium">Monthly Rent</span>
              <span className="font-semibold text-green-600">+{formatCurrency(monthlyRent)}</span>
            </div>
            
            <div className="space-y-2">
              {mortgage > 0 && (
                <div className="flex justify-between items-center text-sm">
                  <span>Mortgage</span>
                  <span className="text-red-600">-{formatCurrency(mortgage)}</span>
                </div>
              )}
              {insurance > 0 && (
                <div className="flex justify-between items-center text-sm">
                  <span>Insurance</span>
                  <span className="text-red-600">-{formatCurrency(insurance)}</span>
                </div>
              )}
              {management > 0 && (
                <div className="flex justify-between items-center text-sm">
                  <span>Management</span>
                  <span className="text-red-600">-{formatCurrency(management)}</span>
                </div>
              )}
              {repairs > 0 && (
                <div className="flex justify-between items-center text-sm">
                  <span>Repairs</span>
                  <span className="text-red-600">-{formatCurrency(repairs)}</span>
                </div>
              )}
              {taxes > 0 && (
                <div className="flex justify-between items-center text-sm">
                  <span>Property Taxes</span>
                  <span className="text-red-600">-{formatCurrency(taxes)}</span>
                </div>
              )}
            </div>
            
            <div className="border-t pt-2 mt-3">
              <div className="flex justify-between items-center font-semibold">
                <span>Net Profit</span>
                <span className={netProfit >= 0 ? 'text-green-600' : 'text-red-600'}>
                  {formatCurrency(netProfit)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Performance Metrics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span>Monthly Profit</span>
              <span className={`font-semibold ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(netProfit)}
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <span>Yearly Profit</span>
              <span className={`font-semibold ${annualProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(annualProfit)}
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <span>Profit Margin</span>
              <span className={`font-semibold ${roi >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                {formatPercentage(roi)}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Use aggregated data for comprehensive view
  const netProfit = aggregatedData.netOperatingIncome;
  const annualProfit = netProfit * 12;
  const roi = aggregatedData.totalIncome > 0 ? (netProfit / aggregatedData.totalIncome) * 100 : 0;

  // Enhanced ROI calculations
  const cashOnCashReturn = property.down_payment_amount > 0 ? 
    (annualProfit / property.down_payment_amount) * 100 : 0;
  const capRate = property.current_market_value > 0 ? 
    (annualProfit / property.current_market_value) * 100 : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Monthly Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Monthly Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Income Section */}
          <div className="flex justify-between items-center">
            <span className="text-green-600 font-medium">Total Income</span>
            <span className="font-semibold text-green-600">+{formatCurrency(aggregatedData.totalIncome)}</span>
          </div>
          
          {aggregatedData.totalActualRent !== aggregatedData.totalIncome && (
            <div className="flex justify-between items-center text-sm">
              <span className="text-green-600 ml-4">• Rent Income</span>
              <span className="text-green-600">+{formatCurrency(aggregatedData.totalActualRent)}</span>
            </div>
          )}
          
          {aggregatedData.totalAdditionalIncome > 0 && (
            <div className="flex justify-between items-center text-sm">
              <span className="text-green-600 ml-4">• Other Income</span>
              <span className="text-green-600">+{formatCurrency(aggregatedData.totalAdditionalIncome)}</span>
            </div>
          )}
          
          {/* Property-Level Expenses */}
          <div className="space-y-2 mt-4">
            <div className="text-sm font-medium text-gray-600">Property Expenses:</div>
            {aggregatedData.propertyMortgageCost > 0 && (
              <div className="flex justify-between items-center text-sm">
                <span className="ml-4">• Mortgage</span>
                <span className="text-red-600">-{formatCurrency(aggregatedData.propertyMortgageCost)}</span>
              </div>
            )}
            {aggregatedData.propertyInsuranceCost > 0 && (
              <div className="flex justify-between items-center text-sm">
                <span className="ml-4">• Insurance</span>
                <span className="text-red-600">-{formatCurrency(aggregatedData.propertyInsuranceCost)}</span>
              </div>
            )}
            {aggregatedData.propertyManagementFee > 0 && (
              <div className="flex justify-between items-center text-sm">
                <span className="ml-4">• Management Fee</span>
                <span className="text-red-600">-{formatCurrency(aggregatedData.propertyManagementFee)}</span>
              </div>
            )}
            {aggregatedData.propertyRepairCosts > 0 && (
              <div className="flex justify-between items-center text-sm">
                <span className="ml-4">• Repairs</span>
                <span className="text-red-600">-{formatCurrency(aggregatedData.propertyRepairCosts)}</span>
              </div>
            )}
            {aggregatedData.propertyTaxes > 0 && (
              <div className="flex justify-between items-center text-sm">
                <span className="ml-4">• Property Taxes</span>
                <span className="text-red-600">-{formatCurrency(aggregatedData.propertyTaxes)}</span>
              </div>
            )}
          </div>

          {/* Unit-Level Expenses */}
          {aggregatedData.totalUnitOperatingExpenses > 0 && (
            <div className="space-y-2 mt-4">
              <div className="text-sm font-medium text-gray-600">Unit Expenses:</div>
              {aggregatedData.totalUtilityCosts > 0 && (
                <div className="flex justify-between items-center text-sm">
                  <span className="ml-4">• Utilities</span>
                  <span className="text-red-600">-{formatCurrency(aggregatedData.totalUtilityCosts)}</span>
                </div>
              )}
              {aggregatedData.totalUnitMaintenanceCosts > 0 && (
                <div className="flex justify-between items-center text-sm">
                  <span className="ml-4">• Unit Maintenance</span>
                  <span className="text-red-600">-{formatCurrency(aggregatedData.totalUnitMaintenanceCosts)}</span>
                </div>
              )}
            </div>
          )}
          
          <div className="border-t pt-2 mt-3">
            <div className="flex justify-between items-center font-semibold">
              <span>Net Operating Income</span>
              <span className={netProfit >= 0 ? 'text-green-600' : 'text-red-600'}>
                {formatCurrency(netProfit)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Performance Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Performance Metrics</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between items-center">
            <span>Monthly NOI</span>
            <span className={`font-semibold ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(netProfit)}
            </span>
          </div>
          
          <div className="flex justify-between items-center">
            <span>Annual NOI</span>
            <span className={`font-semibold ${annualProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(annualProfit)}
            </span>
          </div>
          
          <div className="flex justify-between items-center">
            <span>Profit Margin</span>
            <span className={`font-semibold ${roi >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
              {formatPercentage(roi)}
            </span>
          </div>

          {aggregatedData.totalUnits > 1 && (
            <div className="flex justify-between items-center">
              <span>Occupancy Rate</span>
              <span className="font-semibold text-blue-600">
                {formatPercentage(aggregatedData.occupancyRate)}
              </span>
            </div>
          )}

          {aggregatedData.totalUnits > 1 && (
            <div className="flex justify-between items-center">
              <span>Avg. Rent/Unit</span>
              <span className="font-semibold text-blue-600">
                {formatCurrency(aggregatedData.averageRentPerUnit)}
              </span>
            </div>
          )}
          
          {property.down_payment_amount && property.down_payment_amount > 0 && (
            <div className="flex justify-between items-center">
              <span>Cash-on-Cash Return</span>
              <span className={`font-semibold ${cashOnCashReturn >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                {formatPercentage(cashOnCashReturn)}
              </span>
            </div>
          )}
          
          {property.current_market_value && property.current_market_value > 0 && (
            <div className="flex justify-between items-center">
              <span>Cap Rate</span>
              <span className={`font-semibold ${capRate >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                {formatPercentage(capRate)}
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PropertyFinancialBreakdown;

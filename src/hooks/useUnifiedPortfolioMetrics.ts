import { useMemo } from 'react';
import { usePortfolioMetrics } from './usePortfolioMetrics';
import { useUserAssets } from './useUserAssets';
import { useEnhancedLandlordAnalytics } from './useEnhancedLandlordAnalytics';

export interface UnifiedPortfolioMetrics {
  // Total Values
  totalNetWorth: number;
  totalPropertyValue: number;
  totalAssetValue: number;
  
  // Cash Flow
  totalMonthlyIncome: number;
  totalMonthlyExpenses: number;
  netMonthlyCashFlow: number;
  propertyIncome: number;
  assetIncome: number;
  
  // Performance
  overallROI: number;
  propertyROI: number;
  assetROI: number;
  
  // Counts
  propertyCount: number;
  assetCount: number;
  totalHoldingsCount: number;
  
  // Diversity
  diversityScore: number;
  diversityRating: 'concentrated' | 'moderate' | 'diversified';
  
  // Allocation
  assetAllocation: {
    properties: number;
    stocks: number;
    crypto: number;
    realEstate: number;
    other: number;
  };
  
  // Income Sources
  incomeSources: {
    rentalIncome: number;
    dividends: number;
    interest: number;
    appreciation: number;
    other: number;
  };
  
  // Expense Categories
  expenseCategories: {
    propertyExpenses: number;
    assetFees: number;
    maintenance: number;
    insurance: number;
    taxes: number;
    other: number;
  };
}

export const useUnifiedPortfolioMetrics = (
  landlordId: string,
  portfolioId?: string,
  userId?: string
) => {
  // Fetch property metrics
  const { data: propertyMetrics, isLoading: propertyLoading, error: propertyError } = 
    usePortfolioMetrics(portfolioId || 'everything');
  
  // Fetch financial assets
  const { data: userAssets, isLoading: assetsLoading, error: assetsError } = 
    useUserAssets(userId);
  
  // Fetch enhanced analytics
  const { data: analytics, isLoading: analyticsLoading, error: analyticsError } = 
    useEnhancedLandlordAnalytics(landlordId, portfolioId);

  const unifiedMetrics = useMemo((): UnifiedPortfolioMetrics => {
    // Property values
    const propertyValue = (propertyMetrics?.unit_count || 0) * 250000; // Estimate
    const propertyMonthlyRent = propertyMetrics?.gross_monthly_rent || 0;
    const propertyExpenses = analytics?.enhancedMetrics?.totalExpenses || 0;
    const propertyIncome = propertyMonthlyRent;
    
    // Asset values
    const assetValue = userAssets?.reduce((sum, asset) => {
      return sum + (asset.current_value || asset.asset_value || 0);
    }, 0) || 0;
    
    const assetIncome = userAssets?.reduce((sum, asset) => {
      return sum + (asset.annual_income || 0) / 12;
    }, 0) || 0;
    
    const assetExpenses = userAssets?.reduce((sum, asset) => {
      return sum + (asset.annual_expenses || 0) / 12;
    }, 0) || 0;
    
    // Calculate asset ROI
    const totalAssetCost = userAssets?.reduce((sum, asset) => {
      return sum + (asset.acquisition_cost || asset.asset_value || 0);
    }, 0) || 0;
    
    const assetROI = totalAssetCost > 0 
      ? ((assetValue - totalAssetCost) / totalAssetCost) * 100 
      : 0;
    
    // Calculate property ROI
    const propertyROI = analytics?.enhancedMetrics?.yearOverYearGrowth || 0;
    
    // Calculate overall ROI (weighted average)
    const totalValue = propertyValue + assetValue;
    const overallROI = totalValue > 0
      ? ((propertyROI * propertyValue + assetROI * assetValue) / totalValue)
      : 0;
    
    // Asset allocation breakdown
    const stockValue = userAssets?.filter(a => 
      ['stock', 'etf', 'mutual_fund'].includes(a.metadata?.asset_type || '')
    ).reduce((sum, a) => sum + (a.current_value || a.asset_value || 0), 0) || 0;
    
    const cryptoValue = userAssets?.filter(a => 
      a.metadata?.asset_type === 'crypto'
    ).reduce((sum, a) => sum + (a.current_value || a.asset_value || 0), 0) || 0;
    
    const realEstateValue = propertyValue;
    const otherValue = assetValue - stockValue - cryptoValue;
    
    // Income sources breakdown
    const rentalIncome = propertyMonthlyRent;
    const dividends = assetIncome * 0.7; // Estimate
    const interest = assetIncome * 0.2; // Estimate
    const appreciation = assetIncome * 0.1; // Estimate
    
    // Expense categories
    const maintenanceCost = analytics?.maintenanceAnalytics?.totalMaintenanceCost || 0;
    const insuranceCost = propertyExpenses * 0.15; // Estimate
    const taxesCost = propertyExpenses * 0.25; // Estimate
    const otherExpenses = propertyExpenses - maintenanceCost - insuranceCost - taxesCost;
    
    // Counts
    const propertyCount = propertyMetrics?.unit_count || 0;
    const assetCount = userAssets?.length || 0;
    const totalHoldingsCount = propertyCount + assetCount;
    
    // Calculate diversity score (0-100)
    // Based on how evenly assets are distributed across categories
    const allocations = [
      realEstateValue / totalValue,
      stockValue / totalValue,
      cryptoValue / totalValue,
      otherValue / totalValue,
    ].filter(v => v > 0);
    
    // Shannon diversity index adapted for portfolio (0-100 scale)
    const diversityScore = allocations.length > 1
      ? Math.min(100, (allocations.reduce((sum, p) => sum - (p * Math.log(p)), 0) / Math.log(4)) * 100)
      : 0;
    
    const diversityRating: 'concentrated' | 'moderate' | 'diversified' = 
      diversityScore > 70 ? 'diversified' :
      diversityScore > 40 ? 'moderate' : 'concentrated';
    
    return {
      totalNetWorth: propertyValue + assetValue,
      totalPropertyValue: propertyValue,
      totalAssetValue: assetValue,
      
      totalMonthlyIncome: propertyIncome + assetIncome,
      totalMonthlyExpenses: propertyExpenses + assetExpenses,
      netMonthlyCashFlow: (propertyIncome + assetIncome) - (propertyExpenses + assetExpenses),
      propertyIncome,
      assetIncome,
      
      overallROI,
      propertyROI,
      assetROI,
      
      propertyCount,
      assetCount,
      totalHoldingsCount,
      
      diversityScore,
      diversityRating,
      
      assetAllocation: {
        properties: (realEstateValue / totalValue) * 100 || 0,
        stocks: (stockValue / totalValue) * 100 || 0,
        crypto: (cryptoValue / totalValue) * 100 || 0,
        realEstate: (realEstateValue / totalValue) * 100 || 0,
        other: (otherValue / totalValue) * 100 || 0,
      },
      
      incomeSources: {
        rentalIncome,
        dividends,
        interest,
        appreciation,
        other: 0,
      },
      
      expenseCategories: {
        propertyExpenses: propertyExpenses - maintenanceCost,
        assetFees: assetExpenses,
        maintenance: maintenanceCost,
        insurance: insuranceCost,
        taxes: taxesCost,
        other: otherExpenses,
      },
    };
  }, [propertyMetrics, userAssets, analytics]);

  return {
    data: unifiedMetrics,
    isLoading: propertyLoading || assetsLoading || analyticsLoading,
    error: propertyError || assetsError || analyticsError,
  };
};

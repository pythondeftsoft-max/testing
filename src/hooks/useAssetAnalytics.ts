import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { PortfolioAsset, AssetValuation } from '@/types/portfolio-assets';

export interface AssetPerformanceMetrics {
  id: string;
  name: string;
  category: string;
  roi: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  netMonthlyIncome: number;
  currentValue: number;
  acquisitionCost: number;
  totalReturn: number;
  cashFlow: number[];
  riskScore: number;
  healthScore: number;
  lastValuationDate?: string;
  daysSinceAcquisition: number;
  annualizedReturn: number;
}

export interface PortfolioAnalytics {
  totalAssets: number;
  totalValue: number;
  totalROI: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  netMonthlyIncome: number;
  averageROI: number;
  topPerformingAssets: AssetPerformanceMetrics[];
  underperformingAssets: AssetPerformanceMetrics[];
  assetAllocation: { category: string; value: number; percentage: number; color: string }[];
  performanceTrend: { date: string; value: number; income: number; expenses: number }[];
  riskDistribution: { low: number; medium: number; high: number };
}

export interface AssetComparison {
  assets: AssetPerformanceMetrics[];
  benchmarks: {
    portfolioAverage: number;
    categoryAverage: number;
    marketAverage: number;
  };
}

// Calculate asset performance metrics
const calculateAssetMetrics = (asset: PortfolioAsset, valuations: AssetValuation[]): AssetPerformanceMetrics => {
  const acquisitionCost = asset.acquisition_cost || asset.asset_value;
  const currentValue = asset.current_value || asset.asset_value;
  const monthlyIncome = (asset.annual_income || 0) / 12;
  const monthlyExpenses = (asset.annual_expenses || 0) / 12;
  const netMonthlyIncome = monthlyIncome - monthlyExpenses;
  
  // Calculate ROI
  const totalReturn = currentValue - acquisitionCost;
  const roi = acquisitionCost > 0 ? (totalReturn / acquisitionCost) * 100 : 0;
  
  // Calculate days since acquisition
  const acquisitionDate = asset.acquisition_date ? new Date(asset.acquisition_date) : new Date(asset.created_at);
  const daysSinceAcquisition = Math.floor((Date.now() - acquisitionDate.getTime()) / (1000 * 60 * 60 * 24));
  
  // Calculate annualized return
  const yearsSinceAcquisition = daysSinceAcquisition / 365;
  const annualizedReturn = yearsSinceAcquisition > 0 ? Math.pow(currentValue / acquisitionCost, 1 / yearsSinceAcquisition) - 1 : 0;
  
  // Generate mock cash flow data (last 12 months)
  const cashFlow = Array.from({ length: 12 }, (_, i) => {
    const variance = Math.random() * 0.2 - 0.1; // ±10% variance
    return netMonthlyIncome * (1 + variance);
  });
  
  // Calculate risk score (0-100, higher = riskier)
  const incomeVariability = monthlyIncome > 0 ? Math.abs(monthlyExpenses / monthlyIncome) * 50 : 50;
  const ageRisk = Math.min(daysSinceAcquisition / 365 * 10, 30); // Older assets are less risky
  const riskScore = Math.max(0, Math.min(100, incomeVariability + (50 - ageRisk)));
  
  // Calculate health score (0-100, higher = healthier)
  const roiScore = Math.min(100, Math.max(0, (roi + 20) * 2)); // ROI from -20% to 30% maps to 0-100
  const incomeScore = netMonthlyIncome > 0 ? 100 : Math.max(0, 50 + netMonthlyIncome / 100);
  const healthScore = (roiScore + incomeScore) / 2;
  
  return {
    id: asset.id,
    name: asset.asset_name,
    category: asset.asset_category?.display_name || 'Unknown',
    roi,
    monthlyIncome,
    monthlyExpenses,
    netMonthlyIncome,
    currentValue,
    acquisitionCost,
    totalReturn,
    cashFlow,
    riskScore,
    healthScore,
    lastValuationDate: valuations[0]?.valuation_date,
    daysSinceAcquisition,
    annualizedReturn: annualizedReturn * 100,
  };
};

export const useAssetAnalytics = (portfolioId: string) => {
  return useQuery({
    queryKey: ['asset-analytics', portfolioId],
    queryFn: async (): Promise<PortfolioAnalytics> => {
      // Fetch assets and valuations
      const [assetsResponse, valuationsResponse] = await Promise.all([
        supabase
          .from('portfolio_assets')
          .select(`
            *,
            asset_category:asset_categories(*)
          `)
          .eq('portfolio_id', portfolioId)
          .eq('is_active', true),
        supabase
          .from('asset_valuations')
          .select('*')
          .order('valuation_date', { ascending: false })
      ]);

      if (assetsResponse.error) throw assetsResponse.error;
      if (valuationsResponse.error) throw valuationsResponse.error;

      const assets = assetsResponse.data as unknown as PortfolioAsset[];
      const allValuations = valuationsResponse.data as any[];

      // Calculate metrics for each asset
      const assetMetrics = assets.map(asset => {
        const assetValuations = allValuations.filter(v => v.asset_id === asset.id);
        return calculateAssetMetrics(asset, assetValuations);
      });

      // Calculate portfolio-level metrics
      const totalValue = assetMetrics.reduce((sum, asset) => sum + asset.currentValue, 0);
      const totalCost = assetMetrics.reduce((sum, asset) => sum + asset.acquisitionCost, 0);
      const monthlyIncome = assetMetrics.reduce((sum, asset) => sum + asset.monthlyIncome, 0);
      const monthlyExpenses = assetMetrics.reduce((sum, asset) => sum + asset.monthlyExpenses, 0);
      const netMonthlyIncome = monthlyIncome - monthlyExpenses;
      const totalROI = totalCost > 0 ? ((totalValue - totalCost) / totalCost) * 100 : 0;
      const averageROI = assetMetrics.length > 0 ? assetMetrics.reduce((sum, asset) => sum + asset.roi, 0) / assetMetrics.length : 0;

      // Top and underperforming assets
      const sortedByROI = [...assetMetrics].sort((a, b) => b.roi - a.roi);
      const topPerformingAssets = sortedByROI.slice(0, 5);
      const underperformingAssets = sortedByROI.slice(-3).reverse();

      // Asset allocation by category
      const categoryTotals = new Map<string, number>();
      const categoryColors = new Map<string, string>();
      
      assetMetrics.forEach(asset => {
        const current = categoryTotals.get(asset.category) || 0;
        categoryTotals.set(asset.category, current + asset.currentValue);
        
        // Set color based on category (you could fetch this from the database)
        if (!categoryColors.has(asset.category)) {
          const colors = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--muted))'];
          categoryColors.set(asset.category, colors[categoryColors.size % colors.length]);
        }
      });

      const assetAllocation = Array.from(categoryTotals.entries()).map(([category, value]) => ({
        category,
        value,
        percentage: totalValue > 0 ? (value / totalValue) * 100 : 0,
        color: categoryColors.get(category) || 'hsl(var(--muted))',
      }));

      // Generate performance trend (last 12 months)
      const performanceTrend = Array.from({ length: 12 }, (_, i) => {
        const date = new Date();
        date.setMonth(date.getMonth() - (11 - i));
        const variance = Math.random() * 0.1 - 0.05; // ±5% variance
        
        return {
          date: date.toISOString().slice(0, 7), // YYYY-MM format
          value: totalValue * (1 + variance),
          income: monthlyIncome * (1 + variance),
          expenses: monthlyExpenses * (1 + variance * 0.5),
        };
      });

      // Risk distribution
      const lowRisk = assetMetrics.filter(asset => asset.riskScore < 33).length;
      const mediumRisk = assetMetrics.filter(asset => asset.riskScore >= 33 && asset.riskScore < 67).length;
      const highRisk = assetMetrics.filter(asset => asset.riskScore >= 67).length;

      return {
        totalAssets: assets.length,
        totalValue,
        totalROI,
        monthlyIncome,
        monthlyExpenses,
        netMonthlyIncome,
        averageROI,
        topPerformingAssets,
        underperformingAssets,
        assetAllocation,
        performanceTrend,
        riskDistribution: { low: lowRisk, medium: mediumRisk, high: highRisk },
      };
    },
    enabled: !!portfolioId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useAssetComparison = (assetIds: string[], portfolioId: string) => {
  return useQuery({
    queryKey: ['asset-comparison', assetIds, portfolioId],
    queryFn: async (): Promise<AssetComparison> => {
      if (assetIds.length === 0) {
        return {
          assets: [],
          benchmarks: { portfolioAverage: 0, categoryAverage: 0, marketAverage: 0 },
        };
      }

      // Fetch selected assets
      const { data: assets, error } = await supabase
        .from('portfolio_assets')
        .select(`
          *,
          asset_category:asset_categories(*)
        `)
        .in('id', assetIds);

      if (error) throw error;

      // Fetch valuations for these assets
      const { data: valuations } = await supabase
        .from('asset_valuations')
        .select('*')
        .in('asset_id', assetIds)
        .order('valuation_date', { ascending: false });

      // Calculate metrics for selected assets
      const assetMetrics = (assets as unknown as PortfolioAsset[]).map(asset => {
        const assetValuations = (valuations || []).filter(v => v.asset_id === asset.id) as any[];
        return calculateAssetMetrics(asset, assetValuations as AssetValuation[]);
      });

      // Calculate benchmarks (simplified for demo)
      const portfolioAverage = 8.5; // Mock data
      const categoryAverage = 7.2; // Mock data
      const marketAverage = 6.8; // Mock data

      return {
        assets: assetMetrics,
        benchmarks: {
          portfolioAverage,
          categoryAverage,
          marketAverage,
        },
      };
    },
    enabled: assetIds.length > 0 && !!portfolioId,
    staleTime: 5 * 60 * 1000,
  });
};

export const useAssetPredictions = (assetId: string) => {
  return useQuery({
    queryKey: ['asset-predictions', assetId],
    queryFn: async () => {
      // Fetch historical valuations for this asset
      const { data: valuations, error } = await supabase
        .from('asset_valuations')
        .select('*')
        .eq('asset_id', assetId)
        .order('valuation_date', { ascending: true });

      if (error) throw error;

      // Simple linear regression prediction (in a real app, this would be more sophisticated)
      const predictions = [];
      const currentDate = new Date();
      
      for (let i = 1; i <= 12; i++) {
        const futureDate = new Date(currentDate);
        futureDate.setMonth(currentDate.getMonth() + i);
        
        // Mock prediction logic (in reality, you'd use historical data and ML models)
        const trend = Math.random() * 0.02 + 0.005; // 0.5% to 2.5% monthly growth
        const lastValue = valuations?.[valuations.length - 1]?.market_value || 100000;
        const predictedValue = lastValue * Math.pow(1 + trend, i);
        
        predictions.push({
          date: futureDate.toISOString().slice(0, 7),
          predictedValue,
          confidence: Math.max(0.5, 1 - (i * 0.05)), // Confidence decreases over time
        });
      }

      return {
        assetId,
        predictions,
        modelAccuracy: 0.85, // Mock accuracy score
        lastUpdated: new Date().toISOString(),
      };
    },
    enabled: !!assetId,
    staleTime: 15 * 60 * 1000, // 15 minutes
  });
};
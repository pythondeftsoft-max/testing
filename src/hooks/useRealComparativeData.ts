
import { useMemo } from 'react';
import { useHistoricalComparison, useIndustryBenchmarks, usePortfolioAverage } from './useHistoricalMetrics';
import { useLandlordAnalytics } from './useLandlordAnalytics';
import { useAIInsights } from './useAIInsights';

export interface ComparativeData {
  label: string;
  current: number;
  previous: number;
  benchmark: number;
  portfolio: number;
  trend: number;
  status: 'excellent' | 'good' | 'average' | 'poor';
  color: string;
}

export const useRealComparativeData = (
  landlordId: string,
  portfolioId?: string,
  timeRange: 'previous_month' | 'previous_quarter' | 'previous_year' = 'previous_month'
) => {
  const currentMetrics = useLandlordAnalytics(landlordId, portfolioId);
  const { insights } = useAIInsights(landlordId, portfolioId);
  const { data: historicalComparison } = useHistoricalComparison(landlordId, portfolioId, timeRange);
  const { data: industryBenchmarks } = useIndustryBenchmarks();
  const { data: portfolioAverage } = usePortfolioAverage(landlordId, portfolioId);

  const comparativeData = useMemo(() => {
    // Use AI insights for enhanced data if available, fallback to current metrics
    const dataSource = insights?.kpis || currentMetrics?.portfolioOverview;
    
    if (!dataSource && !currentMetrics) {
      return [];
    }

    // Helper function to get benchmark value with AI-enhanced fallback
    const getBenchmark = (metricName: string): number => {
      // First try AI insights benchmarks
      if (insights?.benchmarks) {
        switch (metricName) {
          case 'occupancy_rate':
            return insights.benchmarks.industry_occupancy;
          case 'collection_rate':
            return 98.5; // Industry standard
          case 'maintenance_cost_per_unit_monthly':
            return 150; // Industry average
          case 'tenant_satisfaction_score':
            return 4.2; // Industry average
        }
      }
      
      // Fallback to database benchmarks
      if (!industryBenchmarks) return 0;
      const benchmark = industryBenchmarks.find(b => b.metric_name === metricName);
      return benchmark?.benchmark_value || 0;
    };

    // Helper function to determine status with AI-enhanced logic
    const getStatus = (current: number, benchmark: number): ComparativeData['status'] => {
      const ratio = current / benchmark;
      if (ratio >= 1.1) return 'excellent';
      if (ratio >= 1.0) return 'good';
      if (ratio >= 0.9) return 'average';
      return 'poor';
    };

    // Helper function to get status color
    const getStatusColor = (status: ComparativeData['status']): string => {
      switch (status) {
        case 'excellent': return 'text-success';
        case 'good': return 'text-primary';
        case 'average': return 'text-warning';
        case 'poor': return 'text-destructive';
      }
    };

    // Use AI insights data if available, otherwise fallback to current metrics
    const currentOccupancyRate = insights?.kpis?.occupancy_rate ?? 
      (currentMetrics?.portfolioOverview?.vacancy_rate 
        ? 100 - currentMetrics.portfolioOverview.vacancy_rate 
        : 0);
    
    const currentCollectionRate = insights?.kpis ? 
      ((insights.kpis.total_monthly_revenue / (insights.kpis.total_monthly_revenue * 1.05)) * 100) : // Estimate collection rate
      (currentMetrics?.portfolioOverview?.collection_rate || 0);
    
    const currentMaintenanceCost = insights?.kpis ? 
      (insights.kpis.total_monthly_revenue * 0.08) / (insights.kpis.occupancy_rate / 100 * 10) : // Estimate per unit
      (currentMetrics?.maintenanceEfficiency?.maintenance_cost_per_unit || 0);

    const data: ComparativeData[] = [
      {
        label: 'Occupancy Rate',
        current: currentOccupancyRate,
        previous: historicalComparison?.previous_occupancy_rate || currentOccupancyRate,
        benchmark: getBenchmark('occupancy_rate'),
        portfolio: portfolioAverage?.occupancy_rate || currentOccupancyRate,
        trend: historicalComparison?.occupancy_trend || 0,
        status: getStatus(currentOccupancyRate, getBenchmark('occupancy_rate')),
        color: '',
      },
      {
        label: 'Collection Rate',
        current: currentCollectionRate,
        previous: historicalComparison?.previous_collection_rate || currentCollectionRate,
        benchmark: getBenchmark('collection_rate'),
        portfolio: portfolioAverage?.collection_rate || currentCollectionRate,
        trend: historicalComparison?.collection_trend || 0,
        status: getStatus(currentCollectionRate, getBenchmark('collection_rate')),
        color: '',
      },
      {
        label: 'Maintenance Cost/Unit',
        current: currentMaintenanceCost,
        previous: historicalComparison?.previous_maintenance_cost || currentMaintenanceCost,
        benchmark: getBenchmark('maintenance_cost_per_unit_monthly'),
        portfolio: portfolioAverage?.maintenance_cost_per_unit || currentMaintenanceCost,
        trend: historicalComparison?.maintenance_trend ? -historicalComparison.maintenance_trend : 0,
        status: getStatus(
          getBenchmark('maintenance_cost_per_unit_monthly'),
          currentMaintenanceCost
        ),
        color: '',
      },
      {
        label: 'Portfolio Health',
        current: insights?.kpis?.portfolio_health_score || 75, // AI-generated health score
        previous: insights?.kpis?.portfolio_health_score || 75,
        benchmark: 85, // Industry benchmark for portfolio health
        portfolio: insights?.kpis?.portfolio_health_score || 75,
        trend: 0,
        status: getStatus(insights?.kpis?.portfolio_health_score || 75, 85),
        color: '',
      },
    ];

    // Add colors based on status
    return data.map(item => ({
      ...item,
      color: getStatusColor(item.status)
    }));

  }, [currentMetrics, insights, historicalComparison, industryBenchmarks, portfolioAverage]);

  return {
    data: comparativeData,
    loading: !currentMetrics && !insights,
    error: null,
    aiEnhanced: !!insights // Flag to indicate if AI insights are being used
  };
};

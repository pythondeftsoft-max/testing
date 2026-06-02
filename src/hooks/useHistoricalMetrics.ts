
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface HistoricalComparison {
  previous_occupancy_rate: number;
  previous_collection_rate: number;
  previous_maintenance_cost: number;
  occupancy_trend: number;
  collection_trend: number;
  maintenance_trend: number;
}

export interface IndustryBenchmark {
  metric_name: string;
  benchmark_value: number;
  percentile: number;
}

export interface PortfolioAverage {
  occupancy_rate: number;
  collection_rate: number;
  maintenance_cost_per_unit: number;
}

export const useHistoricalComparison = (
  landlordId: string,
  portfolioId?: string,
  timeRange: 'previous_month' | 'previous_quarter' | 'previous_year' = 'previous_month'
) => {
  return useQuery({
    queryKey: ['historicalComparison', landlordId, portfolioId, timeRange],
    queryFn: async (): Promise<HistoricalComparison> => {
      // Mock historical data - in real implementation, this would fetch from historical analytics
      const mockData: HistoricalComparison = {
        previous_occupancy_rate: 88.5 + (Math.random() - 0.5) * 10,
        previous_collection_rate: 94.2 + (Math.random() - 0.5) * 8,
        previous_maintenance_cost: 180 + (Math.random() - 0.5) * 60,
        occupancy_trend: (Math.random() - 0.5) * 5,
        collection_trend: (Math.random() - 0.5) * 3,
        maintenance_trend: (Math.random() - 0.5) * 20,
      };
      
      return mockData;
    },
    enabled: !!landlordId,
    staleTime: 60 * 60 * 1000, // 1 hour
  });
};

export const useIndustryBenchmarks = () => {
  return useQuery({
    queryKey: ['industryBenchmarks'],
    queryFn: async (): Promise<IndustryBenchmark[]> => {
      // Mock industry benchmarks - in real implementation, this would come from market data
      return [
        { metric_name: 'occupancy_rate', benchmark_value: 92.5, percentile: 75 },
        { metric_name: 'collection_rate', benchmark_value: 98.2, percentile: 75 },
        { metric_name: 'maintenance_cost_per_unit_monthly', benchmark_value: 150, percentile: 50 },
        { metric_name: 'tenant_satisfaction_score', benchmark_value: 4.2, percentile: 75 },
      ];
    },
    staleTime: 24 * 60 * 60 * 1000, // 24 hours
  });
};

export const usePortfolioAverage = (landlordId: string, portfolioId?: string) => {
  return useQuery({
    queryKey: ['portfolioAverage', landlordId, portfolioId],
    queryFn: async (): Promise<PortfolioAverage> => {
      // Mock portfolio averages - in real implementation, this would calculate from all portfolios
      const mockData: PortfolioAverage = {
        occupancy_rate: 89.3 + (Math.random() - 0.5) * 8,
        collection_rate: 95.8 + (Math.random() - 0.5) * 6,
        maintenance_cost_per_unit: 165 + (Math.random() - 0.5) * 40,
      };
      
      return mockData;
    },
    enabled: !!landlordId,
    staleTime: 30 * 60 * 1000, // 30 minutes
  });
};

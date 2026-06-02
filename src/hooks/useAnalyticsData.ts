import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface AnalyticsData {
  tenantPlacement: any;
  vacancyPipeline: any;
  financial: any;
  engagement: any;
  marketplace: any;
}

export const useAnalyticsData = (startDate: Date, endDate: Date) => {
  const [data, setData] = useState<AnalyticsData>({
    tenantPlacement: null,
    vacancyPipeline: null,
    financial: null,
    engagement: null,
    marketplace: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      setError(null);

      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];

      // Fetch all analytics data in parallel
      const [
        tenantPlacementResult,
        vacancyPipelineResult,
        financialResult,
        engagementResult,
        marketplaceResult,
      ] = await Promise.all([
        supabase.rpc('get_tenant_placement_metrics', {
          start_date: startDateStr,
          end_date: endDateStr,
        }),
        supabase.rpc('get_vacancy_pipeline_metrics', {
          start_date: startDateStr,
          end_date: endDateStr,
        }),
        supabase.rpc('get_financial_metrics', {
          start_date: startDateStr,
          end_date: endDateStr,
        }),
        supabase.rpc('get_engagement_metrics', {
          start_date: startDateStr,
          end_date: endDateStr,
        }),
        supabase.rpc('get_marketplace_metrics', {
          start_date: startDateStr,
          end_date: endDateStr,
        }),
      ]);

      // Check for errors in any of the requests
      const errors = [
        tenantPlacementResult.error,
        vacancyPipelineResult.error,
        financialResult.error,
        engagementResult.error,
        marketplaceResult.error,
      ].filter(Boolean);

      if (errors.length > 0) {
        console.error('Analytics data fetch errors:', errors);
        setError('Failed to fetch some analytics data');
      }

      setData({
        tenantPlacement: tenantPlacementResult.data?.[0] || null,
        vacancyPipeline: vacancyPipelineResult.data?.[0] || null,
        financial: financialResult.data?.[0] || null,
        engagement: engagementResult.data?.[0] || null,
        marketplace: marketplaceResult.data?.[0] || null,
      });
    } catch (err) {
      console.error('Error fetching analytics data:', err);
      setError('Failed to fetch analytics data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalyticsData();
  }, [startDate, endDate]);

  const refetch = () => {
    fetchAnalyticsData();
  };

  return { data, loading, error, refetch };
};
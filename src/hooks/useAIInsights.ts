
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface AIInsight {
  analysis_type: string;
  timestamp: string;
  kpis: {
    occupancy_rate: number;
    vacancy_rate: number;
    total_monthly_revenue: number;
    average_rent: number;
    maintenance_efficiency: number;
    portfolio_health_score: number;
  };
  predictions: Array<{
    id: string;
    type: string;
    property_id?: string;
    value: number;
    confidence: number;
    timeframe_days: number;
    description: string;
    metadata: any;
  }>;
  risks: Array<{
    type: string;
    severity: string;
    description: string;
    impact: string;
    recommendation: string;
  }>;
  opportunities: Array<{
    type: string;
    potential_value: number;
    description: string;
    action: string;
    timeframe: string;
  }>;
  alerts: Array<{
    type: string;
    priority: string;
    count: number;
    message: string;
    action_required: string;
  }>;
  recommendations: Array<{
    category: string;
    priority: string;
    title: string;
    description: string;
    actions: string[];
    estimated_impact: string;
  }>;
  benchmarks: {
    industry_occupancy: number;
    industry_rent_psf: number;
    market_trends: {
      rent_growth: number;
      vacancy_trend: number;
    };
  };
}

export const useAIInsights = (landlordId: string, portfolioId?: string) => {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['aiInsights', landlordId, portfolioId],
    queryFn: async () => {
      const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const startTime = performance.now();
      
      console.log(`🔍 [AI-INSIGHTS-${requestId}] Starting request:`, {
        landlordId,
        portfolioId: portfolioId || 'everything',
        analysisType: 'comprehensive',
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href
      });

      try {
        const requestBody = {
          landlordId,
          portfolioId: portfolioId || 'everything',
          analysisType: 'comprehensive',
          requestId,
          clientInfo: {
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            url: window.location.href
          }
        };

        console.log(`🔍 [AI-INSIGHTS-${requestId}] Request body:`, requestBody);

        const { data, error } = await supabase.functions.invoke('ai-insights-engine', {
          body: requestBody
        });

        const endTime = performance.now();
        const duration = Math.round(endTime - startTime);

        console.log(`🔍 [AI-INSIGHTS-${requestId}] Response received after ${duration}ms:`, {
          hasData: !!data,
          hasError: !!error,
          dataType: typeof data,
          dataKeys: data ? Object.keys(data) : null,
          errorType: typeof error,
          errorMessage: error?.message,
          errorCode: error?.code,
          errorDetails: error?.details,
          fullError: error
        });

        if (error) {
          console.error(`🔍 [AI-INSIGHTS-${requestId}] Supabase function error:`, {
            message: error.message,
            code: error.code,
            details: error.details,
            context: error.context,
            hint: error.hint,
            fullError: error,
            requestId
          });
          throw new Error(`Edge Function Error [${requestId}]: ${error.message || 'Unknown Supabase error'}`);
        }

        // Log the raw response for debugging
        console.log(`🔍 [AI-INSIGHTS-${requestId}] Raw response data:`, data);

        // Handle edge function errors that return success: false
        if (data && data.success === false) {
          console.error(`🔍 [AI-INSIGHTS-${requestId}] Edge function returned error:`, {
            success: data.success,
            error: data.error,
            details: data.details,
            fullData: data,
            requestId
          });
          throw new Error(`Edge Function Logic Error [${requestId}]: ${data.error || data.details || 'AI insights generation failed'}`);
        }

        // Check if we have insights data
        if (data && !data.insights) {
          console.warn(`🔍 [AI-INSIGHTS-${requestId}] No insights in response:`, {
            dataKeys: Object.keys(data),
            fullData: data,
            requestId
          });
        }

        console.log(`🔍 [AI-INSIGHTS-${requestId}] Success! Processed in ${duration}ms:`, {
          hasInsights: !!(data?.insights),
          insightsType: typeof data?.insights,
          insightsKeys: data?.insights ? Object.keys(data.insights) : null,
          requestId
        });

        return data?.insights as AIInsight || null;
      } catch (err) {
        const endTime = performance.now();
        const duration = Math.round(endTime - startTime);
        
        console.error(`🔍 [AI-INSIGHTS-${requestId}] Request failed after ${duration}ms:`, {
          errorName: err?.constructor?.name,
          errorMessage: err?.message,
          errorStack: err?.stack,
          isNetworkError: err?.message?.includes('fetch'),
          isTimeoutError: err?.message?.includes('timeout'),
          requestId,
          duration
        });
        
        // Re-throw with more context
        throw new Error(`AI Insights Request Failed [${requestId}]: ${err?.message || 'Unknown error'}`);
      }
    },
    enabled: !!landlordId,
    staleTime: 15 * 60 * 1000, // 15 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    retry: (failureCount, error) => {
      console.log(`🔍 [AI-INSIGHTS] Retry attempt ${failureCount}:`, {
        errorMessage: error?.message,
        errorType: typeof error,
        willRetry: failureCount < 2
      });
      return failureCount < 2;
    },
    retryDelay: (attemptIndex) => {
      const delay = Math.min(1000 * 2 ** attemptIndex, 30000);
      console.log(`🔍 [AI-INSIGHTS] Retry delay: ${delay}ms for attempt ${attemptIndex}`);
      return delay;
    },
  });

  return {
    insights: data,
    loading: isLoading,
    error: error?.message || null,
    refetch
  };
};

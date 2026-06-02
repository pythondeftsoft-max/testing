import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface SavedReportConfig {
  reportType: string;
  portfolioId?: string;
  propertyIds?: string[];
  unitIds?: string[];
  allPropertiesMode?: boolean;
  dateRange: {
    start: string;
    end: string;
  };
  datePreset?: string;
  accountingBasis?: 'cash' | 'accrual';
  interval?: 'month' | 'quarter' | 'year' | 'none';
}

export interface SavedReport {
  id: string;
  name: string;
  description: string | null;
  config: SavedReportConfig;
  created_at: string;
  updated_at: string;
}

export const useSavedReports = (userId: string, reportType: string) => {
  return useQuery({
    queryKey: ['saved-reports', userId, reportType],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('custom_reports')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Filter by report type from the config
      const filteredData = (data || []).filter((report) => {
        const config = report.config as unknown as SavedReportConfig;
        return config.reportType === reportType;
      });

      return filteredData.map(report => ({
        ...report,
        config: report.config as unknown as SavedReportConfig
      })) as SavedReport[];
    },
    enabled: !!userId,
  });
};

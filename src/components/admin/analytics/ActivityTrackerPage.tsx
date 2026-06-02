import React, { useState } from 'react';
import { subDays } from 'date-fns';
import { ActivityTrackerFiltersComponent } from './ActivityTrackerFilters';
import { ActivityMetricsBar } from './ActivityMetricsBar';
import { ActivityFeedTable } from './ActivityFeedTable';
import { TerritoryAnalyticsPanel } from './TerritoryAnalyticsPanel';
import { useActivityTrackerData, type ActivityTrackerFilters } from '@/hooks/useActivityTrackerData';
import { useTerritoryAnalytics } from '@/hooks/useTerritoryAnalytics';
import { exportActivityToCSV } from '@/lib/exportActivityCSV';
import { useToast } from '@/hooks/use-toast';

export const ActivityTrackerPage: React.FC = () => {
  const { toast } = useToast();
  const [filters, setFilters] = useState<ActivityTrackerFilters>({
    dateRange: {
      from: subDays(new Date(), 30),
      to: new Date(),
    },
    entityType: 'all',
    stageType: 'all',
  });

  const { data: activityData, isLoading: isLoadingActivity } = useActivityTrackerData(filters);
  const { data: territoryData, isLoading: isLoadingTerritory } = useTerritoryAnalytics(
    filters.territoryId,
    filters.dateRange
  );

  const handleFiltersChange = (newFilters: ActivityTrackerFilters) => {
    setFilters(newFilters);
  };

  const handleExport = () => {
    if (!activityData?.activities || activityData.activities.length === 0) {
      toast({
        title: 'No Data to Export',
        description: 'There are no activities matching your current filters.',
        variant: 'destructive',
      });
      return;
    }

    try {
      exportActivityToCSV(activityData.activities, filters);
      toast({
        title: 'Export Successful',
        description: `Exported ${activityData.activities.length} activities to CSV.`,
      });
    } catch (error) {
      toast({
        title: 'Export Failed',
        description: 'Failed to export data. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleReset = () => {
    setFilters({
      dateRange: {
        from: subDays(new Date(), 30),
        to: new Date(),
      },
      entityType: 'all',
      stageType: 'all',
    });
    toast({
      title: 'Filters Reset',
      description: 'All filters have been reset to default values.',
    });
  };

  const handleWorkerClick = (workerId: string) => {
    setFilters({
      ...filters,
      workerId,
    });
    toast({
      title: 'Filter Applied',
      description: 'Now showing activities for the selected worker.',
    });
  };

  return (
    <div className="space-y-6">
      {/* Filter Bar */}
      <ActivityTrackerFiltersComponent
        filters={filters}
        onFiltersChange={handleFiltersChange}
        onExport={handleExport}
        onReset={handleReset}
      />

      {/* Metrics Bar */}
      <ActivityMetricsBar
        metrics={activityData?.metrics || {
          total_points: 0,
          lease_signed_moves: 0,
          paid_housed_moves: 0,
          backwards_moves: 0,
          conversion_rate: 0,
          entities_touched: 0,
        }}
        isLoading={isLoadingActivity}
      />

      {/* Territory Analytics Panel (Conditional) */}
      {filters.territoryId && territoryData && (
        <TerritoryAnalyticsPanel
          workers={territoryData.workers}
          totals={territoryData.totals}
          isLoading={isLoadingTerritory}
        />
      )}

      {/* Activity Feed */}
      <ActivityFeedTable
        activities={activityData?.activities || []}
        isLoading={isLoadingActivity}
        onWorkerClick={handleWorkerClick}
      />
    </div>
  );
};

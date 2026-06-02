import React from 'react';
import { Button } from '@/components/ui/button';
import { Calendar, Filter } from 'lucide-react';
import type { WorkerPerformanceFilters as WorkerPerformanceFiltersType } from '@/hooks/useWorkerPerformance';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface WorkerPerformanceFiltersComponentProps {
  filters: WorkerPerformanceFiltersType;
  onFiltersChange: (filters: WorkerPerformanceFiltersType) => void;
}

export const WorkerPerformanceFiltersComponent: React.FC<WorkerPerformanceFiltersComponentProps> = ({
  filters,
  onFiltersChange,
}) => {
  const handleDateRangeChange = (preset: string) => {
    const now = new Date();
    let from = new Date();

    switch (preset) {
      case 'today':
        from = new Date(now.setHours(0, 0, 0, 0));
        break;
      case 'week':
        from = new Date(now.setDate(now.getDate() - 7));
        break;
      case 'month':
        from = new Date(now.setDate(now.getDate() - 30));
        break;
      case 'quarter':
        from = new Date(now.setDate(now.getDate() - 90));
        break;
      default:
        from = new Date(now.setDate(now.getDate() - 30));
    }

    onFiltersChange({
      ...filters,
      dateRange: { from, to: new Date() },
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-4 p-4 bg-card rounded-lg border">
      <div className="flex items-center gap-2">
        <Filter className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm font-medium">Filters:</span>
      </div>

      {/* Date Range Preset */}
      <Select onValueChange={handleDateRangeChange} defaultValue="month">
        <SelectTrigger className="w-[180px]">
          <Calendar className="w-4 h-4 mr-2" />
          <SelectValue placeholder="Select period" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="today">Today</SelectItem>
          <SelectItem value="week">Last 7 Days</SelectItem>
          <SelectItem value="month">This Month</SelectItem>
          <SelectItem value="quarter">Last Quarter</SelectItem>
        </SelectContent>
      </Select>

      {/* Entity Type Filter */}
      <Select
        value={filters.entityType || 'all'}
        onValueChange={(value) =>
          onFiltersChange({
            ...filters,
            entityType: value as 'tenant' | 'property' | 'all',
          })
        }
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Entity type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Entities</SelectItem>
          <SelectItem value="tenant">Tenants Only</SelectItem>
          <SelectItem value="property">Properties Only</SelectItem>
        </SelectContent>
      </Select>

      {/* Clear Filters */}
      <Button
        variant="outline"
        size="sm"
        onClick={() =>
          onFiltersChange({
            dateRange: {
              from: new Date(new Date().setDate(new Date().getDate() - 30)),
              to: new Date(),
            },
            entityType: 'all',
          })
        }
      >
        Reset Filters
      </Button>
    </div>
  );
};

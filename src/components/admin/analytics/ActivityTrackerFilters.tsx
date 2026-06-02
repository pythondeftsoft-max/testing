import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Download, RotateCcw } from 'lucide-react';
import { format } from 'date-fns';
import type { ActivityTrackerFilters } from '@/hooks/useActivityTrackerData';
import { useAvailableWorkers } from '@/hooks/useAvailableWorkers';
import { useTerritories } from '@/hooks/useTerritories';
import { cn } from '@/lib/utils';

interface ActivityTrackerFiltersProps {
  filters: ActivityTrackerFilters;
  onFiltersChange: (filters: ActivityTrackerFilters) => void;
  onExport: () => void;
  onReset: () => void;
}

export const ActivityTrackerFiltersComponent: React.FC<ActivityTrackerFiltersProps> = ({
  filters,
  onFiltersChange,
  onExport,
  onReset,
}) => {
  const { data: workers } = useAvailableWorkers();
  const { data: territories } = useTerritories();

  const handleDateRangeChange = (type: 'from' | 'to', date: Date | undefined) => {
    if (!date) return;
    onFiltersChange({
      ...filters,
      dateRange: {
        ...filters.dateRange,
        [type]: date,
      },
    });
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Date Range From */}
          <div className="space-y-2">
            <label className="text-sm font-medium">From Date</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal truncate",
                    !filters.dateRange.from && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4 flex-shrink-0" />
                  {filters.dateRange.from ? format(filters.dateRange.from, 'MMM d, yyyy') : 'Pick a date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={filters.dateRange.from}
                  onSelect={(date) => handleDateRangeChange('from', date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Date Range To */}
          <div className="space-y-2">
            <label className="text-sm font-medium">To Date</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal truncate",
                    !filters.dateRange.to && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4 flex-shrink-0" />
                  {filters.dateRange.to ? format(filters.dateRange.to, 'MMM d, yyyy') : 'Pick a date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={filters.dateRange.to}
                  onSelect={(date) => handleDateRangeChange('to', date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Worker Filter */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Worker</label>
            <Select
              value={filters.workerId || 'all'}
              onValueChange={(value) =>
                onFiltersChange({ ...filters, workerId: value === 'all' ? undefined : value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="All Workers" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Workers</SelectItem>
                {workers?.map((worker) => (
                  <SelectItem key={worker.user_id} value={worker.user_id}>
                    {worker.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Territory Filter */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Territory</label>
            <Select
              value={filters.territoryId || 'all'}
              onValueChange={(value) =>
                onFiltersChange({ ...filters, territoryId: value === 'all' ? undefined : value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="All Territories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Territories</SelectItem>
                {territories?.map((territory) => (
                  <SelectItem key={territory.id} value={territory.id}>
                    {territory.territory_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Entity Type Filter */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Entity Type</label>
            <Select
              value={filters.entityType || 'all'}
              onValueChange={(value) =>
                onFiltersChange({
                  ...filters,
                  entityType: value as 'tenant' | 'property' | 'all',
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="tenant">Tenants</SelectItem>
                <SelectItem value="property">Properties</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Stage Type Filter */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Move Direction</label>
            <Select
              value={filters.stageType || 'all'}
              onValueChange={(value) =>
                onFiltersChange({
                  ...filters,
                  stageType: value as 'forward' | 'backward' | 'all',
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="All Moves" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Moves</SelectItem>
                <SelectItem value="forward">Forward Moves</SelectItem>
                <SelectItem value="backward">Backward Moves</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 mt-4">
          <Button onClick={onExport} variant="outline" className="flex items-center gap-2">
            <Download className="w-4 h-4" />
            Export CSV
          </Button>
          <Button onClick={onReset} variant="outline" className="flex items-center gap-2">
            <RotateCcw className="w-4 h-4" />
            Reset Filters
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

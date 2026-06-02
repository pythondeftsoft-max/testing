import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Activity, BarChart3, Grid3X3 } from 'lucide-react';

export type ViewMode = 'all' | 'metrics' | 'charts';

interface WidgetTypeToggleProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  metricCount: number;
  chartCount: number;
  assetCount?: number;
  className?: string;
}

export const WidgetTypeToggle: React.FC<WidgetTypeToggleProps> = ({
  viewMode,
  onViewModeChange,
  metricCount,
  chartCount,
  assetCount = 0,
  className = ''
}) => {
  const totalCount = metricCount + chartCount + assetCount;

  const toggleOptions = [
    {
      value: 'all' as ViewMode,
      label: 'All',
      icon: Grid3X3,
      count: totalCount,
      description: 'Show all widgets'
    },
    {
      value: 'metrics' as ViewMode,
      label: 'Metrics',
      icon: Activity,
      count: metricCount,
      description: 'Show metric widgets only'
    },
    {
      value: 'charts' as ViewMode,
      label: 'Charts',
      icon: BarChart3,
      count: chartCount,
      description: 'Show chart widgets only'
    }
  ];

  return (
    <div className={`flex items-center p-1 bg-muted/50 rounded-lg border ${className}`}>
      {toggleOptions.map((option) => {
        const IconComponent = option.icon;
        const isActive = viewMode === option.value;
        
        return (
          <Button
            key={option.value}
            variant={isActive ? "default" : "ghost"}
            size="sm"
            onClick={() => onViewModeChange(option.value)}
            className={`flex items-center gap-2 px-3 py-2 rounded-md transition-all duration-200 ${
              isActive 
                ? 'bg-openkey-blue text-white shadow-sm' 
                : 'hover:bg-accent/50'
            }`}
            title={option.description}
          >
            <IconComponent className="h-4 w-4" />
            <span className="font-medium">{option.label}</span>
            <Badge 
              variant={isActive ? "secondary" : "outline"}
              className={`text-xs ${
                isActive 
                  ? 'bg-white/20 text-white border-white/30' 
                  : 'bg-muted/50'
              }`}
            >
              {option.count}
            </Badge>
          </Button>
        );
      })}
    </div>
  );
};
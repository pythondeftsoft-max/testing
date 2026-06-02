import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Database, Calculator, AlertTriangle } from 'lucide-react';

export type DataSource = 'real' | 'estimated' | 'calculated' | 'missing';

interface DataSourceLabelProps {
  source: DataSource;
  description?: string;
  className?: string;
}

export const DataSourceLabel: React.FC<DataSourceLabelProps> = ({
  source,
  description,
  className = ""
}) => {
  const getSourceConfig = (source: DataSource) => {
    switch (source) {
      case 'real':
        return {
          label: 'Real Data',
          icon: Database,
          variant: 'default' as const,
          color: 'text-green-600',
          description: description || 'This value comes from your property financial records'
        };
      case 'estimated':
        return {
          label: 'Estimated',
          icon: Calculator,
          variant: 'secondary' as const,
          color: 'text-blue-600',
          description: description || 'This value is estimated based on available data'
        };
      case 'calculated':
        return {
          label: 'Calculated',
          icon: Calculator,
          variant: 'outline' as const,
          color: 'text-purple-600',
          description: description || 'This value is calculated from other financial data'
        };
      case 'missing':
        return {
          label: 'Missing Data',
          icon: AlertTriangle,
          variant: 'destructive' as const,
          color: 'text-red-600',
          description: description || 'This data is missing and needs to be entered'
        };
    }
  };

  const config = getSourceConfig(source);
  const Icon = config.icon;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>
          <Badge variant={config.variant} className={`${className} ${config.color}`}>
            <Icon className="h-3 w-3 mr-1" />
            {config.label}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p className="max-w-xs">{config.description}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
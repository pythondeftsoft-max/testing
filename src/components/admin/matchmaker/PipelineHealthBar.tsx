import React from 'react';
import { cn } from '@/lib/utils';
import { Activity, Clock, TrendingUp, AlertCircle } from 'lucide-react';

interface PipelineHealthBarProps {
  totalEntities: number;
  inProgress: number;
  housed: number;
  needsAttention: number;
  entityLabel: string;
  className?: string;
}

export const PipelineHealthBar: React.FC<PipelineHealthBarProps> = ({
  totalEntities,
  inProgress,
  housed,
  needsAttention,
  entityLabel,
  className,
}) => {
  const conversionRate = totalEntities > 0 ? Math.round((housed / totalEntities) * 100) : 0;

  const stats = [
    {
      icon: Activity,
      label: `Total ${entityLabel}`,
      value: totalEntities,
      color: 'text-foreground',
    },
    {
      icon: Clock,
      label: 'In Progress',
      value: inProgress,
      color: 'text-blue-600 dark:text-blue-400',
    },
    {
      icon: TrendingUp,
      label: 'Conversion',
      value: `${conversionRate}%`,
      color: 'text-green-600 dark:text-green-400',
    },
    {
      icon: AlertCircle,
      label: 'Needs Attention',
      value: needsAttention,
      color: needsAttention > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400',
    },
  ];

  return (
    <div className={cn(
      "flex items-center gap-6 px-4 py-2.5 rounded-lg bg-muted/40 border border-border/50",
      className
    )}>
      {stats.map((stat, i) => (
        <React.Fragment key={stat.label}>
          <div className="flex items-center gap-2 min-w-0">
            <stat.icon className={cn("h-4 w-4 shrink-0", stat.color)} />
            <div className="flex items-baseline gap-1.5 min-w-0">
              <span className={cn("text-lg font-bold leading-none", stat.color)}>
                {stat.value}
              </span>
              <span className="text-xs text-muted-foreground truncate">
                {stat.label}
              </span>
            </div>
          </div>
          {i < stats.length - 1 && (
            <div className="w-px h-6 bg-border/60 shrink-0" />
          )}
        </React.Fragment>
      ))}
    </div>
  );
};

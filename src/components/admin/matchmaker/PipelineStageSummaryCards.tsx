import React from 'react';
import { cn } from '@/lib/utils';
import { ChevronRight, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';

interface StageCardData {
  key: string;
  label: string;
  count: number;
  stuckCount?: number;
  onClick: () => void;
}

interface PipelineStageSummaryCardsProps {
  stages: StageCardData[];
  activeStageKey: string | null;
  className?: string;
}

export const PipelineStageSummaryCards: React.FC<PipelineStageSummaryCardsProps> = ({
  stages,
  activeStageKey,
  className,
}) => {
  const total = stages.reduce((sum, s) => sum + s.count, 0);

  const getHealthColor = (stuckCount?: number) => {
    if (!stuckCount || stuckCount === 0) return 'border-l-green-500';
    if (stuckCount <= 2) return 'border-l-yellow-500';
    return 'border-l-red-500';
  };

  const getHealthIcon = (stuckCount?: number) => {
    if (!stuckCount || stuckCount === 0) return <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />;
    if (stuckCount <= 2) return <Clock className="h-3.5 w-3.5 text-yellow-500" />;
    return <AlertTriangle className="h-3.5 w-3.5 text-red-500" />;
  };

  return (
    <div className={cn("flex items-stretch gap-2", className)}>
      {stages.map((stage, index) => {
        const isActive = activeStageKey === stage.key;
        const pct = total > 0 ? Math.round((stage.count / total) * 100) : 0;

        return (
          <React.Fragment key={stage.key}>
            <button
              onClick={stage.onClick}
              className={cn(
                "relative flex-1 min-w-0 rounded-lg border-l-4 border bg-card p-3 text-left transition-all duration-200 hover:shadow-md hover:scale-[1.02] cursor-pointer",
                getHealthColor(stage.stuckCount),
                isActive
                  ? "ring-2 ring-primary shadow-md border-primary/30"
                  : "border-border hover:border-primary/20"
              )}
            >
              {/* Stage name */}
              <p className="text-xs font-medium text-muted-foreground truncate mb-1">
                {stage.label}
              </p>

              {/* Big count */}
              <p className="text-2xl font-bold text-foreground leading-none mb-2">
                {stage.count}
              </p>

              {/* Progress bar */}
              <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden mb-2">
                <div
                  className="h-full rounded-full bg-primary/60 transition-all duration-500"
                  style={{ width: `${pct}%` }}
                />
              </div>

              {/* Health indicator */}
              <div className="flex items-center gap-1 text-xs">
                {getHealthIcon(stage.stuckCount)}
                <span className={cn(
                  "truncate",
                  !stage.stuckCount || stage.stuckCount === 0
                    ? "text-green-600 dark:text-green-400"
                    : stage.stuckCount <= 2
                      ? "text-yellow-600 dark:text-yellow-400"
                      : "text-red-600 dark:text-red-400"
                )}>
                  {!stage.stuckCount || stage.stuckCount === 0
                    ? "All moving"
                    : `${stage.stuckCount} stuck 7+ days`}
                </span>
              </div>
            </button>

            {/* Arrow connector */}
            {index < stages.length - 1 && (
              <div className="flex items-center justify-center shrink-0">
                <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
              </div>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

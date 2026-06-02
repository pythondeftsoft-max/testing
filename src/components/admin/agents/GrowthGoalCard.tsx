import React from 'react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { MapPin, TrendingUp } from 'lucide-react';
import { GrowthGoal } from '@/hooks/useGrowthGoals';

interface GrowthGoalCardProps {
  goal: GrowthGoal;
}

const timeframeLabels: Record<string, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
  quarterly: '90-Day',
  yearly: 'Yearly',
};

const categoryColors: Record<string, string> = {
  housing: 'bg-primary/10 text-primary',
  signups: 'bg-blue-500/10 text-blue-600',
  landlords: 'bg-amber-500/10 text-amber-600',
  revenue: 'bg-emerald-500/10 text-emerald-600',
  pipeline: 'bg-violet-500/10 text-violet-600',
  software: 'bg-cyan-500/10 text-cyan-600',
};

export const GrowthGoalCard = ({ goal }: GrowthGoalCardProps) => {
  const pct = goal.target_value > 0
    ? Math.min(100, Math.round((goal.current_value / goal.target_value) * 100))
    : 0;

  const colorClass = categoryColors[goal.category] || 'bg-muted text-muted-foreground';

  return (
    <div className="p-3 rounded-lg border border-border bg-card space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-foreground truncate">{goal.metric_name}</span>
        <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0">
          {timeframeLabels[goal.timeframe] || goal.timeframe}
        </Badge>
      </div>

      <div className="flex items-center gap-2">
        <Progress value={pct} className="h-2 flex-1" />
        <span className="text-xs font-semibold text-muted-foreground whitespace-nowrap">
          {goal.current_value}/{goal.target_value}
        </span>
      </div>

      <div className="flex items-center justify-between gap-2">
        {goal.city && (
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <MapPin className="h-3 w-3" />
            <span>{goal.city}</span>
          </div>
        )}
        <div className="flex items-center gap-1">
          <Badge className={`text-[10px] px-1.5 py-0 border-0 ${colorClass}`}>
            {goal.category}
          </Badge>
          {pct >= 100 && (
            <TrendingUp className="h-3 w-3 text-emerald-500" />
          )}
        </div>
      </div>
    </div>
  );
};

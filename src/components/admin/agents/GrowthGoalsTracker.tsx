import React, { useState } from 'react';
import { useGrowthGoals } from '@/hooks/useGrowthGoals';
import { GrowthGoalCard } from './GrowthGoalCard';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Target } from 'lucide-react';

const TIMEFRAMES = ['daily', 'weekly', 'monthly', 'quarterly', 'yearly'] as const;
const CATEGORIES = ['housing', 'landlords', 'signups', 'pipeline', 'revenue', 'software'] as const;

const timeframeLabels: Record<string, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
  quarterly: '90-Day',
  yearly: 'Yearly',
};

const categoryLabels: Record<string, string> = {
  housing: '🏠 Housing',
  landlords: '🤝 Landlords',
  signups: '📝 Signups',
  pipeline: '📊 Pipeline',
  revenue: '💰 Revenue',
  software: '💻 Software',
};

export const GrowthGoalsTracker = () => {
  const [activeTimeframe, setActiveTimeframe] = useState<string>('daily');
  const [activeCategory, setActiveCategory] = useState<string | undefined>(undefined);

  const { data: goals, isLoading } = useGrowthGoals({
    timeframe: activeTimeframe,
    category: activeCategory,
  });

  // Group by category
  const grouped = (goals || []).reduce<Record<string, typeof goals>>((acc, g) => {
    if (!acc[g.category]) acc[g.category] = [];
    acc[g.category]!.push(g);
    return acc;
  }, {});

  // Summary stats
  const totalGoals = goals?.length || 0;
  const completedGoals = goals?.filter(g => g.target_value > 0 && g.current_value >= g.target_value).length || 0;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Growth Goals</h3>
        </div>
        <Badge variant="outline" className="text-[10px]">
          {completedGoals}/{totalGoals} Hit
        </Badge>
      </div>

      {/* Timeframe filter */}
      <div className="flex gap-1 flex-wrap">
        {TIMEFRAMES.map(tf => (
          <button
            key={tf}
            onClick={() => setActiveTimeframe(tf)}
            className={`px-2.5 py-1 text-[11px] rounded-md font-medium transition-colors ${
              activeTimeframe === tf
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-accent'
            }`}
          >
            {timeframeLabels[tf]}
          </button>
        ))}
      </div>

      {/* Category filter */}
      <div className="flex gap-1 flex-wrap">
        <button
          onClick={() => setActiveCategory(undefined)}
          className={`px-2 py-0.5 text-[10px] rounded font-medium transition-colors ${
            !activeCategory ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-accent'
          }`}
        >
          All
        </button>
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-2 py-0.5 text-[10px] rounded font-medium transition-colors ${
              activeCategory === cat
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-accent'
            }`}
          >
            {categoryLabels[cat]}
          </button>
        ))}
      </div>

      {/* Goals grid */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-20 w-full rounded-lg" />
          ))}
        </div>
      ) : Object.keys(grouped).length === 0 ? (
        <div className="text-center py-6 text-sm text-muted-foreground">
          No goals for this timeframe
        </div>
      ) : (
        <div className="space-y-3">
          {Object.entries(grouped).map(([category, categoryGoals]) => (
            <div key={category} className="space-y-1.5">
              <h4 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                {categoryLabels[category] || category}
              </h4>
              <div className="grid gap-2">
                {categoryGoals!.map(goal => (
                  <GrowthGoalCard key={goal.id} goal={goal} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

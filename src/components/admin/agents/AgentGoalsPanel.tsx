import React from 'react';
import { Progress } from '@/components/ui/progress';
import { AgentGoal } from './agentDefinitions';

interface AgentGoalsPanelProps {
  goals: AgentGoal[];
}

export const AgentGoalsPanel = ({ goals }: AgentGoalsPanelProps) => {
  if (goals.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        No goals configured
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {goals.map((goal) => {
        const pct = goal.target > 0 ? Math.min(100, Math.round((goal.current / goal.target) * 100)) : 0;
        return (
          <div key={goal.id}>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-sm font-medium text-foreground">{goal.label}</span>
              <span className="text-xs text-muted-foreground">
                {goal.current} / {goal.target} {goal.unit}
              </span>
            </div>
            <Progress value={pct} className="h-2" />
          </div>
        );
      })}
    </div>
  );
};

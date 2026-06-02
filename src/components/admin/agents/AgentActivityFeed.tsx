import React from 'react';
import { AgentActivity } from './agentDefinitions';
import { formatDate } from '@/lib/utils';

interface AgentActivityFeedProps {
  activities: AgentActivity[];
}

export const AgentActivityFeed = ({ activities }: AgentActivityFeedProps) => {
  if (activities.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        No activity recorded yet
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {activities.map((activity) => (
        <div key={activity.id} className="flex gap-3 items-start">
          <div className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-xs font-medium text-foreground">{activity.action}</span>
              {activity.relatedAgent && (
                <span className="text-xs text-muted-foreground">→ {activity.relatedAgent}</span>
              )}
            </div>
            <p className="text-sm text-muted-foreground">{activity.detail}</p>
            <span className="text-xs text-muted-foreground/60">
              {new Date(activity.timestamp).toLocaleString()}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
};

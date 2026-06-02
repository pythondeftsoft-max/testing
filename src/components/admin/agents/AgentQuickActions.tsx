import React from 'react';
import { Button } from '@/components/ui/button';
import { Play, Pause, FileBarChart, MessageSquare } from 'lucide-react';

export const AgentQuickActions = () => {
  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        Quick Actions
      </h3>
      <div className="grid grid-cols-2 gap-2">
        <Button variant="outline" size="sm" className="text-xs justify-start gap-1.5" disabled>
          <Play className="h-3 w-3" /> Run All
        </Button>
        <Button variant="outline" size="sm" className="text-xs justify-start gap-1.5" disabled>
          <Pause className="h-3 w-3" /> Pause All
        </Button>
        <Button variant="outline" size="sm" className="text-xs justify-start gap-1.5" disabled>
          <FileBarChart className="h-3 w-3" /> Report
        </Button>
        <Button variant="outline" size="sm" className="text-xs justify-start gap-1.5" disabled>
          <MessageSquare className="h-3 w-3" /> Discord
        </Button>
      </div>
    </div>
  );
};

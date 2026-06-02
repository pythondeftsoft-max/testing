import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, X, Loader2 } from 'lucide-react';
import { useAgentApprovals, useApproveTask, useRejectTask } from '@/hooks/useAgentData';
import { agentDefinitions } from './agentDefinitions';

const priorityVariant: Record<string, 'destructive' | 'warning' | 'secondary'> = {
  high: 'destructive',
  medium: 'warning',
  low: 'secondary',
};

export const AgentApprovalQueue = () => {
  const { data: approvals, isLoading } = useAgentApprovals();
  const approveTask = useApproveTask();
  const rejectTask = useRejectTask();

  if (isLoading) {
    return (
      <div className="text-center py-4">
        <Loader2 className="h-4 w-4 animate-spin mx-auto text-muted-foreground" />
      </div>
    );
  }

  if (!approvals || approvals.length === 0) {
    return (
      <div className="text-center py-4 text-muted-foreground text-xs">
        No pending approvals
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        Approval Queue
        <Badge variant="outline" className="ml-2 text-[10px]">{approvals.length}</Badge>
      </h3>
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {approvals.map(item => {
          const agent = agentDefinitions.find(a => a.id === item.agent_id);
          return (
            <div key={item.id} className="p-2.5 rounded-lg border border-border space-y-1.5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-foreground truncate">{item.title}</p>
                  <p className="text-[10px] text-muted-foreground">by {agent?.name || item.agent_id}</p>
                </div>
                <Badge variant={priorityVariant[item.priority] || 'secondary'} className="text-[10px] shrink-0">
                  {item.priority}
                </Badge>
              </div>
              <p className="text-[11px] text-muted-foreground line-clamp-2">{item.detail}</p>
              <div className="flex gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-6 text-[10px] flex-1 gap-1"
                  onClick={() => approveTask.mutate(item.id)}
                  disabled={approveTask.isPending}
                >
                  <Check className="h-3 w-3" /> Approve
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-[10px] flex-1 gap-1"
                  onClick={() => rejectTask.mutate(item.id)}
                  disabled={rejectTask.isPending}
                >
                  <X className="h-3 w-3" /> Reject
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

import React from 'react';
import { agentDefinitions } from './agentDefinitions';
import { Badge } from '@/components/ui/badge';
import { Clock, Zap, AlertTriangle, Loader2 } from 'lucide-react';
import { useAgentMemory } from '@/hooks/useAgentData';

const getFreshness = (createdAt: string, ttlHours: number) => {
  const age = (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60);
  const ratio = age / ttlHours;
  if (ratio < 0.5) return { label: 'Fresh', icon: Zap, variant: 'success' as const, opacity: 'opacity-100' };
  if (ratio < 1) return { label: 'Aging', icon: Clock, variant: 'warning' as const, opacity: 'opacity-75' };
  return { label: 'Expired', icon: AlertTriangle, variant: 'destructive' as const, opacity: 'opacity-40' };
};

export const AgentSharedMemory = () => {
  const { data: memory, isLoading } = useAgentMemory();

  if (isLoading) {
    return (
      <div className="text-center py-4">
        <Loader2 className="h-4 w-4 animate-spin mx-auto text-muted-foreground" />
      </div>
    );
  }

  if (!memory || memory.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-4">No shared memory entries</p>;
  }

  return (
    <div className="space-y-2">
      {memory.map((entry) => {
        const freshness = getFreshness(entry.created_at, entry.ttl_hours);
        const agent = agentDefinitions.find(a => a.id === entry.agent_id);
        return (
          <div
            key={entry.id}
            className={`flex items-start gap-2 rounded-md border border-border/50 bg-muted/20 px-2.5 py-2 transition-opacity ${freshness.opacity}`}
          >
            <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${agent?.colorClass?.replace('text-', 'bg-') || 'bg-primary'}`} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-semibold text-foreground">{agent?.name || entry.agent_id}</span>
                <code className="text-[10px] font-mono text-primary">{entry.key}</code>
              </div>
              <p className="text-xs text-muted-foreground truncate">{entry.value}</p>
            </div>
            <Badge variant={freshness.variant} className="text-[9px] px-1 py-0 shrink-0">
              {freshness.label}
            </Badge>
          </div>
        );
      })}
    </div>
  );
};

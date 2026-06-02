import React from 'react';
import { Badge } from '@/components/ui/badge';
import { MemoryEntry } from './agentDefinitions';
import { Clock, Zap, AlertTriangle } from 'lucide-react';

interface AgentMemoryPanelProps {
  entries: MemoryEntry[];
}

const getFreshness = (createdAt: string, ttlHours: number) => {
  const age = (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60);
  const ratio = age / ttlHours;
  if (ratio < 0.5) return { label: 'Fresh', icon: Zap, variant: 'success' as const, opacity: 'opacity-100' };
  if (ratio < 1) return { label: 'Aging', icon: Clock, variant: 'warning' as const, opacity: 'opacity-80' };
  return { label: 'Expired', icon: AlertTriangle, variant: 'destructive' as const, opacity: 'opacity-50' };
};

export const AgentMemoryPanel = ({ entries }: AgentMemoryPanelProps) => {
  if (entries.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        No memory entries yet
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {entries.map((entry) => {
        const freshness = getFreshness(entry.createdAt, entry.ttlHours);
        const FreshnessIcon = freshness.icon;
        return (
          <div
            key={entry.id}
            className={`rounded-lg border border-border bg-muted/30 p-3 transition-opacity ${freshness.opacity}`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <code className="text-xs font-mono text-primary font-semibold">{entry.key}</code>
              <Badge variant={freshness.variant} className="text-[10px] gap-1 px-1.5 py-0">
                <FreshnessIcon className="h-3 w-3" />
                {freshness.label}
              </Badge>
            </div>
            <p className="text-sm text-foreground">{entry.value}</p>
            <div className="flex items-center gap-2 mt-1.5">
              <span className="text-[10px] text-muted-foreground">
                {new Date(entry.createdAt).toLocaleString()}
              </span>
              <span className="text-[10px] text-muted-foreground">
                TTL: {entry.ttlHours}h
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

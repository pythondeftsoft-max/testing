import React from 'react';
import { cn } from '@/lib/utils';
import { AgentDefinition, AgentStatus } from './agentDefinitions';

interface AgentStatusGridProps {
  agents: AgentDefinition[];
  onSelectAgent: (agent: AgentDefinition) => void;
}

const statusRing: Record<AgentStatus, string> = {
  active: 'ring-green-500',
  idle: 'ring-muted-foreground/40',
  error: 'ring-destructive',
  not_configured: 'ring-muted-foreground/20',
};

const statusLabel: Record<AgentStatus, string> = {
  active: 'Active',
  idle: 'Idle',
  error: 'Error',
  not_configured: 'N/A',
};

export const AgentStatusGrid = ({ agents, onSelectAgent }: AgentStatusGridProps) => {
  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        Agent Status
      </h3>
      <div className="grid grid-cols-2 gap-2">
        {agents.map(agent => {
          const Icon = agent.icon;
          return (
            <button
              key={agent.id}
              onClick={() => onSelectAgent(agent)}
              className="flex items-center gap-2 p-2 rounded-lg border border-border hover:bg-muted transition-colors text-left"
            >
              <div className={cn('p-1.5 rounded-md ring-2', agent.bgClass, statusRing[agent.status])}>
                <Icon className={cn('h-3.5 w-3.5', agent.colorClass)} />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-foreground truncate">{agent.name}</p>
                <p className="text-[10px] text-muted-foreground">{statusLabel[agent.status]}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

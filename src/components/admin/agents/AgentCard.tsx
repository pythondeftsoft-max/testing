import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { AgentDefinition, AgentStatus } from './agentDefinitions';
import { Clock } from 'lucide-react';

const statusConfig: Record<AgentStatus, { label: string; variant: 'success' | 'secondary' | 'destructive' | 'outline' }> = {
  active: { label: 'Active', variant: 'success' },
  idle: { label: 'Idle', variant: 'secondary' },
  error: { label: 'Error', variant: 'destructive' },
  not_configured: { label: 'Not Configured', variant: 'outline' },
};

interface AgentCardProps {
  agent: AgentDefinition;
  onClick: () => void;
}

export const AgentCard = ({ agent, onClick }: AgentCardProps) => {
  const Icon = agent.icon;
  const status = statusConfig[agent.status];

  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-all duration-200 hover:border-primary/30 group"
      onClick={onClick}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className={cn('p-2.5 rounded-lg', agent.bgClass)}>
            <Icon className={cn('h-5 w-5', agent.colorClass)} />
          </div>
          <Badge variant={status.variant} className="text-xs">
            {status.label}
          </Badge>
        </div>

        <h3 className="font-semibold text-foreground text-base mb-0.5">{agent.name}</h3>
        <p className="text-xs text-muted-foreground mb-3">{agent.role}</p>

        <p className="text-sm text-foreground/80 mb-3 line-clamp-1">{agent.currentTask}</p>

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="font-medium">{agent.keyMetric}</span>
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {agent.lastActive}
          </span>
        </div>
      </CardContent>
    </Card>
  );
};

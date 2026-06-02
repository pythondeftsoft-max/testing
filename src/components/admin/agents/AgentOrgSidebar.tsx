import React from 'react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AgentDefinition, AgentDepartment, agentDefinitions, departmentLabels } from './agentDefinitions';

interface AgentOrgSidebarProps {
  onSelectAgent: (agent: AgentDefinition) => void;
  selectedAgentId?: string | null;
}

const statusDotColor: Record<string, string> = {
  active: 'bg-green-500',
  idle: 'bg-muted-foreground/40',
  error: 'bg-destructive',
  not_configured: 'bg-muted-foreground/20',
};

const departments: AgentDepartment[] = ['leadership', 'operations', 'revenue', 'intelligence'];

export const AgentOrgSidebar = ({ onSelectAgent, selectedAgentId }: AgentOrgSidebarProps) => {
  const grouped = departments.map(dept => ({
    department: dept,
    label: departmentLabels[dept],
    agents: agentDefinitions.filter(a => a.department === dept),
  }));

  return (
    <div className="space-y-1">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-2">
        Organization
      </h3>
      {grouped.map(group => (
        <Collapsible key={group.department} defaultOpen>
          <CollapsibleTrigger className="flex items-center gap-1.5 w-full px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors group">
            <ChevronRight className="h-3 w-3 transition-transform group-data-[state=open]:rotate-90" />
            {group.label}
            <span className="ml-auto text-[10px] text-muted-foreground/60">{group.agents.length}</span>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="ml-2 border-l border-border pl-2 space-y-0.5">
              {group.agents.map(agent => {
                const Icon = agent.icon;
                const isSelected = selectedAgentId === agent.id;
                return (
                  <button
                    key={agent.id}
                    onClick={() => onSelectAgent(agent)}
                    className={cn(
                      'flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-sm transition-colors',
                      isSelected
                        ? 'bg-primary/10 text-primary font-medium'
                        : 'text-foreground/80 hover:bg-muted'
                    )}
                  >
                    <Icon className={cn('h-3.5 w-3.5', agent.colorClass)} />
                    <span className="truncate flex-1 text-left">{agent.name}</span>
                    <span className={cn('h-2 w-2 rounded-full shrink-0', statusDotColor[agent.status])} />
                  </button>
                );
              })}
            </div>
          </CollapsibleContent>
        </Collapsible>
      ))}
    </div>
  );
};

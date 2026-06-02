import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { ListTodo, Bot, Zap, ShieldCheck } from 'lucide-react';
import { useAgentStats } from '@/hooks/useAgentData';

export const AgentStatsRow = () => {
  const { data: stats } = useAgentStats();

  const items = [
    { label: 'Total Tasks', value: stats?.totalTasks ?? 0, icon: ListTodo, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { label: 'Active Agents', value: stats?.activeAgents ?? 0, icon: Bot, color: 'text-green-500', bg: 'bg-green-500/10' },
    { label: 'Matches Pushed', value: stats?.matchesPushed ?? 0, icon: Zap, color: 'text-amber-500', bg: 'bg-amber-500/10' },
    { label: 'Approvals Pending', value: stats?.approvalsPending ?? 0, icon: ShieldCheck, color: 'text-purple-500', bg: 'bg-purple-500/10' },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {items.map(stat => {
        const Icon = stat.icon;
        return (
          <Card key={stat.label}>
            <CardContent className="p-3 flex items-center gap-3">
              <div className={`p-2 rounded-lg ${stat.bg}`}>
                <Icon className={`h-4 w-4 ${stat.color}`} />
              </div>
              <div>
                <p className="text-lg font-bold text-foreground">{stat.value}</p>
                <p className="text-[11px] text-muted-foreground">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

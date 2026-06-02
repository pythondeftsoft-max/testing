import React, { useState } from 'react';
import { agentDefinitions, AgentDefinition } from './agentDefinitions';
import { AgentDetailView } from './AgentDetailView';
import { AgentOrgSidebar } from './AgentOrgSidebar';
import { AgentStatsRow } from './AgentStatsRow';
import { AgentMissionCard } from './AgentMissionCard';
import { AgentActivityFeed } from './AgentActivityFeed';
import { AgentQuickActions } from './AgentQuickActions';
import { AgentStatusGrid } from './AgentStatusGrid';
import { AgentApprovalQueue } from './AgentApprovalQueue';
import { AgentSharedMemory } from './AgentSharedMemory';
import { GrowthGoalsTracker } from './GrowthGoalsTracker';
import { AgentReportsTab } from './AgentReportsTab';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bot } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAgentActivityLogs } from '@/hooks/useAgentData';

export const AgentCommandCenter = () => {
  const [selectedAgent, setSelectedAgent] = useState<AgentDefinition | null>(null);
  const { data: allActivities } = useAgentActivityLogs(undefined, 'activity');

  const feedActivities = (allActivities || []).map(log => {
    const agent = agentDefinitions.find(a => a.id === log.agent_id);
    return {
      id: log.id,
      action: log.action,
      detail: log.detail || '',
      timestamp: log.created_at,
      relatedAgent: log.related_agent_id || undefined,
      agentName: agent?.name,
    };
  });

  if (selectedAgent) {
    return (
      <AgentDetailView
        agent={selectedAgent}
        onBack={() => setSelectedAgent(null)}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary/10">
            <Bot className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">AI Command Center</h1>
            <p className="text-sm text-muted-foreground">Mission control for your AI workforce</p>
          </div>
        </div>
        <Badge variant="outline" className="text-sm px-3 py-1">
          {agentDefinitions.filter(a => a.status === 'active').length} / {agentDefinitions.length} Online
        </Badge>
      </div>

      {/* 3-Panel Layout */}
      <div className="flex gap-4 items-start">
        {/* Left: Org Sidebar */}
        <Card className="w-56 shrink-0 hidden lg:block">
          <CardContent className="p-3">
            <AgentOrgSidebar
              onSelectAgent={setSelectedAgent}
              selectedAgentId={null}
            />
          </CardContent>
        </Card>

        {/* Center: Main Dashboard */}
        <div className="flex-1 min-w-0 space-y-4">
          <AgentStatsRow />
          <AgentMissionCard />

          {/* Combined Activity Feed */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Live Activity Feed</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-48">
                <AgentActivityFeed activities={feedActivities} />
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Growth Goals Tracker */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Growth Goals & KPIs</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-72">
                <GrowthGoalsTracker />
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Reports */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">📋 Reports & Research</CardTitle>
            </CardHeader>
            <CardContent>
              <AgentReportsTab />
            </CardContent>
          </Card>

          {/* Shared Memory Bank */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Shared Memory Bank</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-52">
                <AgentSharedMemory />
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Right: Command Panel */}
        <div className="w-64 shrink-0 hidden md:flex flex-col gap-4">
          <Card>
            <CardContent className="p-3">
              <AgentQuickActions />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-3">
              <AgentStatusGrid
                agents={agentDefinitions}
                onSelectAgent={setSelectedAgent}
              />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-3">
              <AgentApprovalQueue />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Loader2, Play } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AgentDefinition } from './agentDefinitions';
import { AgentActivityFeed } from './AgentActivityFeed';
import { AgentGoalsPanel } from './AgentGoalsPanel';
import { AgentMemoryPanel } from './AgentMemoryPanel';
import { AgentDocsPanel } from './AgentDocsPanel';
import { AgentCommsThread } from './AgentCommsThread';
import { ScoutCallList } from './ScoutCallList';
import { useAgentTasks, useAgentActivityLogs, useAgentMemory, useRunScout, useRunBriefing } from '@/hooks/useAgentData';
import { toast } from '@/hooks/use-toast';

interface AgentDetailViewProps {
  agent: AgentDefinition;
  onBack: () => void;
}

const taskStatusBadge = (status: string) => {
  const map: Record<string, 'secondary' | 'warning' | 'success' | 'destructive'> = {
    pending: 'secondary',
    in_progress: 'warning',
    completed: 'success',
    failed: 'destructive',
  };
  return <Badge variant={map[status] || 'secondary'} className="text-xs capitalize">{status.replace('_', ' ')}</Badge>;
};

export const AgentDetailView = ({ agent, onBack }: AgentDetailViewProps) => {
  const Icon = agent.icon;
  const { data: tasks, isLoading: tasksLoading } = useAgentTasks(agent.id);
  const { data: activities, isLoading: activitiesLoading } = useAgentActivityLogs(agent.id, 'activity');
  const { data: comms, isLoading: commsLoading } = useAgentActivityLogs(agent.id, 'communication');
  const { data: memory, isLoading: memoryLoading } = useAgentMemory(agent.id);
  const runScout = useRunScout();
  const runBriefing = useRunBriefing();

  const handleRunScout = async () => {
    try {
      const result = await runScout.mutateAsync();
      toast({
        title: 'Scout Complete',
        description: `Found ${result?.found || 0} results, added ${result?.inserted || 0} new properties to call list.`,
      });
    } catch (err) {
      toast({
        title: 'Scout Failed',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  };

  const activityFeed = (activities || []).map(log => ({
    id: log.id,
    action: log.action,
    detail: log.detail || '',
    timestamp: log.created_at,
    relatedAgent: log.related_agent_id || undefined,
  }));

  const commsFeed = (comms || []).map(log => ({
    id: log.id,
    action: log.action,
    detail: log.detail || '',
    timestamp: log.created_at,
    relatedAgent: log.related_agent_id || undefined,
  }));

  const memoryEntries = (memory || []).map(m => ({
    id: m.id,
    agentId: m.agent_id,
    agentName: agent.name,
    key: m.key,
    value: m.value,
    createdAt: m.created_at,
    ttlHours: m.ttl_hours,
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className={cn('p-3 rounded-xl', agent.bgClass)}>
          <Icon className={cn('h-7 w-7', agent.colorClass)} />
        </div>
        <div className="flex-1">
          <h2 className="text-xl font-bold text-foreground">{agent.name}</h2>
          <p className="text-sm text-muted-foreground">{agent.description}</p>
        </div>
        <Badge variant={agent.status === 'active' ? 'success' : agent.status === 'error' ? 'destructive' : 'secondary'} className="text-sm px-3 py-1">
          {agent.status.replace('_', ' ')}
        </Badge>
        {agent.id === 'scout' && (
          <Button
            variant="gold"
            size="sm"
            onClick={handleRunScout}
            disabled={runScout.isPending}
          >
            {runScout.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1" />
            ) : (
              <Play className="h-4 w-4 mr-1" />
            )}
            Run Scout
          </Button>
        )}
        {agent.id === 'briefing' && (
          <Button
            variant="gold"
            size="sm"
            onClick={async () => {
              try {
                const result = await runBriefing.mutateAsync();
                toast({
                  title: 'Brief Posted',
                  description: `Signups: ${result?.signups?.tenants || 0}T/${result?.signups?.landlords || 0}L | Props: ${result?.propertiesAdded || 0}`,
                });
              } catch (err) {
                toast({
                  title: 'Brief Failed',
                  description: err instanceof Error ? err.message : 'Unknown error',
                  variant: 'destructive',
                });
              }
            }}
            disabled={runBriefing.isPending}
          >
            {runBriefing.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1" />
            ) : (
              <Play className="h-4 w-4 mr-1" />
            )}
            Run Brief
          </Button>
        )}
      </div>

      {/* Tabs */}
      <Tabs defaultValue={agent.id === 'scout' ? 'calllist' : 'tasks'}>
        <TabsList className="w-full justify-start">
          {agent.id === 'scout' && <TabsTrigger value="calllist">Call List</TabsTrigger>}
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="memory">Memory</TabsTrigger>
          <TabsTrigger value="docs">Docs</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="goals">Goals</TabsTrigger>
          <TabsTrigger value="comms">Comms</TabsTrigger>
        </TabsList>

        {agent.id === 'scout' && (
          <TabsContent value="calllist">
            <Card>
              <CardHeader><CardTitle className="text-base">Scout Findings — Call List</CardTitle></CardHeader>
              <CardContent>
                <ScoutCallList />
              </CardContent>
            </Card>
          </TabsContent>
        )}

        <TabsContent value="tasks">
          <Card>
            <CardHeader><CardTitle className="text-base">Task Queue</CardTitle></CardHeader>
            <CardContent>
              {tasksLoading ? (
                <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
              ) : !tasks || tasks.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">No tasks in queue</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Task</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tasks.map((task) => (
                      <TableRow key={task.id}>
                        <TableCell className="font-medium">{task.title}</TableCell>
                        <TableCell>{taskStatusBadge(task.status)}</TableCell>
                        <TableCell>
                          <Badge variant={task.priority === 'high' ? 'destructive' : task.priority === 'medium' ? 'warning' : 'secondary'} className="text-xs">
                            {task.priority}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {new Date(task.created_at).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity">
          <Card>
            <CardHeader><CardTitle className="text-base">Activity Feed</CardTitle></CardHeader>
            <CardContent>
              {activitiesLoading ? (
                <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
              ) : (
                <AgentActivityFeed activities={activityFeed} />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="goals">
          <Card>
            <CardHeader><CardTitle className="text-base">Goals & KPIs</CardTitle></CardHeader>
            <CardContent>
              <AgentGoalsPanel goals={agent.goals} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="memory">
          <Card>
            <CardHeader><CardTitle className="text-base">Rolling Memory</CardTitle></CardHeader>
            <CardContent>
              {memoryLoading ? (
                <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
              ) : (
                <AgentMemoryPanel entries={memoryEntries} />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="docs">
          <Card>
            <CardHeader><CardTitle className="text-base">Saved Documents</CardTitle></CardHeader>
            <CardContent>
              <AgentDocsPanel docs={agent.docs} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="comms">
          <Card>
            <CardHeader><CardTitle className="text-base">Agent Communications</CardTitle></CardHeader>
            <CardContent>
              {commsLoading ? (
                <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
              ) : (
                <AgentCommsThread communications={commsFeed} currentAgentId={agent.id} />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

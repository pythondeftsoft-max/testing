import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, Users, AlertCircle, CheckCircle, TrendingUp } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { AutoAssignButton } from './AutoAssignButton';

interface AssignmentLog {
  id: string;
  run_at: string;
  tenants_assigned: number;
  properties_assigned: number;
  tenants_skipped: number;
  properties_skipped: number;
  workers_used: string[];
  errors: string[];
  triggered_by: string;
}

export const AutoAssignmentMonitor = () => {
  const { data: logs, isLoading } = useQuery({
    queryKey: ['auto-assignment-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('auto_assignment_logs')
        .select('*')
        .order('run_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      return data as AssignmentLog[];
    },
    refetchInterval: 60000, // Refresh every minute
  });

  const lastRun = logs?.[0];
  const totalAssignedToday = logs
    ?.filter(log => {
      const logDate = new Date(log.run_at);
      const today = new Date();
      return logDate.toDateString() === today.toDateString();
    })
    .reduce((sum, log) => sum + log.tenants_assigned + log.properties_assigned, 0) || 0;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-muted-foreground">Loading assignment data...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Manual Trigger */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Auto-Assignment Monitor</h3>
          <p className="text-sm text-muted-foreground">
            Automated workload distribution running every 30 minutes
          </p>
        </div>
        <AutoAssignButton />
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Last Run Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Last Run
            </CardTitle>
          </CardHeader>
          <CardContent>
            {lastRun ? (
              <>
                <div className="text-2xl font-bold">
                  {formatDistanceToNow(new Date(lastRun.run_at), { addSuffix: true })}
                </div>
                <div className="text-sm text-muted-foreground mt-2">
                  {lastRun.tenants_assigned} tenants, {lastRun.properties_assigned} properties assigned
                </div>
                {(lastRun.tenants_skipped > 0 || lastRun.properties_skipped > 0) && (
                  <div className="flex items-center gap-1 mt-2 text-sm text-amber-600">
                    <AlertCircle className="h-3 w-3" />
                    {lastRun.tenants_skipped + lastRun.properties_skipped} skipped (no workers)
                  </div>
                )}
              </>
            ) : (
              <div className="text-sm text-muted-foreground">No runs yet</div>
            )}
          </CardContent>
        </Card>

        {/* Today's Activity Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Today's Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalAssignedToday}</div>
            <div className="text-sm text-muted-foreground mt-2">
              Total entities assigned today
            </div>
          </CardContent>
        </Card>

        {/* Workers Active Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4" />
              Active Workers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {lastRun?.workers_used?.length || 0}
            </div>
            <div className="text-sm text-muted-foreground mt-2">
              Workers used in last run
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Assignment History</CardTitle>
          <CardDescription>Last 10 automated assignment runs</CardDescription>
        </CardHeader>
        <CardContent>
          {logs && logs.length > 0 ? (
            <div className="space-y-3">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      {log.errors.length === 0 ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-amber-600" />
                      )}
                      <span className="text-sm font-medium">
                        {new Date(log.run_at).toLocaleString()}
                      </span>
                    </div>
                    <Badge variant={log.triggered_by === 'cron' ? 'secondary' : 'default'}>
                      {log.triggered_by}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-6 text-sm">
                    <div className="text-center">
                      <div className="font-semibold text-green-600">
                        {log.tenants_assigned + log.properties_assigned}
                      </div>
                      <div className="text-xs text-muted-foreground">assigned</div>
                    </div>
                    {(log.tenants_skipped > 0 || log.properties_skipped > 0) && (
                      <div className="text-center">
                        <div className="font-semibold text-amber-600">
                          {log.tenants_skipped + log.properties_skipped}
                        </div>
                        <div className="text-xs text-muted-foreground">skipped</div>
                      </div>
                    )}
                    <div className="text-center">
                      <div className="font-semibold">{log.workers_used.length}</div>
                      <div className="text-xs text-muted-foreground">workers</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No assignment history yet. The system will automatically assign entities every 30 minutes.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Setup Instructions */}
      <Card className="border-blue-200 bg-blue-50/50">
        <CardHeader>
          <CardTitle className="text-base">Setup Automated Scheduling (One-Time Setup)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            To enable automatic assignment every 30 minutes, run this SQL in your Supabase SQL Editor:
          </p>
          <pre className="bg-slate-900 text-slate-50 p-4 rounded-lg text-xs overflow-x-auto">
{`-- Enable extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule auto-assignment every 30 minutes
SELECT cron.schedule(
  'auto-assign-entities-job',
  '*/30 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://kixsdhnfzjnxikmnbipi.supabase.co/functions/v1/scheduled-auto-assign',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpeHNkaG5mempueGlrbW5iaXBpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEwMzQ2NDgsImV4cCI6MjA2NjYxMDY0OH0.bFcMmpvwle1l3JgDfwS71x_-LoYM_Ze-GteNMBd7JQ4"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);

-- View scheduled jobs
SELECT * FROM cron.job;`}
          </pre>
          <div className="flex items-start gap-2 text-sm text-amber-700 bg-amber-50 p-3 rounded-lg">
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <p>
              This will automatically assign unassigned tenants and properties to available workers every 30 minutes. 
              Entities without workers in their territory will remain in the queue.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

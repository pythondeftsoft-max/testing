import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, MessageSquare, TrendingUp, CheckCircle, XCircle } from 'lucide-react';

interface WorkerSmsMetric {
  worker_id: string;
  messages_sent: number;
  messages_received: number;
  delivered_count: number;
  failed_count: number;
  delivery_rate_pct: number | null;
  total_conversations: number;
  first_message_at: string | null;
  last_message_at: string | null;
}

export const SmsPerformanceTab: React.FC = () => {
  const { data: metrics, isLoading } = useQuery({
    queryKey: ['worker-sms-metrics'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('worker_sms_metrics' as any)
        .select('*')
        .order('messages_sent', { ascending: false });

      if (error) throw error;
      return (data || []) as unknown as WorkerSmsMetric[];
    },
  });

  // Fetch worker names
  const workerIds = metrics?.map(m => m.worker_id) || [];
  const { data: profiles } = useQuery({
    queryKey: ['worker-profiles-sms', workerIds],
    queryFn: async () => {
      if (workerIds.length === 0) return [];
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .in('id', workerIds);
      if (error) throw error;
      return data || [];
    },
    enabled: workerIds.length > 0,
  });

  const getWorkerName = (id: string) => {
    const profile = profiles?.find(p => p.id === id);
    if (!profile) return id.slice(0, 8) + '...';
    return [profile.first_name, profile.last_name].filter(Boolean).join(' ') || id.slice(0, 8) + '...';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-40">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const totalSent = metrics?.reduce((sum, m) => sum + (m.messages_sent || 0), 0) || 0;
  const totalDelivered = metrics?.reduce((sum, m) => sum + (m.delivered_count || 0), 0) || 0;
  const totalFailed = metrics?.reduce((sum, m) => sum + (m.failed_count || 0), 0) || 0;

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-primary" />
              <span className="text-sm text-muted-foreground">Total Sent</span>
            </div>
            <p className="text-2xl font-bold mt-1">{totalSent}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span className="text-sm text-muted-foreground">Delivered</span>
            </div>
            <p className="text-2xl font-bold mt-1">{totalDelivered}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <XCircle className="w-4 h-4 text-destructive" />
              <span className="text-sm text-muted-foreground">Failed</span>
            </div>
            <p className="text-2xl font-bold mt-1">{totalFailed}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              <span className="text-sm text-muted-foreground">Delivery Rate</span>
            </div>
            <p className="text-2xl font-bold mt-1">
              {totalSent > 0 ? ((totalDelivered / totalSent) * 100).toFixed(1) : '0'}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Worker Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Worker SMS Performance</CardTitle>
        </CardHeader>
        <CardContent>
          {!metrics || metrics.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No messaging data yet</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Worker</TableHead>
                  <TableHead className="text-right">Sent</TableHead>
                  <TableHead className="text-right">Received</TableHead>
                  <TableHead className="text-right">Delivered</TableHead>
                  <TableHead className="text-right">Failed</TableHead>
                  <TableHead className="text-right">Rate</TableHead>
                  <TableHead className="text-right">Conversations</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {metrics.map((m) => (
                  <TableRow key={m.worker_id}>
                    <TableCell className="font-medium">{getWorkerName(m.worker_id)}</TableCell>
                    <TableCell className="text-right">{m.messages_sent}</TableCell>
                    <TableCell className="text-right">{m.messages_received}</TableCell>
                    <TableCell className="text-right">{m.delivered_count}</TableCell>
                    <TableCell className="text-right">
                      {m.failed_count > 0 ? (
                        <Badge variant="destructive" className="text-xs">{m.failed_count}</Badge>
                      ) : (
                        '0'
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant={Number(m.delivery_rate_pct || 0) >= 90 ? 'default' : 'secondary'} className="text-xs">
                        {m.delivery_rate_pct ?? 0}%
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">{m.total_conversations}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

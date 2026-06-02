import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { LifeBuoy, ExternalLink, User } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const STATUS_COLORS: Record<string, string> = {
  open: 'bg-blue-500/10 text-blue-700 border-blue-500/30',
  in_progress: 'bg-amber-500/10 text-amber-700 border-amber-500/30',
  resolved: 'bg-green-500/10 text-green-700 border-green-500/30',
  closed: 'bg-muted text-muted-foreground',
};

const PRIORITY_COLORS: Record<string, string> = {
  urgent: 'bg-red-500/10 text-red-700 border-red-500/30',
  high: 'bg-orange-500/10 text-orange-700 border-orange-500/30',
  normal: 'bg-muted text-muted-foreground',
  low: 'bg-muted/50 text-muted-foreground/70',
};

const SupportTickets: React.FC = () => {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [filterStatus, setFilterStatus] = useState<string>('open');
  const [resolutionNotes, setResolutionNotes] = useState<Record<string, string>>({});

  const { data: tickets, isLoading } = useQuery({
    queryKey: ['support_tickets', filterStatus],
    queryFn: async () => {
      let q = supabase.from('support_tickets').select('*').order('created_at', { ascending: false }).limit(200);
      if (filterStatus !== 'all') q = q.eq('status', filterStatus);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status, notes }: { id: string; status: string; notes?: string }) => {
      const update: Record<string, any> = { status };
      if (status === 'resolved' || status === 'closed') {
        update.resolved_at = new Date().toISOString();
        if (notes) update.resolution_notes = notes;
      }
      const { error } = await supabase.from('support_tickets').update(update).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['support_tickets'] });
      toast({ title: 'Ticket updated' });
    },
    onError: (e: any) => toast({ title: 'Update failed', description: e.message, variant: 'destructive' }),
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <LifeBuoy className="h-6 w-6" /> Support Tickets
          </h1>
          <p className="text-muted-foreground text-sm">Inbound requests from agencies, tenants, and landlords.</p>
        </div>
      </div>

      <Tabs value={filterStatus} onValueChange={setFilterStatus}>
        <TabsList>
          <TabsTrigger value="open">Open</TabsTrigger>
          <TabsTrigger value="in_progress">In Progress</TabsTrigger>
          <TabsTrigger value="resolved">Resolved</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>

        <TabsContent value={filterStatus} className="mt-4 space-y-4">
          {isLoading && <Skeleton className="h-32 w-full" />}
          {!isLoading && tickets?.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                No tickets in this view.
              </CardContent>
            </Card>
          )}
          {tickets?.map((t: any) => (
            <Card key={t.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <CardTitle className="text-base">{t.subject}</CardTitle>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant="outline" className={STATUS_COLORS[t.status]}>{t.status.replace('_', ' ')}</Badge>
                      <Badge variant="outline" className={PRIORITY_COLORS[t.priority]}>{t.priority}</Badge>
                      <Badge variant="outline">{t.category}</Badge>
                      <span className="flex items-center gap-1"><User className="h-3 w-3" /> {t.submitter_name || t.submitter_email}</span>
                      <span>{new Date(t.created_at).toLocaleString()}</span>
                    </div>
                  </div>
                  <Select
                    value={t.status}
                    onValueChange={(v) => updateStatus.mutate({ id: t.id, status: v, notes: resolutionNotes[t.id] })}
                  >
                    <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm whitespace-pre-wrap bg-muted/30 p-3 rounded-md">{t.description}</p>
                {t.page_url && (
                  <a
                    href={t.page_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline inline-flex items-center gap-1"
                  >
                    Submitted from this page <ExternalLink className="h-3 w-3" />
                  </a>
                )}
                {(t.status === 'open' || t.status === 'in_progress') && (
                  <Textarea
                    value={resolutionNotes[t.id] || ''}
                    onChange={(e) => setResolutionNotes({ ...resolutionNotes, [t.id]: e.target.value })}
                    placeholder="Resolution notes (saved when you mark as Resolved)"
                    rows={2}
                  />
                )}
                {t.resolution_notes && (
                  <div className="text-xs border-l-2 border-success pl-3 py-1 bg-success/5">
                    <div className="font-semibold mb-1">Resolution:</div>
                    <p className="whitespace-pre-wrap">{t.resolution_notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SupportTickets;

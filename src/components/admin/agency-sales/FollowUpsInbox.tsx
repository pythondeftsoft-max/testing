import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Loader2, Clock, AlertTriangle, Calendar } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow, isPast, isToday, addDays } from 'date-fns';

interface FollowUpItem {
  source: 'lead' | 'prospect';
  id: string;
  agency_name: string;
  due: Date;
  status: string;
}

export default function FollowUpsInbox() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [bucket, setBucket] = useState<'overdue' | 'today' | 'week'>('overdue');

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['agency-sales', 'followups'],
    queryFn: async (): Promise<FollowUpItem[]> => {
      const horizon = addDays(new Date(), 30).toISOString();
      const [leadsRes, prospectsRes] = await Promise.all([
        supabase
          .from('agency_leads')
          .select('id, agency_name, status, next_follow_up_at')
          .not('next_follow_up_at', 'is', null)
          .lte('next_follow_up_at', horizon)
          .limit(500),
        supabase
          .from('pha_prospect_status')
          .select('id, status, next_action_at, housing_authorities:housing_authority_id (name)')
          .not('next_action_at', 'is', null)
          .lte('next_action_at', horizon)
          .limit(500),
      ]);

      const out: FollowUpItem[] = [];
      (leadsRes.data || []).forEach((l: any) => {
        out.push({
          source: 'lead',
          id: l.id,
          agency_name: l.agency_name,
          due: new Date(l.next_follow_up_at),
          status: l.status,
        });
      });
      (prospectsRes.data || []).forEach((p: any) => {
        out.push({
          source: 'prospect',
          id: p.id,
          agency_name: (p.housing_authorities as any)?.name || 'Unknown PHA',
          due: new Date(p.next_action_at),
          status: p.status,
        });
      });
      return out.sort((a, b) => a.due.getTime() - b.due.getTime());
    },
  });

  const buckets = useMemo(() => {
    const overdue: FollowUpItem[] = [];
    const today: FollowUpItem[] = [];
    const week: FollowUpItem[] = [];
    const weekEnd = addDays(new Date(), 7);
    items.forEach((it) => {
      if (isPast(it.due) && !isToday(it.due)) overdue.push(it);
      else if (isToday(it.due)) today.push(it);
      else if (it.due <= weekEnd) week.push(it);
    });
    return { overdue, today, week };
  }, [items]);

  const snooze = useMutation({
    mutationFn: async ({ item, days }: { item: FollowUpItem; days: number }) => {
      const next = addDays(new Date(), days).toISOString();
      if (item.source === 'lead') {
        const { error } = await supabase.from('agency_leads').update({ next_follow_up_at: next }).eq('id', item.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('pha_prospect_status').update({ next_action_at: next }).eq('id', item.id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast({ title: 'Snoozed' });
      qc.invalidateQueries({ queryKey: ['agency-sales'] });
    },
    onError: (e: any) => toast({ title: 'Snooze failed', description: e.message, variant: 'destructive' }),
  });

  const markDone = useMutation({
    mutationFn: async (item: FollowUpItem) => {
      if (item.source === 'lead') {
        const { error } = await supabase
          .from('agency_leads')
          .update({ next_follow_up_at: null, last_contacted_at: new Date().toISOString() })
          .eq('id', item.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('pha_prospect_status')
          .update({ next_action_at: null, last_contacted_at: new Date().toISOString() })
          .eq('id', item.id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast({ title: 'Marked done' });
      qc.invalidateQueries({ queryKey: ['agency-sales'] });
    },
    onError: (e: any) => toast({ title: 'Failed', description: e.message, variant: 'destructive' }),
  });

  const list = buckets[bucket];

  return (
    <Card>
      <CardContent className="p-4">
        <Tabs value={bucket} onValueChange={(v) => setBucket(v as any)}>
          <TabsList>
            <TabsTrigger value="overdue">
              <AlertTriangle className="h-3.5 w-3.5 mr-1.5" />
              Overdue ({buckets.overdue.length})
            </TabsTrigger>
            <TabsTrigger value="today">
              <Clock className="h-3.5 w-3.5 mr-1.5" />
              Today ({buckets.today.length})
            </TabsTrigger>
            <TabsTrigger value="week">
              <Calendar className="h-3.5 w-3.5 mr-1.5" />
              This week ({buckets.week.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value={bucket} className="mt-4">
            {isLoading ? (
              <div className="p-8 text-center text-muted-foreground">
                <Loader2 className="inline h-4 w-4 animate-spin mr-2" /> Loading…
              </div>
            ) : list.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">All caught up.</p>
            ) : (
              <div className="divide-y">
                {list.map((it) => (
                  <div key={`${it.source}:${it.id}`} className="flex items-center gap-3 py-3">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm">{it.agency_name}</div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Badge variant="outline" className="text-[10px] py-0 px-1 h-4">
                          {it.source === 'lead' ? 'Inbound' : 'Outbound'}
                        </Badge>
                        <span>{it.status}</span>
                        <span>•</span>
                        <span>{formatDistanceToNow(it.due, { addSuffix: true })}</span>
                      </div>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => snooze.mutate({ item: it, days: 3 })}>
                      Snooze 3d
                    </Button>
                    <Button size="sm" variant="default" onClick={() => markDone.mutate(it)}>
                      Done
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

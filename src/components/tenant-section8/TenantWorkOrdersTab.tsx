import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Wrench } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface TenantWorkOrdersTabProps {
  userId: string;
}

const PRIORITIES = [
  { value: 'low', label: 'Low' },
  { value: 'normal', label: 'Normal' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];

const TenantWorkOrdersTab: React.FC<TenantWorkOrdersTabProps> = ({ userId }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newOrder, setNewOrder] = useState({ title: '', description: '', priority: 'normal' });

  const { data: workOrders = [], isLoading } = useQuery({
    queryKey: ['tenant-work-orders', userId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('agency_work_orders')
        .select('id, title, description, priority, status, created_at, completed_at')
        .eq('tenant_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
    enabled: !!userId,
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      // Get the tenant's agency enrollment to find the agency_id
      const { data: enrollment } = await (supabase as any)
        .from('agency_tenant_enrollments')
        .select('agency_id')
        .eq('tenant_id', userId)
        .eq('status', 'active')
        .maybeSingle();

      if (!enrollment?.agency_id) throw new Error('No active agency enrollment found');

      const { error } = await (supabase as any)
        .from('agency_work_orders')
        .insert({
          agency_id: enrollment.agency_id,
          tenant_id: userId,
          title: newOrder.title,
          description: newOrder.description || null,
          priority: newOrder.priority,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-work-orders', userId] });
      setDialogOpen(false);
      setNewOrder({ title: '', description: '', priority: 'normal' });
      toast({ title: 'Work order submitted' });
    },
    onError: (err: any) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  });

  const statusColors: Record<string, string> = {
    submitted: 'secondary',
    assigned: 'default',
    in_progress: 'default',
    completed: 'outline',
    cancelled: 'destructive',
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-foreground flex items-center gap-2">
          <Wrench className="w-4 h-4" /> My Work Orders
        </h3>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="w-4 h-4 mr-1" /> Submit Request</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Submit Maintenance Request</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Issue Title</Label>
                <Input value={newOrder.title} onChange={e => setNewOrder(p => ({ ...p, title: e.target.value }))} placeholder="Brief description of the issue" />
              </div>
              <div>
                <Label>Priority</Label>
                <Select value={newOrder.priority} onValueChange={v => setNewOrder(p => ({ ...p, priority: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PRIORITIES.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Details</Label>
                <Textarea value={newOrder.description} onChange={e => setNewOrder(p => ({ ...p, description: e.target.value }))} placeholder="Describe the issue in detail" />
              </div>
              <Button onClick={() => submitMutation.mutate()} disabled={!newOrder.title || submitMutation.isPending} className="w-full">
                {submitMutation.isPending ? 'Submitting...' : 'Submit Request'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : workOrders.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground">No work orders submitted</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {workOrders.map((wo: any) => (
            <Card key={wo.id}>
              <CardContent className="pt-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm text-foreground">{wo.title}</span>
                  <div className="flex gap-2">
                    <Badge variant={statusColors[wo.status] as any || 'secondary'}>{wo.status.replace('_', ' ')}</Badge>
                    <Badge variant="outline">{wo.priority}</Badge>
                  </div>
                </div>
                {wo.description && <p className="text-xs text-muted-foreground">{wo.description}</p>}
                <p className="text-xs text-muted-foreground">
                  Submitted {format(new Date(wo.created_at), 'MMM d, yyyy')}
                  {wo.completed_at && ` · Completed ${format(new Date(wo.completed_at), 'MMM d, yyyy')}`}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default TenantWorkOrdersTab;

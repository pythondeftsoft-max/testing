import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Wrench, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface AgencyWorkOrdersProps {
  agencyId: string;
  staffId: string;
  canManage: boolean;
}

const PRIORITIES = [
  { value: 'low', label: 'Low', variant: 'secondary' },
  { value: 'normal', label: 'Normal', variant: 'default' },
  { value: 'high', label: 'High', variant: 'destructive' },
  { value: 'urgent', label: 'Urgent', variant: 'destructive' },
] as const;

const STATUSES = [
  { value: 'submitted', label: 'Submitted' },
  { value: 'assigned', label: 'Assigned' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

const AgencyWorkOrders: React.FC<AgencyWorkOrdersProps> = ({ agencyId, staffId, canManage }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newOrder, setNewOrder] = useState({ title: '', description: '', priority: 'normal' });

  const { data: workOrders = [], isLoading } = useQuery({
    queryKey: ['agency-work-orders', agencyId, statusFilter],
    queryFn: async () => {
      let query = (supabase as any)
        .from('agency_work_orders')
        .select('*, profiles:tenant_id(full_name)')
        .eq('agency_id', agencyId)
        .order('created_at', { ascending: false })
        .limit(100);
      if (statusFilter !== 'all') query = query.eq('status', statusFilter);
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase as any)
        .from('agency_work_orders')
        .insert({
          agency_id: agencyId,
          title: newOrder.title,
          description: newOrder.description || null,
          priority: newOrder.priority,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agency-work-orders', agencyId] });
      setDialogOpen(false);
      setNewOrder({ title: '', description: '', priority: 'normal' });
      toast({ title: 'Work order created' });
    },
    onError: (err: any) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const updates: any = { status };
      if (status === 'completed') {
        updates.completed_at = new Date().toISOString();
      }
      const { error } = await (supabase as any)
        .from('agency_work_orders')
        .update(updates)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agency-work-orders', agencyId] });
      toast({ title: 'Status updated' });
    },
  });

  const openCount = workOrders.filter((w: any) => !['completed', 'cancelled'].includes(w.status)).length;
  const urgentCount = workOrders.filter((w: any) => w.priority === 'urgent' && w.status !== 'completed').length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Wrench className="w-5 h-5" /> Work Orders
          <Badge variant="secondary">{openCount} open</Badge>
          {urgentCount > 0 && <Badge variant="destructive"><AlertTriangle className="w-3 h-3 mr-1" />{urgentCount} urgent</Badge>}
        </h3>
        <div className="flex gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              {STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
            </SelectContent>
          </Select>
          {canManage && (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm"><Plus className="w-4 h-4 mr-1" /> New Order</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Create Work Order</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Title</Label>
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
                    <Label>Description</Label>
                    <Textarea value={newOrder.description} onChange={e => setNewOrder(p => ({ ...p, description: e.target.value }))} />
                  </div>
                  <Button onClick={() => createMutation.mutate()} disabled={!newOrder.title || createMutation.isPending} className="w-full">
                    {createMutation.isPending ? 'Creating...' : 'Create Work Order'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Tenant</TableHead>
                <TableHead>Created</TableHead>
                {canManage && <TableHead>Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
              ) : workOrders.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No work orders</TableCell></TableRow>
              ) : (
                workOrders.map((wo: any) => {
                  const priorityConfig = PRIORITIES.find(p => p.value === wo.priority);
                  return (
                    <TableRow key={wo.id}>
                      <TableCell>
                        <div>
                          <span className="font-medium text-foreground text-sm">{wo.title}</span>
                          {wo.description && <p className="text-xs text-muted-foreground truncate max-w-[200px]">{wo.description}</p>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={priorityConfig?.variant as any || 'secondary'}>{priorityConfig?.label || wo.priority}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{STATUSES.find(s => s.value === wo.status)?.label || wo.status}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{wo.profiles?.full_name || '—'}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{format(new Date(wo.created_at), 'MMM d')}</TableCell>
                      {canManage && (
                        <TableCell>
                          {wo.status !== 'completed' && wo.status !== 'cancelled' && (
                            <Select value={wo.status} onValueChange={v => updateStatusMutation.mutate({ id: wo.id, status: v })}>
                              <SelectTrigger className="w-[120px] h-8"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default AgencyWorkOrders;

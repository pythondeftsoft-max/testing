import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const DEFAULT_TASKS = [
  { task_type: 'lease_signed', label: 'Lease Signed' },
  { task_type: 'inspection_passed', label: 'HQS Inspection Passed' },
  { task_type: 'hap_contract_executed', label: 'HAP Contract Executed' },
  { task_type: 'keys_issued', label: 'Keys Issued to Tenant' },
  { task_type: 'utilities_transferred', label: 'Utilities Transferred' },
  { task_type: 'security_deposit', label: 'Security Deposit Collected' },
] as const;

export interface MoveInTask {
  id: string;
  lease_id: string;
  task_type: string;
  label: string;
  is_completed: boolean;
  completed_at: string | null;
  notes: string | null;
}

export interface PendingMoveIn {
  lease_id: string;
  tenant_name: string;
  property_address: string;
  unit_number: string | null;
  move_in_date: string | null;
  tasks: MoveInTask[];
}

export function usePendingMoveIns(agencyId: string) {
  const [moveIns, setMoveIns] = useState<PendingMoveIn[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMoveIns = useCallback(async () => {
    if (!agencyId) return;
    setLoading(true);

    // Get active leases with recent/future start dates (move-in candidates)
    const { data: leases, error: leaseErr } = await supabase
      .from('tenant_leases')
      .select('id, tenant_id, property_id, unit_id, lease_start, lease_end, status')
      .eq('status', 'active' as any)
      .order('lease_start', { ascending: false })
      .limit(50);

    if (leaseErr || !leases?.length) {
      setMoveIns([]);
      setLoading(false);
      return;
    }

    // Get tasks for these leases
    const leaseIds = leases.map(l => l.id);
    const { data: tasks } = await supabase
      .from('pending_move_in_tasks')
      .select('*')
      .eq('agency_id', agencyId)
      .in('lease_id', leaseIds);

    // Get tenant profiles & property info
    const tenantIds = [...new Set(leases.map(l => l.tenant_id).filter(Boolean))];
    const propertyIds = [...new Set(leases.map(l => l.property_id).filter(Boolean))];

    const [tenantRes, propRes] = await Promise.all([
      tenantIds.length ? supabase.from('profiles').select('id, first_name, last_name').in('id', tenantIds) : { data: [] },
      propertyIds.length ? supabase.from('properties').select('id, address').in('id', propertyIds) : { data: [] },
    ]);

    const tenantMap = new Map((tenantRes.data || []).map((t: any) => [t.id, `${t.first_name || ''} ${t.last_name || ''}`.trim() || 'Unknown']));
    const propMap = new Map((propRes.data || []).map((p: any) => [p.id, p.address]));
    const taskMap = new Map<string, MoveInTask[]>();
    (tasks || []).forEach((t: any) => {
      if (!taskMap.has(t.lease_id)) taskMap.set(t.lease_id, []);
      taskMap.get(t.lease_id)!.push(t);
    });

    // Only include leases that have incomplete tasks (or no tasks yet = needs initialization)
    const results: PendingMoveIn[] = leases
      .map(l => {
        const existingTasks = taskMap.get(l.id) || [];
        const allComplete = existingTasks.length === DEFAULT_TASKS.length && existingTasks.every(t => t.is_completed);
        if (allComplete) return null;

        return {
          lease_id: l.id,
          tenant_name: tenantMap.get(l.tenant_id) || 'Unknown Tenant',
          property_address: propMap.get(l.property_id) || 'Unknown Property',
          unit_number: null,
          move_in_date: (l as any).move_in_date || (l as any).lease_start,
          tasks: existingTasks,
        };
      })
      .filter(Boolean) as PendingMoveIn[];

    setMoveIns(results);
    setLoading(false);
  }, [agencyId]);

  useEffect(() => { fetchMoveIns(); }, [fetchMoveIns]);

  const initializeTasks = async (leaseId: string) => {
    const inserts = DEFAULT_TASKS.map(t => ({
      lease_id: leaseId,
      agency_id: agencyId,
      task_type: t.task_type,
      label: t.label,
      is_completed: false,
    }));

    const { error } = await supabase.from('pending_move_in_tasks').upsert(inserts as any, { onConflict: 'lease_id,task_type' });
    if (error) { toast.error('Failed to initialize tasks'); return; }
    toast.success('Move-in checklist created');
    fetchMoveIns();
  };

  const toggleTask = async (taskId: string, completed: boolean) => {
    const updates: Record<string, unknown> = {
      is_completed: completed,
      completed_at: completed ? new Date().toISOString() : null,
    };
    if (completed) {
      const { data: user } = await supabase.auth.getUser();
      updates.completed_by = user.user?.id;
    }

    const { error } = await supabase.from('pending_move_in_tasks').update(updates).eq('id', taskId);
    if (error) { toast.error('Failed to update task'); return; }
    fetchMoveIns();
  };

  return { moveIns, loading, initializeTasks, toggleTask, refetch: fetchMoveIns, DEFAULT_TASKS };
}

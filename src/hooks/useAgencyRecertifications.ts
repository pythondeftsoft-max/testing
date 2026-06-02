import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface WorkflowHistoryEntry {
  step: string;
  timestamp: string;
  actor?: string;
  note?: string;
}

export interface Recertification {
  id: string;
  agency_id: string;
  tenant_id: string;
  assigned_to: string | null;
  type: string;
  due_date: string;
  status: string;
  document_checklist: unknown[];
  notes: string | null;
  completed_at: string | null;
  workflow_step: string;
  supervisor_id: string | null;
  workflow_history: WorkflowHistoryEntry[];
  created_at: string;
  updated_at: string;
}

export function useAgencyRecertifications(agencyId: string) {
  const [recertifications, setRecertifications] = useState<Recertification[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!agencyId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('agency_recertifications')
      .select('*')
      .eq('agency_id', agencyId)
      .order('due_date', { ascending: true });

    if (error) toast.error('Failed to load recertifications');
    setRecertifications((data as unknown as Recertification[]) || []);
    setLoading(false);
  }, [agencyId]);

  useEffect(() => { fetch(); }, [fetch]);

  const create = async (tenantId: string, type: string, dueDate: string) => {
    const { error } = await supabase.from('agency_recertifications').insert({
      agency_id: agencyId,
      tenant_id: tenantId,
      type: type as any,
      due_date: dueDate,
    } as any);
    if (error) { toast.error('Failed to create recertification'); return; }
    toast.success('Recertification created');
    fetch();
  };

  const updateStatus = async (id: string, status: string) => {
    const updates: Record<string, unknown> = { status };
    if (status === 'completed') updates.completed_at = new Date().toISOString();
    const { error } = await supabase.from('agency_recertifications').update(updates).eq('id', id);
    if (error) { toast.error('Failed to update status'); return; }
    toast.success(`Recertification ${status.replace('_', ' ')}`);
    fetch();
  };

  const advanceWorkflow = async (id: string, nextStep: string, note: string) => {
    const recert = recertifications.find(r => r.id === id);
    if (!recert) return;

    const historyEntry: WorkflowHistoryEntry = {
      step: nextStep,
      timestamp: new Date().toISOString(),
      note: note || undefined,
    };

    const currentHistory = Array.isArray(recert.workflow_history) ? recert.workflow_history : [];
    const newHistory = [...currentHistory, historyEntry];

    // Map workflow steps to status
    const stepToStatus: Record<string, string> = {
      initiated: 'upcoming',
      notice_sent: 'upcoming',
      docs_requested: 'documents_requested',
      under_review: 'under_review',
      supervisor_review: 'under_review',
      completed: 'completed',
      voucher_reissued: 'completed',
    };

    const updates: Record<string, unknown> = {
      workflow_step: nextStep,
      workflow_history: newHistory,
      status: stepToStatus[nextStep] || recert.status,
    };

    if (nextStep === 'completed') {
      updates.completed_at = new Date().toISOString();
    }

    if (nextStep === 'completed') {
      setTimeout(() => {
        toast.info('Reminder: Run a new rent calculation to update HAP amounts for this tenant', { duration: 8000 });
      }, 1500);
    }

    const { error } = await supabase
      .from('agency_recertifications')
      .update(updates)
      .eq('id', id);

    if (error) { toast.error('Failed to advance workflow'); return; }
    toast.success(`Advanced to: ${nextStep.replace(/_/g, ' ')}`);
    fetch();
  };

  return { recertifications, loading, refetch: fetch, create, updateStatus, advanceWorkflow };
}

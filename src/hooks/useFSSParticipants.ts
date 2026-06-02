import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ITSPGoal {
  id: string;
  category: string;
  description: string;
  target_date: string;
  status: 'not_started' | 'in_progress' | 'completed';
  completed_date?: string;
}

export interface FSSParticipant {
  id: string;
  agency_id: string;
  tenant_id: string;
  caseworker_id: string | null;
  enrollment_date: string;
  contract_end_date: string | null;
  status: string;
  baseline_rent: number;
  baseline_earned_income: number;
  itsp_goals: ITSPGoal[];
  notes: string | null;
  created_at: string;
  updated_at: string;
  tenant_name?: string;
  caseworker_name?: string;
}

export interface FSSEscrowEntry {
  id: string;
  participant_id: string;
  agency_id: string;
  month: string;
  earned_income: number;
  calculated_rent_increase: number;
  escrow_credit: number;
  running_balance: number;
  type: string;
  notes: string | null;
  created_at: string;
}

export function useFSSParticipants(agencyId: string) {
  const [participants, setParticipants] = useState<FSSParticipant[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchParticipants = useCallback(async () => {
    if (!agencyId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('agency_fss_participants')
      .select('*')
      .eq('agency_id', agencyId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching FSS participants:', error);
      toast.error('Failed to load FSS participants');
    } else {
      // Fetch tenant names
      const tenantIds = [...new Set((data || []).map((p: any) => p.tenant_id))];
      let tenantMap: Record<string, string> = {};
      if (tenantIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, first_name, last_name')
          .in('id', tenantIds);
        (profiles || []).forEach((p: any) => {
          tenantMap[p.id] = `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Unknown';
        });
      }

      setParticipants((data || []).map((p: any) => ({
        ...p,
        itsp_goals: Array.isArray(p.itsp_goals) ? p.itsp_goals : [],
        tenant_name: tenantMap[p.tenant_id] || 'Unknown',
      })));
    }
    setLoading(false);
  }, [agencyId]);

  useEffect(() => { fetchParticipants(); }, [fetchParticipants]);

  const enrollParticipant = async (data: {
    tenant_id: string;
    caseworker_id?: string;
    enrollment_date: string;
    contract_end_date: string;
    baseline_rent: number;
    baseline_earned_income: number;
    itsp_goals: ITSPGoal[];
    notes?: string;
  }) => {
    const { error } = await supabase.from('agency_fss_participants').insert({
      agency_id: agencyId,
      tenant_id: data.tenant_id,
      caseworker_id: data.caseworker_id || null,
      enrollment_date: data.enrollment_date,
      contract_end_date: data.contract_end_date,
      baseline_rent: data.baseline_rent,
      baseline_earned_income: data.baseline_earned_income,
      itsp_goals: data.itsp_goals as any,
      notes: data.notes || null,
      status: 'enrolled',
    });
    if (error) {
      toast.error('Failed to enroll participant');
      return false;
    }
    toast.success('Participant enrolled in FSS');
    fetchParticipants();
    return true;
  };

  const updateParticipant = async (id: string, updates: Partial<FSSParticipant>) => {
    const { error } = await supabase
      .from('agency_fss_participants')
      .update({
        ...(updates.status && { status: updates.status }),
        ...(updates.itsp_goals && { itsp_goals: updates.itsp_goals as any }),
        ...(updates.notes !== undefined && { notes: updates.notes }),
        ...(updates.contract_end_date && { contract_end_date: updates.contract_end_date }),
      })
      .eq('id', id);
    if (error) {
      toast.error('Failed to update participant');
      return false;
    }
    toast.success('Participant updated');
    fetchParticipants();
    return true;
  };

  // Escrow operations
  const fetchEscrow = async (participantId: string): Promise<FSSEscrowEntry[]> => {
    const { data, error } = await supabase
      .from('agency_fss_escrow')
      .select('*')
      .eq('participant_id', participantId)
      .order('month', { ascending: false });
    if (error) {
      console.error('Error fetching escrow:', error);
      return [];
    }
    return (data || []) as FSSEscrowEntry[];
  };

  const addEscrowEntry = async (entry: {
    participant_id: string;
    month: string;
    earned_income: number;
    calculated_rent_increase: number;
    escrow_credit: number;
    running_balance: number;
    type: string;
    notes?: string;
  }) => {
    const { error } = await supabase.from('agency_fss_escrow').insert({
      ...entry,
      agency_id: agencyId,
      notes: entry.notes || null,
    });
    if (error) {
      toast.error('Failed to add escrow entry');
      return false;
    }
    toast.success('Escrow entry added');
    return true;
  };

  // Summary stats
  const activeCount = participants.filter(p => ['enrolled', 'active'].includes(p.status)).length;
  const completedCount = participants.filter(p => p.status === 'completed').length;
  const totalParticipants = participants.length;

  return {
    participants,
    loading,
    enrollParticipant,
    updateParticipant,
    fetchEscrow,
    addEscrowEntry,
    refresh: fetchParticipants,
    activeCount,
    completedCount,
    totalParticipants,
  };
}

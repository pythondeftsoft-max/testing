import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface RftaPacket {
  id: string;
  tenant_id: string;
  landlord_id: string | null;
  property_id: string | null;
  unit_id: string | null;
  agency_id: string;
  status: string;
  packet_data: Record<string, unknown> | null;
  decision_notes: string | null;
  submitted_at: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

export function useRftaPackets(agencyId: string, role: string, staffId: string) {
  const [packets, setPackets] = useState<RftaPacket[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPackets = useCallback(async () => {
    if (!agencyId) return;
    setLoading(true);

    let query = supabase
      .from('rfta_packets')
      .select('*')
      .eq('agency_id', agencyId)
      .order('created_at', { ascending: false });

    if (role === 'caseworker') {
      const { data: assignments } = await supabase
        .from('caseworker_assignments')
        .select('tenant_id')
        .eq('caseworker_id', staffId)
        .eq('is_active', true);

      if (!assignments?.length) { setPackets([]); setLoading(false); return; }
      query = query.in('tenant_id', assignments.map(a => a.tenant_id));
    }

    const { data, error } = await query;
    if (error) toast.error('Failed to load RFTA packets');
    setPackets((data as unknown as RftaPacket[]) || []);
    setLoading(false);
  }, [agencyId, role, staffId]);

  useEffect(() => { fetchPackets(); }, [fetchPackets]);

  const updateStatus = async (packetId: string, status: string, notes?: string) => {
    const updates: Record<string, unknown> = { status };
    if (notes) updates.decision_notes = notes;
    if (status === 'under_review' || status === 'approved' || status === 'denied') {
      updates.reviewed_at = new Date().toISOString();
    }

    const { error } = await supabase.from('rfta_packets').update(updates).eq('id', packetId);
    if (error) { toast.error('Failed to update status'); return; }
    toast.success(`Packet ${status.replace('_', ' ')}`);
    fetchPackets();
  };

  return { packets, loading, refetch: fetchPackets, updateStatus };
}

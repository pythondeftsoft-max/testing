import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Shuffle, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Props {
  agencyId: string;
  onComplete: () => void;
}

const CaseloadAutoAssign: React.FC<Props> = ({ agencyId, onComplete }) => {
  const [assigning, setAssigning] = useState(false);

  const handleAutoAssign = async () => {
    setAssigning(true);
    try {
      // 1. Get all active caseworkers
      const { data: caseworkers } = await supabase
        .from('agency_staff')
        .select('user_id')
        .eq('agency_id', agencyId)
        .eq('role', 'caseworker' as any)
        .eq('is_active', true);

      if (!caseworkers?.length) {
        toast.error('No active caseworkers found');
        setAssigning(false);
        return;
      }

      // 2. Get current assignment counts per caseworker
      const { data: currentAssignments } = await (supabase
        .from('caseworker_assignments') as any)
        .select('caseworker_id')
        .eq('agency_id', agencyId)
        .eq('is_active', true);

      const counts: Record<string, number> = {};
      caseworkers.forEach(cw => { counts[cw.user_id] = 0; });
      (currentAssignments || []).forEach((a: any) => {
        if (counts[a.caseworker_id] !== undefined) counts[a.caseworker_id]++;
      });

      // 3. Get all agency tenants
      const { data: tenants } = await supabase
        .from('tenant_profiles')
        .select('user_id')
        .eq('housing_authority', agencyId);

      // 4. Get already-assigned tenant IDs
      const assignedIds = new Set((currentAssignments || []).map((a: any) => a.tenant_id));

      // 5. Filter to unassigned tenants
      const unassigned = (tenants || []).filter(t => !assignedIds.has(t.user_id));

      if (!unassigned.length) {
        toast.info('All tenants are already assigned');
        setAssigning(false);
        return;
      }

      // 6. Round-robin: sort caseworkers by count ascending, assign one-by-one
      let assigned = 0;
      for (const tenant of unassigned) {
        // Pick caseworker with lowest count
        const sorted = Object.entries(counts).sort((a, b) => a[1] - b[1]);
        const [cwId] = sorted[0];

        const { error } = await supabase.from('caseworker_assignments').insert({
          agency_id: agencyId,
          caseworker_id: cwId,
          tenant_id: tenant.user_id,
          is_active: true,
        } as any);

        if (!error) {
          counts[cwId]++;
          assigned++;
        }
      }

      toast.success(`Auto-assigned ${assigned} tenant(s) to ${caseworkers.length} caseworker(s)`);
      onComplete();
    } catch (err: any) {
      toast.error(`Auto-assign failed: ${err.message}`);
    } finally {
      setAssigning(false);
    }
  };

  return (
    <Button size="sm" variant="outline" onClick={handleAutoAssign} disabled={assigning} className="gap-1">
      {assigning ? <Loader2 className="h-3 w-3 animate-spin" /> : <Shuffle className="h-3 w-3" />}
      {assigning ? 'Assigning...' : 'Auto-Assign'}
    </Button>
  );
};

export default CaseloadAutoAssign;

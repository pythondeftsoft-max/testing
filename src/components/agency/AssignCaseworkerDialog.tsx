import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface AssignCaseworkerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agencyId: string;
  tenantUserId: string;
  tenantName: string;
  onAssigned: () => void;
}

const AssignCaseworkerDialog: React.FC<AssignCaseworkerDialogProps> = ({
  open, onOpenChange, agencyId, tenantUserId, tenantName, onAssigned,
}) => {
  const [caseworkers, setCaseworkers] = useState<{ user_id: string; name: string }[]>([]);
  const [selectedCw, setSelectedCw] = useState('');
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    if (open && agencyId) loadCaseworkers();
  }, [open, agencyId]);

  const loadCaseworkers = async () => {
    const { data } = await supabase
      .from('agency_staff')
      .select('user_id, profiles:user_id(full_name)')
      .eq('agency_id', agencyId)
      .eq('role', 'caseworker' as any)
      .eq('is_active', true);

    setCaseworkers((data || []).map((d: any) => ({
      user_id: d.user_id,
      name: d.profiles?.full_name || d.user_id.slice(0, 8),
    })));
  };

  const handleAssign = async () => {
    if (!selectedCw) { toast.error('Select a caseworker'); return; }
    setAssigning(true);

    // Deactivate existing assignments for this tenant
    await (supabase
      .from('caseworker_assignments') as any)
      .update({ is_active: false })
      .eq('tenant_id', tenantUserId)
      .eq('agency_id', agencyId);

    const { error } = await supabase.from('caseworker_assignments').insert({
      agency_id: agencyId,
      caseworker_id: selectedCw,
      tenant_id: tenantUserId,
      is_active: true,
    } as any);

    if (error) {
      toast.error('Failed to assign caseworker');
      setAssigning(false);
      return;
    }

    toast.success('Caseworker assigned');
    onAssigned();
    onOpenChange(false);
    setSelectedCw('');
    setAssigning(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign Caseworker to {tenantName}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Caseworker</Label>
            <Select value={selectedCw} onValueChange={setSelectedCw}>
              <SelectTrigger><SelectValue placeholder="Select caseworker" /></SelectTrigger>
              <SelectContent>
                {caseworkers.map(cw => (
                  <SelectItem key={cw.user_id} value={cw.user_id}>{cw.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleAssign} disabled={assigning}>
            {assigning ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Assigning...</> : 'Assign'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AssignCaseworkerDialog;

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface ScheduleInspectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agencyId: string;
  onCreated: () => void;
}

const INSPECTION_TYPES = ['initial', 'annual', 'special', 'reinspection', 'quality_control', 'move_in', 'move_out'];

const ScheduleInspectionDialog: React.FC<ScheduleInspectionDialogProps> = ({ open, onOpenChange, agencyId, onCreated }) => {
  const [propertyId, setPropertyId] = useState('');
  const [unitId, setUnitId] = useState('');
  const [inspectorId, setInspectorId] = useState('');
  const [tenantId, setTenantId] = useState('');
  const [hapContractId, setHapContractId] = useState('');
  const [inspectionType, setInspectionType] = useState('annual');
  const [scheduledDate, setScheduledDate] = useState('');
  const [inspectors, setInspectors] = useState<{ user_id: string; name: string }[]>([]);
  const [hapContracts, setHapContracts] = useState<{ id: string; tenant_id: string | null; property_address: string | null }[]>([]);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (open && agencyId) {
      loadInspectors();
      loadHapContracts();
    }
  }, [open, agencyId]);

  const loadInspectors = async () => {
    const { data } = await supabase
      .from('agency_staff')
      .select('user_id, profiles:user_id(full_name)')
      .eq('agency_id', agencyId)
      .eq('role', 'inspector' as any)
      .eq('is_active', true);

    setInspectors((data || []).map((d: any) => ({
      user_id: d.user_id,
      name: d.profiles?.full_name || d.user_id.slice(0, 8),
    })));
  };

  const loadHapContracts = async () => {
    const { data } = await supabase
      .from('agency_hap_contracts')
      .select('id, tenant_id, property_address')
      .eq('agency_id', agencyId)
      .eq('status', 'active')
      .limit(200);
    setHapContracts((data || []) as any);
  };

  const handleHapPick = (id: string) => {
    setHapContractId(id);
    const c = hapContracts.find(c => c.id === id);
    if (c?.tenant_id) setTenantId(c.tenant_id);
  };

  const handleCreate = async () => {
    if (!scheduledDate) {
      toast.error('Scheduled date is required');
      return;
    }
    setCreating(true);

    const { error } = await supabase.from('inspections').insert({
      agency_id: agencyId,
      property_id: propertyId.trim() || null,
      unit_id: unitId.trim() || null,
      inspector_id: inspectorId || null,
      tenant_id: tenantId || null,
      hap_contract_id: hapContractId || null,
      inspection_type: inspectionType,
      scheduled_date: scheduledDate,
      status: 'scheduled',
    } as any);

    if (error) {
      toast.error('Failed to schedule inspection');
      setCreating(false);
      return;
    }

    toast.success('Inspection scheduled');
    onCreated();
    onOpenChange(false);
    setPropertyId('');
    setUnitId('');
    setInspectorId('');
    setTenantId('');
    setHapContractId('');
    setInspectionType('annual');
    setScheduledDate('');
    setCreating(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Schedule Inspection</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Type</Label>
              <Select value={inspectionType} onValueChange={setInspectionType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {INSPECTION_TYPES.map(t => <SelectItem key={t} value={t}>{t.replace(/_/g, ' ')}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Scheduled Date *</Label>
              <Input type="date" value={scheduledDate} onChange={e => setScheduledDate(e.target.value)} />
            </div>
          </div>

          <div>
            <Label>HAP Contract (auto-fills tenant)</Label>
            <Select value={hapContractId} onValueChange={handleHapPick}>
              <SelectTrigger><SelectValue placeholder="Select active HAP contract" /></SelectTrigger>
              <SelectContent>
                {hapContracts.map(c => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.property_address || c.id.slice(0, 8)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Inspector</Label>
            <Select value={inspectorId} onValueChange={setInspectorId}>
              <SelectTrigger><SelectValue placeholder="Select inspector" /></SelectTrigger>
              <SelectContent>
                {inspectors.map(i => (
                  <SelectItem key={i.user_id} value={i.user_id}>{i.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div><Label>Property ID (optional)</Label><Input value={propertyId} onChange={e => setPropertyId(e.target.value)} placeholder="UUID" /></div>
            <div><Label>Unit ID (optional)</Label><Input value={unitId} onChange={e => setUnitId(e.target.value)} placeholder="UUID" /></div>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleCreate} disabled={creating}>
            {creating ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Scheduling...</> : 'Schedule'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ScheduleInspectionDialog;

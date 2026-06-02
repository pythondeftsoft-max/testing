import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface NewHearingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agencyId: string;
  onCreated: () => void;
}

const NewHearingDialog: React.FC<NewHearingDialogProps> = ({ open, onOpenChange, agencyId, onCreated }) => {
  const [tenantId, setTenantId] = useState('');
  const [hearingType, setHearingType] = useState('other');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [tenants, setTenants] = useState<{ user_id: string; name: string }[]>([]);
  const [loadingTenants, setLoadingTenants] = useState(false);

  React.useEffect(() => {
    if (!open) return;
    setLoadingTenants(true);
    supabase
      .from('tenant_profiles')
      .select('user_id, profiles:user_id(full_name)')
      .eq('agency_id', agencyId)
      .limit(200)
      .then(({ data }) => {
        setTenants(
          (data || []).map((t: any) => ({
            user_id: t.user_id,
            name: t.profiles?.full_name || t.user_id.slice(0, 8),
          }))
        );
        setLoadingTenants(false);
      });
  }, [open, agencyId]);

  const handleSubmit = async () => {
    if (!tenantId) { toast.error('Select a tenant'); return; }
    setSaving(true);
    const { error } = await supabase.from('agency_hearings').insert({
      agency_id: agencyId,
      tenant_id: tenantId,
      hearing_type: hearingType,
      notes: notes || null,
    } as any);
    setSaving(false);
    if (error) { toast.error('Failed to create hearing'); return; }
    toast.success('Hearing request created');
    setTenantId('');
    setHearingType('other');
    setNotes('');
    onCreated();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New Hearing Request</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Tenant</Label>
            <Select value={tenantId} onValueChange={setTenantId}>
              <SelectTrigger>
                <SelectValue placeholder={loadingTenants ? 'Loading...' : 'Select tenant'} />
              </SelectTrigger>
              <SelectContent>
                {tenants.map(t => (
                  <SelectItem key={t.user_id} value={t.user_id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Hearing Type</Label>
            <Select value={hearingType} onValueChange={setHearingType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="termination">Termination</SelectItem>
                <SelectItem value="rent_reduction">Rent Reduction</SelectItem>
                <SelectItem value="denial">Denial</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Reason for hearing request..." />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={saving}>{saving ? 'Creating...' : 'Create Hearing'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default NewHearingDialog;

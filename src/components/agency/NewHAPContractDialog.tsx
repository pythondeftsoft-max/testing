import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agencyId: string;
  onCreated: () => void;
}

const NewHAPContractDialog: React.FC<Props> = ({ open, onOpenChange, agencyId, onCreated }) => {
  const [tenantId, setTenantId] = useState('');
  const [contractNumber, setContractNumber] = useState('');
  const [propertyAddress, setPropertyAddress] = useState('');
  const [hapAmount, setHapAmount] = useState('');
  const [tenantRent, setTenantRent] = useState('');
  const [grossRent, setGrossRent] = useState('');
  const [utilityAllowance, setUtilityAllowance] = useState('');
  const [bedroomCount, setBedroomCount] = useState('');
  const [effectiveDate, setEffectiveDate] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [tenants, setTenants] = useState<{ user_id: string; name: string }[]>([]);

  useEffect(() => {
    if (!open) return;
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
      });
  }, [open, agencyId]);

  const handleSubmit = async () => {
    if (!tenantId) { toast.error('Select a tenant'); return; }
    setSaving(true);
    const { error } = await supabase.from('agency_hap_contracts').insert({
      agency_id: agencyId,
      tenant_id: tenantId,
      contract_number: contractNumber || null,
      property_address: propertyAddress || null,
      hap_amount: hapAmount ? parseFloat(hapAmount) : null,
      tenant_rent: tenantRent ? parseFloat(tenantRent) : null,
      gross_rent: grossRent ? parseFloat(grossRent) : null,
      utility_allowance: utilityAllowance ? parseFloat(utilityAllowance) : null,
      bedroom_count: bedroomCount ? parseInt(bedroomCount) : null,
      effective_date: effectiveDate || null,
      notes: notes || null,
    } as any);
    setSaving(false);
    if (error) { toast.error('Failed to create contract'); return; }
    toast.success('HAP Contract created');
    onCreated();
    onOpenChange(false);
    // reset
    setTenantId(''); setContractNumber(''); setPropertyAddress('');
    setHapAmount(''); setTenantRent(''); setGrossRent('');
    setUtilityAllowance(''); setBedroomCount(''); setEffectiveDate(''); setNotes('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New HAP Contract</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Tenant</Label>
            <Select value={tenantId} onValueChange={setTenantId}>
              <SelectTrigger><SelectValue placeholder="Select tenant" /></SelectTrigger>
              <SelectContent>
                {tenants.map(t => (
                  <SelectItem key={t.user_id} value={t.user_id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Contract #</Label>
              <Input value={contractNumber} onChange={e => setContractNumber(e.target.value)} placeholder="HAP-2026-001" />
            </div>
            <div>
              <Label>Effective Date</Label>
              <Input type="date" value={effectiveDate} onChange={e => setEffectiveDate(e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Property Address</Label>
            <Input value={propertyAddress} onChange={e => setPropertyAddress(e.target.value)} placeholder="123 Main St, Apt 4B" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>HAP Amount</Label>
              <Input type="number" value={hapAmount} onChange={e => setHapAmount(e.target.value)} placeholder="0.00" />
            </div>
            <div>
              <Label>Tenant Rent</Label>
              <Input type="number" value={tenantRent} onChange={e => setTenantRent(e.target.value)} placeholder="0.00" />
            </div>
            <div>
              <Label>Gross Rent</Label>
              <Input type="number" value={grossRent} onChange={e => setGrossRent(e.target.value)} placeholder="0.00" />
            </div>
            <div>
              <Label>Utility Allowance</Label>
              <Input type="number" value={utilityAllowance} onChange={e => setUtilityAllowance(e.target.value)} placeholder="0.00" />
            </div>
          </div>
          <div>
            <Label>Bedrooms</Label>
            <Select value={bedroomCount} onValueChange={setBedroomCount}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                {[0,1,2,3,4,5,6].map(n => (
                  <SelectItem key={n} value={String(n)}>{n === 0 ? 'Studio' : `${n} BR`}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={saving}>{saving ? 'Creating...' : 'Create Contract'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default NewHAPContractDialog;

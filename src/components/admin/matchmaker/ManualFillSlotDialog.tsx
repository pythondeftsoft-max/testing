import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useAdminManualFillPushSlot } from '@/hooks/useAdminManualPipeline';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  unitId: string;
  unitLabel?: string;
  defaultRent?: number | null;
  isAdminListed?: boolean;
}

type Stage = 'interested' | 'lease_signed' | 'housed_paid';

export const ManualFillSlotDialog: React.FC<Props> = ({
  open, onOpenChange, unitId, unitLabel, defaultRent, isAdminListed,
}) => {
  const [search, setSearch] = useState('');
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [stage, setStage] = useState<Stage>('interested');
  const [leaseStart, setLeaseStart] = useState<string>('');
  const [leaseEnd, setLeaseEnd] = useState<string>('');
  const [rent, setRent] = useState<string>(defaultRent ? String(defaultRent) : '');
  const [reason, setReason] = useState('');

  const { mutate, isPending } = useAdminManualFillPushSlot();

  const { data: tenants } = useQuery({
    queryKey: ['manual-fill-tenant-search', search],
    enabled: open && search.length >= 2,
    queryFn: async () => {
      const term = `%${search}%`;
      const { data } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email, housing_status')
        .or(`first_name.ilike.${term},last_name.ilike.${term},email.ilike.${term}`)
        .limit(15);
      return data || [];
    },
  });

  const handleSubmit = () => {
    if (!tenantId || reason.trim().length < 3) return;
    mutate(
      {
        unitId,
        tenantId,
        targetStage: stage,
        leaseStart: leaseStart || null,
        leaseEnd: leaseEnd || null,
        monthlyRent: rent ? Number(rent) : null,
        reason,
      },
      { onSuccess: () => { onOpenChange(false); reset(); } },
    );
  };

  const reset = () => {
    setSearch(''); setTenantId(null); setStage('interested');
    setLeaseStart(''); setLeaseEnd(''); setReason('');
  };

  const showLeaseFields = stage !== 'interested';

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) reset(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Manually fill push slot</DialogTitle>
          <DialogDescription>
            Attach a tenant you matched off-platform to {unitLabel || 'this unit'}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Tenant</Label>
            <Input
              placeholder="Search by name or email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {tenants && tenants.length > 0 && (
              <div className="mt-2 max-h-48 overflow-y-auto border rounded-md divide-y">
                {tenants.map((t: any) => {
                  const name = `${t.first_name || ''} ${t.last_name || ''}`.trim() || t.email;
                  const selected = tenantId === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setTenantId(t.id)}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-muted ${selected ? 'bg-muted' : ''}`}
                    >
                      <div className="font-medium">{name}</div>
                      <div className="text-xs text-muted-foreground">{t.email} · {t.housing_status}</div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div>
            <Label>How far did this match go?</Label>
            <RadioGroup value={stage} onValueChange={(v) => setStage(v as Stage)} className="mt-2 space-y-2">
              <div className="flex items-start gap-2">
                <RadioGroupItem value="interested" id="s-interested" />
                <Label htmlFor="s-interested" className="font-normal cursor-pointer">
                  Interested — just attach to slot
                </Label>
              </div>
              <div className="flex items-start gap-2">
                <RadioGroupItem value="lease_signed" id="s-lease" />
                <Label htmlFor="s-lease" className="font-normal cursor-pointer">
                  {isAdminListed
                    ? 'Lease signed — record fee for admin to collect (no link sent)'
                    : 'Lease signed — send landlord payment link'}
                </Label>
              </div>
              <div className="flex items-start gap-2">
                <RadioGroupItem value="housed_paid" id="s-paid" />
                <Label htmlFor="s-paid" className="font-normal cursor-pointer">
                  Already paid &amp; housed
                </Label>
              </div>
            </RadioGroup>
          </div>

          {showLeaseFields && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Lease start</Label>
                <Input type="date" value={leaseStart} onChange={(e) => setLeaseStart(e.target.value)} />
              </div>
              <div>
                <Label>Lease end</Label>
                <Input type="date" value={leaseEnd} onChange={(e) => setLeaseEnd(e.target.value)} />
              </div>
              <div className="col-span-2">
                <Label>Monthly rent</Label>
                <Input type="number" value={rent} onChange={(e) => setRent(e.target.value)} placeholder="$" />
              </div>
            </div>
          )}

          <div>
            <Label>Reason / notes (required)</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Matched via SMS Tuesday; landlord confirmed lease signed."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!tenantId || reason.trim().length < 3 || isPending}>
            {isPending ? 'Saving…' : 'Confirm'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ManualFillSlotDialog;

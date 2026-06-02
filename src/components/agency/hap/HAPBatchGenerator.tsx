import React, { useState } from 'react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agencyId: string;
  onGenerate: (periodMonth: string, batchNumber: string) => Promise<any>;
  checkDuplicate: (periodMonth: string) => Promise<any[]>;
}

const HAPBatchGenerator: React.FC<Props> = ({ open, onOpenChange, agencyId, onGenerate, checkDuplicate }) => {
  const now = new Date();
  const [month, setMonth] = useState(format(now, 'yyyy-MM'));
  const [generating, setGenerating] = useState(false);
  const [preview, setPreview] = useState<{ leaseCount: number; totalHAP: number } | null>(null);
  const [duplicates, setDuplicates] = useState<any[]>([]);
  const [previewing, setPreviewing] = useState(false);

  const periodMonth = `${month}-01`;

  const handlePreview = async () => {
    setPreviewing(true);
    const dupes = await checkDuplicate(periodMonth);
    setDuplicates(dupes);

    const { data, error } = await supabase
      .from('tenant_leases')
      .select('id, hap_portion, monthly_rent, tenant_portion')
      .eq('agency_id', agencyId)
      .eq('lease_category', 'voucher')
      .eq('status', 'active');

    if (error) { toast.error('Failed to preview leases'); setPreviewing(false); return; }
    const totalHAP = (data || []).reduce((s: number, l: any) => s + (l.hap_portion || 0), 0);
    setPreview({ leaseCount: data?.length || 0, totalHAP });
    setPreviewing(false);
  };

  const handleGenerate = async () => {
    setGenerating(true);
    const batchNum = `HAP-${month.replace('-', '')}-${String((duplicates.length || 0) + 1).padStart(3, '0')}`;
    const batch = await onGenerate(periodMonth, batchNum);

    if (batch) {
      // Fetch active leases
      const { data: leases } = await supabase
        .from('tenant_leases')
        .select('id, tenant_id, landlord_id, unit_id, hap_portion, tenant_portion, monthly_rent')
        .eq('agency_id', agencyId)
        .eq('lease_category', 'voucher')
        .eq('status', 'active');

      // Fetch active HAP contracts to prefer their amounts
      const { data: hapContracts } = await supabase
        .from('agency_hap_contracts')
        .select('tenant_id, hap_amount, tenant_rent, gross_rent, utility_allowance')
        .eq('agency_id', agencyId)
        .eq('status', 'active');

      // Approved special claims not yet batched
      const { data: claims } = await supabase
        .from('agency_special_claims')
        .select('id, landlord_id, tenant_id, unit_id, approved_amount')
        .eq('agency_id', agencyId)
        .eq('status', 'approved')
        .is('included_in_batch_id', null);

      const contractMap = new Map<string, any>();
      (hapContracts || []).forEach((c: any) => contractMap.set(c.tenant_id, c));

      const items: any[] = [];
      if (leases && leases.length > 0) {
        leases.forEach((l: any) => {
          const contract = contractMap.get(l.tenant_id);
          items.push({
            batch_id: batch.id,
            tenant_lease_id: l.id,
            landlord_id: l.landlord_id,
            unit_id: l.unit_id,
            tenant_id: l.tenant_id,
            voucher_id: null,
            hap_amount: contract?.hap_amount ?? l.hap_portion ?? 0,
            tenant_portion: contract?.tenant_rent ?? l.tenant_portion ?? 0,
            gross_rent: contract?.gross_rent ?? l.monthly_rent ?? 0,
            utility_allowance: contract?.utility_allowance ?? 0,
            adjustment_amount: 0,
            status: 'included',
            item_type: 'monthly_hap',
          });
        });
      }

      // Add special claims as batch line items
      (claims || []).forEach((c: any) => {
        items.push({
          batch_id: batch.id,
          tenant_lease_id: null,
          landlord_id: c.landlord_id,
          unit_id: c.unit_id,
          tenant_id: c.tenant_id,
          voucher_id: null,
          hap_amount: Number(c.approved_amount || 0),
          tenant_portion: 0,
          gross_rent: Number(c.approved_amount || 0),
          utility_allowance: 0,
          adjustment_amount: 0,
          status: 'included',
          item_type: 'special_claim',
          source_claim_id: c.id,
        });
      });

      if (items.length > 0) {
        await supabase.from('hap_batch_items').insert(items);

        // Stamp claims as included
        if (claims && claims.length > 0) {
          await supabase
            .from('agency_special_claims')
            .update({ included_in_batch_id: batch.id, included_at: new Date().toISOString() })
            .in('id', claims.map((c: any) => c.id));
        }

        const uniqueLandlords = new Set(items.map((i: any) => i.landlord_id).filter(Boolean));
        const totalAmount = items.reduce((s: number, i: any) => s + Number(i.hap_amount || 0), 0);

        await supabase
          .from('hap_payment_batches')
          .update({
            total_amount: totalAmount,
            total_units: items.length,
            total_landlords: uniqueLandlords.size,
          })
          .eq('id', batch.id);
      }

      onOpenChange(false);
      setPreview(null);
      setDuplicates([]);
    }
    setGenerating(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Generate HAP Batch</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Payment Period</Label>
            <Input type="month" value={month} onChange={e => { setMonth(e.target.value); setPreview(null); }} />
          </div>

          {!preview && (
            <Button onClick={handlePreview} disabled={previewing} className="w-full">
              {previewing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Preview Batch
            </Button>
          )}

          {preview && (
            <div className="rounded-lg border p-4 space-y-2">
              <p className="text-sm"><strong>Active voucher leases:</strong> {preview.leaseCount}</p>
              <p className="text-sm"><strong>Estimated HAP total:</strong> ${preview.totalHAP.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>

              {duplicates.length > 0 && (
                <div className="flex items-start gap-2 rounded-md bg-destructive/10 p-3 text-sm">
                  <AlertTriangle className="w-4 h-4 text-destructive mt-0.5" />
                  <span>A batch already exists for this period ({duplicates.map((d: any) => d.batch_number).join(', ')}). This will create an additional batch.</span>
                </div>
              )}

              {preview.leaseCount === 0 && (
                <p className="text-sm text-muted-foreground">No active voucher leases found. The batch will be empty.</p>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleGenerate} disabled={!preview || generating}>
            {generating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Generate Batch
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default HAPBatchGenerator;

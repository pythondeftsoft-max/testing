import React, { useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { FileText, Upload, Download, Loader2, ScrollText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { LiveCustomerStats } from '@/hooks/useLiveCustomerStats';

interface Props {
  agencyId: string;
  contract: LiveCustomerStats['contract'];
}

const TERM_OPTIONS = [
  { value: '0', label: 'Month-to-month' },
  { value: '12', label: '1 year' },
  { value: '24', label: '2 years' },
  { value: '36', label: '3 years' },
  { value: '60', label: '5 years' },
  { value: '120', label: '10 years' },
];

function addMonths(dateStr: string, months: number): string {
  const d = new Date(dateStr);
  d.setMonth(d.getMonth() + months);
  // subtract one day to be inclusive end
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

export const ContractCard: React.FC<Props> = ({ agencyId, contract }) => {
  const qc = useQueryClient();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const termValue = String(contract?.term_months ?? 0);
  const startStr = contract?.contract_start ?? '';

  const updateMut = useMutation({
    mutationFn: async (patch: Record<string, any>) => {
      if (!contract?.id) {
        // Create a stub contract on first edit
        const { error } = await supabase
          .from('agency_contracts')
          .insert({ agency_id: agencyId, status: 'active', ...patch });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('agency_contracts')
          .update(patch)
          .eq('id', contract.id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['live-customer-stats', agencyId] });
      toast({ title: 'Contract updated' });
    },
    onError: (e: any) => toast({ title: 'Update failed', description: e.message, variant: 'destructive' }),
  });

  const handleTermChange = (v: string) => {
    const months = Number(v);
    const patch: Record<string, any> = { term_months: months || null };
    if (startStr && months > 0) patch.contract_end = addMonths(startStr, months);
    if (months === 0) patch.contract_end = null;
    updateMut.mutate(patch);
  };

  const handleStartChange = (v: string) => {
    const patch: Record<string, any> = { contract_start: v || null };
    const months = contract?.term_months || 0;
    if (v && months > 0) patch.contract_end = addMonths(v, months);
    updateMut.mutate(patch);
  };

  const handleAutoRenew = (checked: boolean) => {
    updateMut.mutate({ auto_renew: checked });
  };

  const handleUpload = async (file: File) => {
    if (!file) return;
    setUploading(true);
    try {
      const path = `${agencyId}/${Date.now()}-${file.name.replace(/[^a-z0-9._-]/gi, '_')}`;
      const { error: upErr } = await supabase.storage
        .from('agency-contracts')
        .upload(path, file, { contentType: file.type || 'application/pdf', upsert: false });
      if (upErr) throw upErr;
      const patch = { signed_pdf_url: path, signed_at: new Date().toISOString() };
      if (contract?.id) {
        await supabase.from('agency_contracts').update(patch).eq('id', contract.id);
      } else {
        await supabase.from('agency_contracts').insert({ agency_id: agencyId, status: 'active', ...patch });
      }
      qc.invalidateQueries({ queryKey: ['live-customer-stats', agencyId] });
      toast({ title: 'Contract uploaded' });
    } catch (e: any) {
      toast({ title: 'Upload failed', description: e.message, variant: 'destructive' });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleDownload = async () => {
    if (!contract?.signed_pdf_url) return;
    const { data, error } = await supabase.storage
      .from('agency-contracts')
      .createSignedUrl(contract.signed_pdf_url, 300);
    if (error || !data?.signedUrl) {
      toast({ title: 'Download failed', description: error?.message, variant: 'destructive' });
      return;
    }
    window.open(data.signedUrl, '_blank');
  };

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <ScrollText className="h-4 w-4 text-primary" /> Contract
      </div>

      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Term length</Label>
        <Select value={termValue} onValueChange={handleTermChange}>
          <SelectTrigger className="h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TERM_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Start</Label>
          <Input
            type="date"
            className="h-9"
            value={contract?.contract_start ?? ''}
            onChange={(e) => handleStartChange(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">End</Label>
          <Input
            type="date"
            className="h-9"
            value={contract?.contract_end ?? ''}
            disabled
          />
        </div>
      </div>

      <div className="flex items-center justify-between pt-1">
        <Label className="text-xs">Auto-renew</Label>
        <Switch
          checked={!!contract?.auto_renew}
          onCheckedChange={handleAutoRenew}
        />
      </div>

      <div className="pt-2 border-t space-y-2">
        <Label className="text-xs text-muted-foreground">Signed PDF</Label>
        <div className="flex items-center gap-2">
          {contract?.signed_pdf_url ? (
            <Button size="sm" variant="outline" onClick={handleDownload} className="flex-1">
              <Download className="h-3.5 w-3.5 mr-1" /> Download
            </Button>
          ) : (
            <div className="flex-1 text-xs text-muted-foreground flex items-center gap-1">
              <FileText className="h-3.5 w-3.5" /> No file uploaded
            </div>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
            <span className="ml-1">{contract?.signed_pdf_url ? 'Replace' : 'Upload'}</span>
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
          />
        </div>
        {contract?.signed_at && (
          <p className="text-[11px] text-muted-foreground">
            Signed {new Date(contract.signed_at).toLocaleDateString()}
          </p>
        )}
      </div>
    </Card>
  );
};

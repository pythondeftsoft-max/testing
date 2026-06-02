import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FileText, Loader2, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import {
  computeAgencyCost,
  DEFAULT_ASSUMPTIONS,
  type AgencyInputs,
} from '@/lib/cost-model';

interface Lead {
  id: string;
  agency_name: string;
  contact_name: string;
  contact_email: string;
  voucher_count: number | null;
  proposal_pdf_url?: string | null;
  proposal_amount?: number | null;
  proposal_sent_at?: string | null;
}

export const LeadProposalGenerator: React.FC<{ lead: Lead }> = ({ lead }) => {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [voucherCount, setVoucherCount] = useState(lead.voucher_count?.toString() || '500');
  const [monthlyPrice, setMonthlyPrice] = useState(() => {
    // suggest a default price floor from cost model
    const v = lead.voucher_count || 500;
    const inputs: AgencyInputs = {
      caseworkers: Math.max(2, Math.round(v / 100)),
      inspectors: Math.max(1, Math.round(v / 250)),
      admins: 2,
      activeLandlords: Math.round(v * 0.6),
      activeVouchers: v,
      pendingApplications: Math.round(v * 0.5),
      monthlyRftas: Math.round(v / 12),
      monthlyInspections: Math.round(v / 12),
      monthlyRecerts: Math.round(v / 12),
      monthlyHapDisbursements: v,
      monthlyEmails: v * 4,
      monthlySms: v,
      monthlyAiOcrPages: Math.round(v / 4),
    };
    const result = computeAgencyCost(inputs, DEFAULT_ASSUMPTIONS);
    return Math.max(2500, Math.round(result.total * DEFAULT_ASSUMPTIONS.markupMultiplier / 50) * 50).toString();
  });
  const [generating, setGenerating] = useState(false);

  const generate = async () => {
    const v = parseInt(voucherCount, 10) || 0;
    const price = parseFloat(monthlyPrice) || 0;
    if (price < 100) {
      toast({ title: 'Set a price first', variant: 'destructive' });
      return;
    }
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-lead-proposal', {
        body: {
          lead_id: lead.id,
          agency_name: lead.agency_name,
          contact_name: lead.contact_name,
          contact_email: lead.contact_email,
          voucher_count: v,
          monthly_price: price,
        },
      });
      if (error || !data?.success) throw new Error(data?.error || error?.message || 'Generation failed');
      qc.invalidateQueries({ queryKey: ['agency_lead', lead.id] });
      qc.invalidateQueries({ queryKey: ['agency_lead_activities', lead.id] });
      toast({ title: 'Proposal generated', description: 'PDF ready to share with the agency.' });
      if (data.pdf_url) window.open(data.pdf_url, '_blank');
    } catch (e: any) {
      toast({ title: 'Failed', description: e.message, variant: 'destructive' });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-3 border rounded-lg p-4 bg-muted/20">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <FileText className="h-4 w-4" /> Proposal Generator
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-xs">Voucher Count</Label>
          <Input
            type="number"
            value={voucherCount}
            onChange={(e) => setVoucherCount(e.target.value)}
            min={0}
          />
        </div>
        <div>
          <Label className="text-xs">Monthly Price ($)</Label>
          <Input
            type="number"
            value={monthlyPrice}
            onChange={(e) => setMonthlyPrice(e.target.value)}
            min={0}
            step={50}
          />
        </div>
      </div>
      <Button onClick={generate} disabled={generating} className="w-full">
        {generating ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Generating PDF...</> : 'Generate Proposal PDF'}
      </Button>
      {lead.proposal_pdf_url && (
        <div className="text-xs text-muted-foreground border-t pt-2 space-y-1">
          <div>
            Last generated: {lead.proposal_sent_at ? new Date(lead.proposal_sent_at).toLocaleString() : '—'}
          </div>
          <div>Amount: ${lead.proposal_amount?.toLocaleString() || '—'}/mo</div>
          <a
            href={lead.proposal_pdf_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline inline-flex items-center gap-1"
          >
            View latest PDF <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      )}
    </div>
  );
};

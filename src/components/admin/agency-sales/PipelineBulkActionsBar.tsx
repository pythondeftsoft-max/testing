import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Mail, ChevronDown, X, CalendarClock, Download, Loader2 } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { PIPELINE_STAGES, stageToLeadStatus, stageToProspectStatus, type PipelineCard, type PipelineStage } from './usePipelineData';
import { BulkEmailDialog } from './BulkEmailDialog';

interface Props {
  selected: PipelineCard[];
  onClear: () => void;
}

export function PipelineBulkActionsBar({ selected, onClear }: Props) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [emailOpen, setEmailOpen] = useState(false);
  const [followUpDate, setFollowUpDate] = useState<Date | undefined>();

  const bulkMoveStage = useMutation({
    mutationFn: async (to: PipelineStage) => {
      const leads = selected.filter((c) => c.source === 'lead');
      const prospects = selected.filter((c) => c.source === 'prospect');
      const ops: Array<Promise<{ error: any }>> = [];
      if (leads.length) {
        ops.push(
          (async () => await supabase.from('agency_leads').update({ status: stageToLeadStatus(to) as any }).in('id', leads.map((l) => l.id)))()
        );
      }
      if (prospects.length) {
        ops.push(
          (async () => await supabase.from('pha_prospect_status').update({ status: stageToProspectStatus(to) as any }).in('id', prospects.map((p) => p.id)))()
        );
      }
      const results = await Promise.all(ops);
      const err = results.find((r) => r.error);
      if (err?.error) throw err.error;
    },
    onSuccess: (_d, to) => {
      toast({ title: 'Moved', description: `${selected.length} card${selected.length === 1 ? '' : 's'} → ${PIPELINE_STAGES.find((s) => s.id === to)?.label}` });
      qc.invalidateQueries({ queryKey: ['agency-sales'] });
      onClear();
    },
    onError: (e: any) => toast({ title: 'Move failed', description: e.message, variant: 'destructive' }),
  });

  const bulkSetFollowUp = useMutation({
    mutationFn: async (date: Date) => {
      const iso = date.toISOString();
      const leads = selected.filter((c) => c.source === 'lead');
      const prospects = selected.filter((c) => c.source === 'prospect');
      const ops: Array<Promise<{ error: any }>> = [];
      if (leads.length) {
        ops.push((async () => await supabase.from('agency_leads').update({ next_follow_up_at: iso }).in('id', leads.map((l) => l.id)))());
      }
      if (prospects.length) {
        ops.push((async () => await supabase.from('pha_prospect_status').update({ next_action_at: iso }).in('id', prospects.map((p) => p.id)))());
      }
      const results = await Promise.all(ops);
      const err = results.find((r) => r.error);
      if (err?.error) throw err.error;
    },
    onSuccess: () => {
      toast({ title: 'Follow-up set', description: `${selected.length} card${selected.length === 1 ? '' : 's'} updated` });
      qc.invalidateQueries({ queryKey: ['agency-sales'] });
      setFollowUpDate(undefined);
    },
    onError: (e: any) => toast({ title: 'Update failed', description: e.message, variant: 'destructive' }),
  });

  const exportCsv = () => {
    const headers = ['Agency', 'Source', 'Stage', 'State', 'Vouchers', 'Contact', 'Email', 'Phone', 'Quote', 'Days in stage', 'Next action'];
    const rows = selected.map((c) => [
      c.agency_name,
      c.source,
      c.stage,
      c.agency_state ?? '',
      c.voucher_count ?? '',
      c.contact_name ?? c.ed_name ?? '',
      c.contact_email ?? '',
      c.contact_phone ?? '',
      c.proposal_amount ?? '',
      c.days_in_stage ?? '',
      c.next_action_at ?? '',
    ]);
    const csv = [headers, ...rows].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pipeline-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (selected.length === 0) return null;

  return (
    <>
      <div className="sticky top-0 z-20 flex items-center gap-2 rounded-lg border bg-card px-3 py-2 shadow-sm">
        <Badge variant="default" className="h-6">{selected.length} selected</Badge>

        <Button size="sm" variant="outline" className="h-8" onClick={() => setEmailOpen(true)}>
          <Mail className="h-3.5 w-3.5 mr-1" /> Email
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="outline" className="h-8" disabled={bulkMoveStage.isPending}>
              {bulkMoveStage.isPending ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : null}
              Move to <ChevronDown className="h-3 w-3 ml-1" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuLabel>Move to stage</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {PIPELINE_STAGES.map((s) => (
              <DropdownMenuItem key={s.id} onClick={() => bulkMoveStage.mutate(s.id)}>
                {s.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <Popover>
          <PopoverTrigger asChild>
            <Button size="sm" variant="outline" className="h-8">
              <CalendarClock className="h-3.5 w-3.5 mr-1" /> Follow-up
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={followUpDate}
              onSelect={(d) => { if (d) { setFollowUpDate(d); bulkSetFollowUp.mutate(d); } }}
              initialFocus
            />
          </PopoverContent>
        </Popover>

        <Button size="sm" variant="outline" className="h-8" onClick={exportCsv}>
          <Download className="h-3.5 w-3.5 mr-1" /> CSV
        </Button>

        <Button size="sm" variant="ghost" className="h-8 ml-auto" onClick={onClear}>
          <X className="h-3.5 w-3.5 mr-1" /> Clear
        </Button>
      </div>

      <BulkEmailDialog open={emailOpen} onOpenChange={setEmailOpen} recipients={selected} />
    </>
  );
}

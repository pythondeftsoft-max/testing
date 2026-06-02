import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Loader2, ExternalLink, FileText, AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import PicValidationWizard from './pic/PicValidationWizard';
import PicResponseDialog from './pic/PicResponseDialog';
import PicTransmitDialog from './pic/PicTransmitDialog';
import PicSettingsCard from './pic/PicSettingsCard';

interface PicSubmission {
  id: string;
  batch_reference: string;
  submission_period: string | null;
  record_count: number;
  accepted_count: number;
  rejected_count: number;
  status: string;
  submitted_at: string | null;
  hud_response_received_at: string | null;
  hud_response_summary: string | null;
  notes: string | null;
  file_name: string | null;
  created_at: string;
  transmitted_at: string | null;
  transmit_status: string | null;
}

const STATUS_META: Record<string, { label: string; variant: any; icon: any }> = {
  draft:        { label: 'Draft',        variant: 'secondary', icon: FileText },
  uploaded:     { label: 'Uploaded',     variant: 'default',   icon: Clock },
  in_review:    { label: 'In Review',    variant: 'default',   icon: Clock },
  accepted:     { label: 'Accepted',     variant: 'default',   icon: CheckCircle2 },
  partial:      { label: 'Partial',      variant: 'secondary', icon: AlertCircle },
  rejected:     { label: 'Rejected',     variant: 'destructive', icon: AlertCircle },
  resubmitted:  { label: 'Resubmitted',  variant: 'default',   icon: Clock },
};

interface Props { agencyId: string; }

const AgencyPicSubmissions: React.FC<Props> = ({ agencyId }) => {
  const qc = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<PicSubmission | null>(null);
  const [draft, setDraft] = useState<Partial<PicSubmission>>({});
  const [responseSubmissionId, setResponseSubmissionId] = useState<string | null>(null);
  const [transmitTarget, setTransmitTarget] = useState<PicSubmission | null>(null);

  const { data: submissions, isLoading } = useQuery({
    queryKey: ['agency-pic-submissions', agencyId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('agency_pic_submissions')
        .select('*')
        .eq('agency_id', agencyId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as PicSubmission[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (s: Partial<PicSubmission> & { id?: string }) => {
      const payload: any = {
        agency_id: agencyId,
        batch_reference: s.batch_reference,
        submission_period: s.submission_period || null,
        record_count: s.record_count || 0,
        accepted_count: s.accepted_count || 0,
        rejected_count: s.rejected_count || 0,
        status: s.status || 'draft',
        submitted_at: s.submitted_at || null,
        hud_response_received_at: s.hud_response_received_at || null,
        hud_response_summary: s.hud_response_summary || null,
        notes: s.notes || null,
        file_name: s.file_name || null,
      };
      if (s.id) {
        const { error } = await (supabase as any).from('agency_pic_submissions').update(payload).eq('id', s.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any).from('agency_pic_submissions').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success('Submission saved');
      qc.invalidateQueries({ queryKey: ['agency-pic-submissions', agencyId] });
      setCreating(false);
      setEditing(null);
      setDraft({});
    },
    onError: (e: any) => toast.error(e.message || 'Failed to save'),
  });

  const openEdit = (s: PicSubmission) => {
    setEditing(s);
    setDraft(s);
  };

  const openCreate = () => {
    setCreating(true);
    setDraft({
      batch_reference: `PIC-${new Date().toISOString().slice(0, 10)}`,
      status: 'draft',
      record_count: 0,
      accepted_count: 0,
      rejected_count: 0,
    });
  };

  return (
    <div className="space-y-4">
      <PicValidationWizard agencyId={agencyId} />
      <PicSettingsCard agencyId={agencyId} />


      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <ExternalLink className="w-5 h-5 text-primary" />
                HUD PIC/IMS Submission Tracker
              </CardTitle>
              <CardDescription>
                Track every HUD-50058 submission to PIC/IMS. Upload, monitor responses, and reconcile errors.
                Submit your fixed-width files at <a className="text-primary underline" href="https://hudapps.hud.gov/HUD_Systems/index.cfm" target="_blank" rel="noreferrer">HUD WASS</a>.
              </CardDescription>
            </div>
            <Button onClick={openCreate}><Plus className="w-4 h-4 mr-2" /> Log Submission</Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
          ) : !submissions?.length ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p>No submissions logged yet.</p>
              <p className="text-xs mt-1">Generate a HUD-50058 file from Reports → then log the submission here.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Batch Ref</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Records</TableHead>
                  <TableHead>Accepted</TableHead>
                  <TableHead>Rejected</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {submissions.map(s => {
                  const meta = STATUS_META[s.status] || STATUS_META.draft;
                  const Icon = meta.icon;
                  return (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.batch_reference}</TableCell>
                      <TableCell className="text-sm">{s.submission_period || '—'}</TableCell>
                      <TableCell>{s.record_count}</TableCell>
                      <TableCell className="text-success">{s.accepted_count}</TableCell>
                      <TableCell className={s.rejected_count > 0 ? 'text-destructive' : ''}>{s.rejected_count}</TableCell>
                      <TableCell>
                        <Badge variant={meta.variant} className="gap-1">
                          <Icon className="w-3 h-3" />
                          {meta.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {s.submitted_at ? format(new Date(s.submitted_at), 'MMM d, yyyy') : '—'}
                      </TableCell>
                      <TableCell className="space-x-1">
                        {!s.transmitted_at && s.file_name && (
                          <Button size="sm" variant="ghost" onClick={() => setTransmitTarget(s)}>Transmit</Button>
                        )}
                        {s.transmitted_at && (
                          <Badge variant="outline" className="text-xs">Sent {format(new Date(s.transmitted_at), 'MMM d')}</Badge>
                        )}
                        <Button size="sm" variant="ghost" onClick={() => setResponseSubmissionId(s.id)}>HUD Response</Button>
                        <Button size="sm" variant="ghost" onClick={() => openEdit(s)}>Update</Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={creating || !!editing} onOpenChange={open => { if (!open) { setCreating(false); setEditing(null); setDraft({}); } }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? 'Update Submission' : 'Log New PIC Submission'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Batch Reference</Label>
                <Input
                  value={draft.batch_reference || ''}
                  onChange={e => setDraft({ ...draft, batch_reference: e.target.value })}
                  placeholder="e.g., PIC-2026-04"
                />
              </div>
              <div>
                <Label>Submission Period</Label>
                <Input
                  value={draft.submission_period || ''}
                  onChange={e => setDraft({ ...draft, submission_period: e.target.value })}
                  placeholder="e.g., 2026-Q1"
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Total Records</Label>
                <Input type="number" value={draft.record_count ?? 0}
                  onChange={e => setDraft({ ...draft, record_count: parseInt(e.target.value) || 0 })} />
              </div>
              <div>
                <Label>Accepted</Label>
                <Input type="number" value={draft.accepted_count ?? 0}
                  onChange={e => setDraft({ ...draft, accepted_count: parseInt(e.target.value) || 0 })} />
              </div>
              <div>
                <Label>Rejected</Label>
                <Input type="number" value={draft.rejected_count ?? 0}
                  onChange={e => setDraft({ ...draft, rejected_count: parseInt(e.target.value) || 0 })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Status</Label>
                <Select value={draft.status || 'draft'} onValueChange={v => setDraft({ ...draft, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(STATUS_META).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>File Name (optional)</Label>
                <Input value={draft.file_name || ''}
                  onChange={e => setDraft({ ...draft, file_name: e.target.value })}
                  placeholder="e.g., 50058_2026Q1.txt" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Submitted At</Label>
                <Input type="datetime-local"
                  value={draft.submitted_at ? draft.submitted_at.slice(0, 16) : ''}
                  onChange={e => setDraft({ ...draft, submitted_at: e.target.value ? new Date(e.target.value).toISOString() : null as any })} />
              </div>
              <div>
                <Label>HUD Response Received</Label>
                <Input type="datetime-local"
                  value={draft.hud_response_received_at ? draft.hud_response_received_at.slice(0, 16) : ''}
                  onChange={e => setDraft({ ...draft, hud_response_received_at: e.target.value ? new Date(e.target.value).toISOString() : null as any })} />
              </div>
            </div>
            <div>
              <Label>HUD Response Summary</Label>
              <Textarea
                value={draft.hud_response_summary || ''}
                onChange={e => setDraft({ ...draft, hud_response_summary: e.target.value })}
                rows={3}
                placeholder="Paste HUD acknowledgment / error summary here"
              />
            </div>
            <div>
              <Label>Internal Notes</Label>
              <Textarea
                value={draft.notes || ''}
                onChange={e => setDraft({ ...draft, notes: e.target.value })}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setCreating(false); setEditing(null); setDraft({}); }}>Cancel</Button>
            <Button
              onClick={() => saveMutation.mutate({ ...draft, id: editing?.id } as any)}
              disabled={!draft.batch_reference || saveMutation.isPending}
            >
              {saveMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {responseSubmissionId && (
        <PicResponseDialog
          open={!!responseSubmissionId}
          onOpenChange={(o) => !o && setResponseSubmissionId(null)}
          submissionId={responseSubmissionId}
          onParsed={() => qc.invalidateQueries({ queryKey: ['agency-pic-submissions', agencyId] })}
        />
      )}
      <PicTransmitDialog
        open={!!transmitTarget}
        onOpenChange={(o) => !o && setTransmitTarget(null)}
        submission={transmitTarget}
        onSuccess={() => qc.invalidateQueries({ queryKey: ['agency-pic-submissions', agencyId] })}
      />
    </div>
  );
};

export default AgencyPicSubmissions;

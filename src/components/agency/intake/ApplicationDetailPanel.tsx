import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Loader2, CheckCircle2, XCircle, Calendar, FileText, ClipboardCheck, Plus, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ApplicationRow {
  id: string;
  agency_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  date_of_birth: string | null;
  household_size: number;
  annual_income: number | null;
  current_address: string | null;
  housing_type_requested: string | null;
  status: string;
  notes: string | null;
  created_at: string;
  preference_points?: number | null;
  intake_mode?: string | null;
  eligibility_status?: string | null;
  interview_scheduled_at?: string | null;
  interview_completed_at?: string | null;
  interview_notes?: string | null;
  documents_requested?: string[] | null;
  documents_received?: string[] | null;
  denial_reason?: string | null;
  enrolled_at?: string | null;
  application_number?: string | null;
  tenant_user_id?: string | null;
  claim_token?: string | null;
  claimed_at?: string | null;
  invited_at?: string | null;
}

interface Props {
  application: ApplicationRow;
  agencyId: string;
  canManage: boolean;
  onUpdated: () => void;
}

const ELIGIBILITY_OPTIONS = [
  { value: 'unscreened', label: 'Unscreened' },
  { value: 'eligible', label: 'Eligible' },
  { value: 'ineligible', label: 'Ineligible' },
  { value: 'needs_info', label: 'Needs more info' },
];

const STATUS_OPTIONS = [
  'pending',
  'under_review',
  'docs_requested',
  'interview_scheduled',
  'eligibility_confirmed',
  'enrolled',
  'denied',
  'withdrawn',
];

const ApplicationDetailPanel: React.FC<Props> = ({ application: app, agencyId, canManage, onUpdated }) => {
  const [saving, setSaving] = useState(false);
  const [denyOpen, setDenyOpen] = useState(false);
  const [denyReason, setDenyReason] = useState('');
  const [newDoc, setNewDoc] = useState('');
  const [interviewDate, setInterviewDate] = useState(app.interview_scheduled_at?.slice(0, 16) || '');
  const [interviewNotes, setInterviewNotes] = useState(app.interview_notes || '');

  const docsRequested = (app.documents_requested as string[] | null) || [];
  const docsReceived = (app.documents_received as string[] | null) || [];

  const update = async (patch: Record<string, any>, msg = 'Updated') => {
    setSaving(true);
    const { error } = await supabase.from('voucher_applications').update(patch as any).eq('id', app.id);
    setSaving(false);
    if (error) {
      toast.error(`Failed to update: ${error.message}`);
      return false;
    }
    toast.success(msg);
    onUpdated();
    return true;
  };

  const setStatus = (status: string) => update({ status }, `Status → ${status.replace(/_/g, ' ')}`);

  const setEligibility = (eligibility_status: string) =>
    update({ eligibility_status }, `Eligibility → ${eligibility_status.replace(/_/g, ' ')}`);

  const addDoc = async () => {
    if (!newDoc.trim()) return;
    const next = Array.from(new Set([...(docsRequested || []), newDoc.trim()]));
    const ok = await update({ documents_requested: next, status: 'docs_requested' }, 'Document requested');
    if (ok) setNewDoc('');
  };

  const removeDoc = async (doc: string) => {
    const next = docsRequested.filter((d) => d !== doc);
    await update({ documents_requested: next });
  };

  const markReceived = async (doc: string) => {
    const next = Array.from(new Set([...(docsReceived || []), doc]));
    await update({ documents_received: next }, `Marked received: ${doc}`);
  };

  const saveInterview = async () => {
    if (!interviewDate) {
      toast.error('Pick a date and time');
      return;
    }
    await update(
      {
        interview_scheduled_at: new Date(interviewDate).toISOString(),
        interview_notes: interviewNotes || null,
        status: 'interview_scheduled',
      },
      'Interview scheduled',
    );
  };

  const enroll = async () => {
    if (app.eligibility_status !== 'eligible') {
      toast.error('Mark eligibility as Eligible first');
      return;
    }
    setSaving(true);
    const { data, error } = await supabase.rpc('enroll_voucher_application' as any, {
      _application_id: app.id,
      _voucher_type: 'HCV',
      _notes: null,
    });
    setSaving(false);
    if (error) {
      toast.error(`Enrollment failed: ${error.message}`);
      return;
    }
    const result = data as { success?: boolean; error?: string; invite_needed?: boolean; claim_token?: string } | null;
    if (result?.success) {
      if (result.invite_needed && result.claim_token) {
        const claimUrl = `${window.location.origin}/claim/${result.claim_token}`;
        try { await navigator.clipboard.writeText(claimUrl); } catch { /* noop */ }
        toast.success('Enrolled — claim link copied to clipboard. Send it to the applicant to finish account setup.', { duration: 8000 });
      } else {
        toast.success('Application enrolled');
      }
      onUpdated();
    } else {
      toast.error(result?.error || 'Enrollment failed');
    }
  };

  // Account link state for the header badge
  const accountState: 'claimed' | 'invited' | 'unclaimed' =
    app.tenant_user_id ? 'claimed' : app.invited_at ? 'invited' : 'unclaimed';

  const submitDenial = async () => {
    if (!denyReason.trim()) {
      toast.error('Reason required');
      return;
    }
    const ok = await update(
      {
        status: 'denied',
        denial_reason: denyReason.trim(),
        denial_letter_sent_at: new Date().toISOString(),
        eligibility_status: 'ineligible',
      },
      'Application denied',
    );
    if (ok) {
      setDenyOpen(false);
      setDenyReason('');
    }
  };

  // Quick eligibility check: 30% AMI rule of thumb (placeholder — real HUD check happens in HUD calc)
  const ami30Rough = (() => {
    if (!app.annual_income || !app.household_size) return null;
    // Ballpark: $30k single, +$5k per extra. Real check is in the HUD calculator.
    const limit = 30000 + (app.household_size - 1) * 5000;
    return { eligible: app.annual_income <= limit, limit };
  })();

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <div>
            <CardTitle className="text-base">
              {app.first_name} {app.last_name}
              {app.application_number && (
                <span className="ml-2 text-xs text-muted-foreground font-normal">#{app.application_number}</span>
              )}
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              {app.email} · {app.phone || 'no phone'} · Applied {new Date(app.created_at).toLocaleDateString()}
            </p>
            <div className="mt-1.5">
              <Badge
                variant="outline"
                className={
                  accountState === 'claimed'
                    ? 'text-[10px] border-emerald-300 text-emerald-700 bg-emerald-50 dark:bg-emerald-950/30'
                    : accountState === 'invited'
                    ? 'text-[10px] border-amber-300 text-amber-700 bg-amber-50 dark:bg-amber-950/30'
                    : 'text-[10px] text-muted-foreground'
                }
              >
                Account: {accountState === 'claimed' ? 'claimed' : accountState === 'invited' ? 'invited (pending claim)' : 'not yet invited'}
              </Badge>
            </div>
          </div>
          {canManage && (
            <div className="flex items-center gap-2 flex-wrap">
              <Select value={app.status || 'pending'} onValueChange={setStatus} disabled={saving}>
                <SelectTrigger className="h-8 w-44 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s}>{s.replace(/_/g, ' ')}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button size="sm" variant="destructive" onClick={() => setDenyOpen(true)} disabled={saving}>
                <XCircle className="w-3 h-3 mr-1" /> Deny
              </Button>
              <Button size="sm" onClick={enroll} disabled={saving || app.eligibility_status !== 'eligible' || app.status === 'enrolled'}>
                {saving ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <CheckCircle2 className="w-3 h-3 mr-1" />}
                {app.status === 'enrolled' ? 'Enrolled' : 'Enroll'}
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="overview">
          <TabsList className="h-9">
            <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
            <TabsTrigger value="eligibility" className="text-xs">Eligibility</TabsTrigger>
            <TabsTrigger value="documents" className="text-xs">Docs ({docsRequested.length})</TabsTrigger>
            <TabsTrigger value="interview" className="text-xs">Interview</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-3 pt-3">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <Field label="Household size" value={app.household_size?.toString() || '—'} />
              <Field label="Annual income" value={app.annual_income ? `$${app.annual_income.toLocaleString()}` : '—'} />
              <Field label="Housing type" value={app.housing_type_requested || '—'} />
              <Field label="Preference points" value={app.preference_points?.toString() || '0'} />
              <Field label="Intake mode" value={(app.intake_mode || 'waitlist').replace('_', ' ')} />
              <Field label="DOB" value={app.date_of_birth || '—'} />
              <Field label="Current address" value={app.current_address || '—'} className="col-span-2" />
            </div>
            {app.notes && (
              <div className="p-2 rounded bg-muted text-xs">
                <span className="font-medium">Notes: </span>{app.notes}
              </div>
            )}
            {app.denial_reason && (
              <div className="p-2 rounded bg-destructive/10 border border-destructive/30 text-xs">
                <span className="font-medium">Denial reason: </span>{app.denial_reason}
              </div>
            )}
            {app.enrolled_at && (
              <div className="p-2 rounded bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-xs">
                <span className="font-medium">Enrolled </span>{new Date(app.enrolled_at).toLocaleString()}
              </div>
            )}
          </TabsContent>

          <TabsContent value="eligibility" className="space-y-3 pt-3">
            <div className="flex items-center gap-2 flex-wrap">
              <Label className="text-xs">Eligibility status:</Label>
              <Select value={app.eligibility_status || 'unscreened'} onValueChange={setEligibility} disabled={!canManage || saving}>
                <SelectTrigger className="h-8 w-44 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ELIGIBILITY_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Badge
                className={
                  app.eligibility_status === 'eligible'
                    ? 'bg-emerald-100 text-emerald-800'
                    : app.eligibility_status === 'ineligible'
                    ? 'bg-red-100 text-red-800'
                    : 'bg-muted'
                }
              >
                {(app.eligibility_status || 'unscreened').replace('_', ' ')}
              </Badge>
            </div>
            {ami30Rough && (
              <div className="p-3 rounded border border-border space-y-1">
                <p className="text-xs font-medium flex items-center gap-2">
                  <ClipboardCheck className="w-3 h-3" /> Quick income screen
                </p>
                <p className="text-xs text-muted-foreground">
                  Reported income: ${app.annual_income?.toLocaleString()} · Household: {app.household_size}
                </p>
                <p className="text-xs">
                  Rough 30% AMI guideline: <strong>${ami30Rough.limit.toLocaleString()}</strong> ·{' '}
                  {ami30Rough.eligible ? (
                    <span className="text-emerald-700 dark:text-emerald-300">Likely within limit</span>
                  ) : (
                    <span className="text-amber-700 dark:text-amber-300">May exceed limit — verify with HUD calc</span>
                  )}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Use the HUD Affordability Calculator on the tenant detail page for the official check.
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="documents" className="space-y-3 pt-3">
            {canManage && (
              <div className="flex gap-2">
                <Input
                  placeholder="e.g. Birth certificate, Income verification"
                  value={newDoc}
                  onChange={(e) => setNewDoc(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addDoc()}
                  className="text-xs h-8"
                />
                <Button size="sm" onClick={addDoc} disabled={!newDoc.trim() || saving}>
                  <Plus className="w-3 h-3 mr-1" /> Request
                </Button>
              </div>
            )}
            {docsRequested.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">No documents requested yet.</p>
            ) : (
              <div className="space-y-1">
                {docsRequested.map((doc) => {
                  const got = docsReceived.includes(doc);
                  return (
                    <div key={doc} className="flex items-center gap-2 p-2 rounded bg-muted">
                      <FileText className="w-3 h-3 text-muted-foreground" />
                      <span className="text-xs flex-1">{doc}</span>
                      {got ? (
                        <Badge className="bg-emerald-100 text-emerald-800 text-[10px]">Received</Badge>
                      ) : (
                        canManage && (
                          <Button size="sm" variant="ghost" className="h-6 text-[10px]" onClick={() => markReceived(doc)}>
                            Mark received
                          </Button>
                        )
                      )}
                      {canManage && (
                        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => removeDoc(doc)}>
                          <X className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="interview" className="space-y-3 pt-3">
            <div className="space-y-2">
              <Label className="text-xs flex items-center gap-1">
                <Calendar className="w-3 h-3" /> Scheduled at
              </Label>
              <Input
                type="datetime-local"
                value={interviewDate}
                onChange={(e) => setInterviewDate(e.target.value)}
                disabled={!canManage}
                className="text-xs h-8 w-fit"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Notes</Label>
              <Textarea
                value={interviewNotes}
                onChange={(e) => setInterviewNotes(e.target.value)}
                disabled={!canManage}
                rows={3}
                placeholder="Topics, attendees, outcome…"
                className="text-xs"
              />
            </div>
            {canManage && (
              <div className="flex gap-2">
                <Button size="sm" onClick={saveInterview} disabled={saving}>
                  Save Interview
                </Button>
                {app.interview_scheduled_at && !app.interview_completed_at && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => update({ interview_completed_at: new Date().toISOString() }, 'Marked complete')}
                    disabled={saving}
                  >
                    Mark Complete
                  </Button>
                )}
              </div>
            )}
            {app.interview_completed_at && (
              <p className="text-xs text-emerald-700 dark:text-emerald-300">
                Completed {new Date(app.interview_completed_at).toLocaleString()}
              </p>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>

      <Dialog open={denyOpen} onOpenChange={setDenyOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deny application</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label className="text-xs">Reason for denial (sent to applicant)</Label>
            <Textarea
              value={denyReason}
              onChange={(e) => setDenyReason(e.target.value)}
              rows={4}
              placeholder="e.g. Income exceeds program limit; failed criminal background per agency policy section 4.2"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDenyOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={submitDenial} disabled={!denyReason.trim() || saving}>
              Deny & Send Letter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

const Field: React.FC<{ label: string; value: string; className?: string }> = ({ label, value, className }) => (
  <div className={className}>
    <p className="text-[11px] text-muted-foreground uppercase tracking-wide">{label}</p>
    <p className="text-sm">{value}</p>
  </div>
);

export default ApplicationDetailPanel;

import React, { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Accessibility, Clock, Loader2, CheckCircle, XCircle, Eye } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Props {
  agencyId: string;
  canManage: boolean;
}

interface Request {
  id: string;
  tenant_id: string;
  request_date: string;
  accommodation_type: string;
  description: string;
  status: string;
  decision_date: string | null;
  decision_notes: string | null;
  denial_reason: string | null;
  tenant_name?: string;
}

const TYPE_LABELS: Record<string, string> = {
  larger_unit: 'Larger Unit',
  live_in_aide: 'Live-In Aide',
  extended_shopping: 'Extended Voucher Shopping',
  transfer: 'Unit Transfer',
  assistance_animal: 'Assistance Animal',
  accessibility_modification: 'Accessibility Modification',
  other: 'Other',
};

const STATUS_VARIANTS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  pending: 'default',
  under_review: 'secondary',
  approved: 'secondary',
  denied: 'destructive',
  withdrawn: 'outline',
};

const SLA_DAYS = 14;

const AccommodationRequestQueue: React.FC<Props> = ({ agencyId, canManage }) => {
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewing, setReviewing] = useState<Request | null>(null);
  const [decisionStatus, setDecisionStatus] = useState<'approved' | 'denied'>('approved');
  const [decisionNotes, setDecisionNotes] = useState('');
  const [denialReason, setDenialReason] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('agency_accommodation_requests')
      .select('*')
      .eq('agency_id', agencyId)
      .order('request_date', { ascending: false });

    if (error) {
      toast.error('Failed to load requests');
      setLoading(false);
      return;
    }

    const tenantIds = Array.from(new Set((data || []).map(r => r.tenant_id)));
    const { data: profiles } = tenantIds.length
      ? await supabase.from('profiles').select('id, full_name, email').in('id', tenantIds)
      : { data: [] as any[] };
    const nameMap = new Map((profiles || []).map((p: any) => [p.id, p.full_name || p.email || 'Unknown']));

    setRequests((data || []).map((r: any) => ({ ...r, tenant_name: nameMap.get(r.tenant_id) || 'Unknown' })));
    setLoading(false);
  }, [agencyId]);

  useEffect(() => { load(); }, [load]);

  const daysOpen = (r: Request): number => {
    const start = new Date(r.request_date);
    const end = r.decision_date ? new Date(r.decision_date) : new Date();
    return Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  };

  const slaBadge = (r: Request) => {
    if (r.decision_date) return null;
    const days = daysOpen(r);
    const remaining = SLA_DAYS - days;
    if (remaining < 0) return <Badge variant="destructive" className="text-[10px]">Overdue {-remaining}d</Badge>;
    if (remaining <= 3) return <Badge variant="outline" className="text-[10px] border-yellow-500 text-yellow-700">Due in {remaining}d</Badge>;
    return <Badge variant="outline" className="text-[10px]">{remaining}d left</Badge>;
  };

  const openReview = (r: Request) => {
    setReviewing(r);
    setDecisionStatus('approved');
    setDecisionNotes(r.decision_notes || '');
    setDenialReason(r.denial_reason || '');
  };

  const submitDecision = async () => {
    if (!reviewing) return;
    if (decisionStatus === 'denied' && !denialReason.trim()) return toast.error('Denial reason required');
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from('agency_accommodation_requests').update({
      status: decisionStatus,
      decision_date: new Date().toISOString().slice(0, 10),
      decision_by: user?.id ?? null,
      decision_notes: decisionNotes || null,
      denial_reason: decisionStatus === 'denied' ? denialReason : null,
    }).eq('id', reviewing.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(`Request ${decisionStatus}`);
    setReviewing(null);
    load();
  };

  const markUnderReview = async (id: string) => {
    const { error } = await supabase.from('agency_accommodation_requests').update({ status: 'under_review' }).eq('id', id);
    if (error) return toast.error(error.message);
    load();
  };

  const summary = {
    pending: requests.filter(r => r.status === 'pending' || r.status === 'under_review').length,
    overdue: requests.filter(r => !r.decision_date && daysOpen(r) > SLA_DAYS).length,
    approved: requests.filter(r => r.status === 'approved').length,
    denied: requests.filter(r => r.status === 'denied').length,
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Pending Review</p><p className="text-2xl font-bold">{summary.pending}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3" /> Overdue (SLA 14d)</p><p className="text-2xl font-bold text-destructive">{summary.overdue}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Approved</p><p className="text-2xl font-bold text-green-600">{summary.approved}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Denied</p><p className="text-2xl font-bold">{summary.denied}</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Accessibility className="w-4 h-4" /> Reasonable Accommodation Requests</CardTitle>
          <p className="text-xs text-muted-foreground">Section 504 / Fair Housing Act review queue. HUD recommends decision within 14 days.</p>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
          ) : requests.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground text-sm">No accommodation requests yet</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tenant</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Requested</TableHead>
                    <TableHead>SLA</TableHead>
                    <TableHead>Status</TableHead>
                    {canManage && <TableHead className="text-right">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requests.map(r => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.tenant_name}</TableCell>
                      <TableCell className="text-xs">{TYPE_LABELS[r.accommodation_type] || r.accommodation_type}</TableCell>
                      <TableCell className="text-xs">{r.request_date}</TableCell>
                      <TableCell>{slaBadge(r)}</TableCell>
                      <TableCell>
                        <Badge variant={STATUS_VARIANTS[r.status] || 'outline'} className="capitalize">{r.status.replace('_', ' ')}</Badge>
                      </TableCell>
                      {canManage && (
                        <TableCell className="text-right space-x-1">
                          {r.status === 'pending' && (
                            <Button size="sm" variant="ghost" onClick={() => markUnderReview(r.id)}>
                              <Eye className="w-3 h-3 mr-1" /> Review
                            </Button>
                          )}
                          {(r.status === 'pending' || r.status === 'under_review') && (
                            <Button size="sm" variant="outline" onClick={() => openReview(r)}>Decide</Button>
                          )}
                          {r.decision_date && (
                            <Button size="sm" variant="ghost" onClick={() => openReview(r)}>View</Button>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!reviewing} onOpenChange={(o) => !o && setReviewing(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Accommodation Request — {reviewing && TYPE_LABELS[reviewing.accommodation_type]}</DialogTitle>
          </DialogHeader>
          {reviewing && (
            <div className="space-y-4">
              <div className="rounded-md bg-muted p-3 text-sm space-y-1">
                <p><span className="text-muted-foreground">Tenant:</span> {reviewing.tenant_name}</p>
                <p><span className="text-muted-foreground">Requested:</span> {reviewing.request_date}</p>
                <p><span className="text-muted-foreground">Description:</span></p>
                <p className="whitespace-pre-wrap">{reviewing.description}</p>
              </div>
              {(reviewing.status === 'pending' || reviewing.status === 'under_review') && canManage ? (
                <>
                  <div>
                    <Label>Decision</Label>
                    <Select value={decisionStatus} onValueChange={(v: any) => setDecisionStatus(v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="approved">Approve</SelectItem>
                        <SelectItem value="denied">Deny</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Decision Notes</Label>
                    <Textarea value={decisionNotes} onChange={e => setDecisionNotes(e.target.value)} rows={3} placeholder="Reasoning, conditions, next steps..." />
                  </div>
                  {decisionStatus === 'denied' && (
                    <div>
                      <Label>Denial Reason (required)</Label>
                      <Textarea value={denialReason} onChange={e => setDenialReason(e.target.value)} rows={2} placeholder="Citation to policy, undue burden analysis, etc." />
                    </div>
                  )}
                </>
              ) : (
                <>
                  {reviewing.decision_date && <div className="text-sm"><span className="text-muted-foreground">Decided:</span> {reviewing.decision_date}</div>}
                  {reviewing.decision_notes && <div className="text-sm"><span className="text-muted-foreground">Notes:</span> {reviewing.decision_notes}</div>}
                  {reviewing.denial_reason && <div className="text-sm text-destructive"><span className="text-muted-foreground">Denial reason:</span> {reviewing.denial_reason}</div>}
                </>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewing(null)}>Close</Button>
            {reviewing && (reviewing.status === 'pending' || reviewing.status === 'under_review') && canManage && (
              <Button onClick={submitDecision} disabled={saving}>
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {decisionStatus === 'approved' ? <CheckCircle className="w-4 h-4 mr-1" /> : <XCircle className="w-4 h-4 mr-1" />}
                Submit Decision
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AccommodationRequestQueue;

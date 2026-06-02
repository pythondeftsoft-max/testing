import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, FileText, Check, X, DollarSign } from 'lucide-react';
import HudFormButton from '../hud-pdfs/HudFormButton';

interface Props {
  claimId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canManage: boolean;
  onUpdated: () => void;
}

const SpecialClaimDetailDialog: React.FC<Props> = ({ claimId, open, onOpenChange, canManage, onUpdated }) => {
  const [claim, setClaim] = useState<any>(null);
  const [docs, setDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [approvedAmount, setApprovedAmount] = useState('');
  const [denialReason, setDenialReason] = useState('');

  useEffect(() => {
    if (!open) return;
    const load = async () => {
      setLoading(true);
      const [{ data: c }, { data: d }] = await Promise.all([
        supabase.from('agency_special_claims').select('*').eq('id', claimId).single(),
        supabase.from('agency_special_claim_documents').select('*').eq('claim_id', claimId).order('created_at'),
      ]);
      setClaim(c);
      setDocs(d || []);
      setApprovedAmount(c?.approved_amount?.toString() || c?.claim_amount?.toString() || '');
      setDenialReason(c?.denial_reason || '');
      setLoading(false);
    };
    load();
  }, [claimId, open]);

  const updateStatus = async (status: string, extra: Record<string, any> = {}) => {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from('agency_special_claims').update({
      status,
      reviewed_at: new Date().toISOString(),
      reviewed_by: user?.id,
      ...extra,
    }).eq('id', claimId);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(`Claim ${status}`);
    onUpdated();
    onOpenChange(false);
  };

  const handleApprove = () => {
    const amt = parseFloat(approvedAmount);
    if (isNaN(amt) || amt < 0) { toast.error('Enter a valid approved amount'); return; }
    updateStatus('approved', { approved_amount: amt, decision_date: new Date().toISOString().slice(0, 10) });
  };

  const handleDeny = () => {
    if (!denialReason.trim()) { toast.error('Denial reason required'); return; }
    updateStatus('denied', { denial_reason: denialReason, decision_date: new Date().toISOString().slice(0, 10) });
  };

  const handleMarkPaid = () => updateStatus('paid', { paid_date: new Date().toISOString().slice(0, 10) });

  const handleStartReview = () => updateStatus('under_review');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2"><FileText className="w-5 h-5" /> Special Claim Detail</span>
            {claim && <HudFormButton formNumber="52671" entityId={claimId} agencyName="Housing Authority" />}
          </DialogTitle>
        </DialogHeader>

        {loading || !claim ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><Label className="text-xs text-muted-foreground">Type</Label><p className="font-medium">{claim.claim_type.replace('_', ' ')}</p></div>
              <div><Label className="text-xs text-muted-foreground">Status</Label><p><Badge>{claim.status.replace('_', ' ')}</Badge></p></div>
              <div><Label className="text-xs text-muted-foreground">Claim Amount</Label><p className="font-medium">${Number(claim.claim_amount).toFixed(2)}</p></div>
              <div><Label className="text-xs text-muted-foreground">Submitted</Label><p>{claim.submitted_date ? new Date(claim.submitted_date).toLocaleDateString() : '—'}</p></div>
              {claim.move_out_date && <div><Label className="text-xs text-muted-foreground">Move-out</Label><p>{new Date(claim.move_out_date).toLocaleDateString()}</p></div>}
              {claim.vacancy_start && <div><Label className="text-xs text-muted-foreground">Vacancy Period</Label><p>{new Date(claim.vacancy_start).toLocaleDateString()} → {claim.vacancy_end ? new Date(claim.vacancy_end).toLocaleDateString() : 'ongoing'}</p></div>}
            </div>

            {claim.description && (
              <div>
                <Label className="text-xs text-muted-foreground">Description</Label>
                <p className="text-sm whitespace-pre-wrap p-2 bg-muted/30 rounded">{claim.description}</p>
              </div>
            )}

            <div>
              <Label className="text-xs text-muted-foreground">Supporting Documents ({docs.length})</Label>
              {docs.length === 0 ? <p className="text-sm text-muted-foreground">No documents attached</p> : (
                <ul className="text-sm space-y-1 mt-1">
                  {docs.map(d => (
                    <li key={d.id} className="flex items-center gap-2 p-1.5 border border-border rounded">
                      <FileText className="w-3.5 h-3.5" />
                      <span className="flex-1 truncate">{d.file_name}</span>
                      <Badge variant="outline" className="text-xs">{d.document_type}</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {claim.denial_reason && (
              <div className="p-2 bg-destructive/10 rounded border border-destructive/30">
                <Label className="text-xs text-destructive">Denial Reason</Label>
                <p className="text-sm">{claim.denial_reason}</p>
              </div>
            )}

            {canManage && ['submitted', 'under_review'].includes(claim.status) && (
              <>
                <Separator />
                <div className="space-y-3">
                  {claim.status === 'submitted' && (
                    <Button onClick={handleStartReview} disabled={saving} variant="outline" className="w-full">Start Review</Button>
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1.5">
                      <Label>Approved Amount</Label>
                      <Input type="number" step="0.01" value={approvedAmount} onChange={e => setApprovedAmount(e.target.value)} />
                      <Button onClick={handleApprove} disabled={saving} className="w-full" size="sm">
                        <Check className="w-4 h-4 mr-1" /> Approve
                      </Button>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Denial Reason</Label>
                      <Textarea value={denialReason} onChange={e => setDenialReason(e.target.value)} rows={1} />
                      <Button onClick={handleDeny} disabled={saving} variant="destructive" className="w-full" size="sm">
                        <X className="w-4 h-4 mr-1" /> Deny
                      </Button>
                    </div>
                  </div>
                </div>
              </>
            )}

            {canManage && claim.status === 'approved' && (
              <>
                <Separator />
                <div className="p-3 bg-success/5 rounded border border-success/30 space-y-2">
                  <p className="text-sm">Approved for ${Number(claim.approved_amount).toFixed(2)}. Mark as paid when disbursed via HAP batch.</p>
                  <Button onClick={handleMarkPaid} disabled={saving} className="w-full">
                    <DollarSign className="w-4 h-4 mr-1" /> Mark as Paid
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default SpecialClaimDetailDialog;

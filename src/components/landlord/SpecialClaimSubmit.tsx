import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { FileSignature, Plus, Upload, Loader2 } from 'lucide-react';

interface Props {
  landlordId: string;
}

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'success' | 'warning' | 'destructive'> = {
  draft: 'secondary',
  submitted: 'warning',
  under_review: 'warning',
  approved: 'success',
  denied: 'destructive',
  paid: 'success',
  cancelled: 'secondary',
};

const SpecialClaimSubmit: React.FC<Props> = ({ landlordId }) => {
  const [claims, setClaims] = useState<any[]>([]);
  const [agencies, setAgencies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [agencyId, setAgencyId] = useState('');
  const [claimType, setClaimType] = useState<'unpaid_rent' | 'vacancy_loss' | 'damages'>('unpaid_rent');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [moveOutDate, setMoveOutDate] = useState('');
  const [vacancyStart, setVacancyStart] = useState('');
  const [vacancyEnd, setVacancyEnd] = useState('');
  const [files, setFiles] = useState<File[]>([]);

  const load = async () => {
    setLoading(true);
    const [{ data: cl }, { data: ag }] = await Promise.all([
      supabase.from('agency_special_claims').select('*').eq('landlord_id', landlordId).order('created_at', { ascending: false }),
      supabase.from('agency_landlords').select('agency_id, housing_authorities(id, name)').eq('landlord_id', landlordId),
    ]);
    setClaims(cl || []);
    const uniqueAgencies = (ag || [])
      .map((r: any) => r.housing_authorities)
      .filter((a: any, i: number, arr: any[]) => a && arr.findIndex((x: any) => x.id === a.id) === i);
    setAgencies(uniqueAgencies);
    if (uniqueAgencies.length === 1) setAgencyId(uniqueAgencies[0].id);
    setLoading(false);
  };

  useEffect(() => { load(); }, [landlordId]);

  const reset = () => {
    setClaimType('unpaid_rent'); setAmount(''); setDescription('');
    setMoveOutDate(''); setVacancyStart(''); setVacancyEnd(''); setFiles([]);
  };

  const submit = async () => {
    if (!agencyId) { toast.error('Select an agency'); return; }
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) { toast.error('Enter a valid amount'); return; }
    setSubmitting(true);
    const { data: claim, error } = await supabase.from('agency_special_claims').insert({
      agency_id: agencyId,
      landlord_id: landlordId,
      claim_type: claimType,
      claim_amount: amt,
      description,
      move_out_date: moveOutDate || null,
      vacancy_start: vacancyStart || null,
      vacancy_end: vacancyEnd || null,
      status: 'submitted',
      submitted_date: new Date().toISOString().slice(0, 10),
    }).select().single();

    if (error || !claim) { setSubmitting(false); toast.error(error?.message || 'Failed'); return; }

    // Upload files to documents bucket
    for (const file of files) {
      const path = `${landlordId}/special-claims/${claim.id}/${Date.now()}-${file.name}`;
      const { error: upErr } = await supabase.storage.from('documents').upload(path, file);
      if (upErr) { toast.error(`Upload failed: ${file.name}`); continue; }
      await supabase.from('agency_special_claim_documents').insert({
        claim_id: claim.id,
        document_type: 'supporting',
        file_path: path,
        file_name: file.name,
        uploaded_by: landlordId,
      });
    }

    setSubmitting(false);
    toast.success('Claim submitted');
    reset();
    setOpen(false);
    load();
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2"><FileSignature className="w-4 h-4" /> Special Claims (HUD 52671)</CardTitle>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="w-4 h-4 mr-1" />New Claim</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Submit Special Claim</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>Housing Authority</Label>
                  <Select value={agencyId} onValueChange={setAgencyId}>
                    <SelectTrigger><SelectValue placeholder="Select PHA" /></SelectTrigger>
                    <SelectContent>
                      {agencies.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Claim Type</Label>
                  <Select value={claimType} onValueChange={(v) => setClaimType(v as any)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unpaid_rent">Unpaid Rent</SelectItem>
                      <SelectItem value="vacancy_loss">Vacancy Loss</SelectItem>
                      <SelectItem value="damages">Tenant Damages</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Claim Amount ($)</Label>
                  <Input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label>Move-out Date</Label>
                    <Input type="date" value={moveOutDate} onChange={e => setMoveOutDate(e.target.value)} />
                  </div>
                  {claimType === 'vacancy_loss' && (
                    <>
                      <div>
                        <Label>Vacancy Start</Label>
                        <Input type="date" value={vacancyStart} onChange={e => setVacancyStart(e.target.value)} />
                      </div>
                      <div>
                        <Label>Vacancy End</Label>
                        <Input type="date" value={vacancyEnd} onChange={e => setVacancyEnd(e.target.value)} />
                      </div>
                    </>
                  )}
                </div>
                <div>
                  <Label>Description / Itemization</Label>
                  <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={4} placeholder="Describe each item, repair, or unpaid period..." />
                </div>
                <div>
                  <Label>Supporting Documents (ledger, receipts, photos)</Label>
                  <Input type="file" multiple onChange={e => setFiles(Array.from(e.target.files || []))} />
                  {files.length > 0 && <p className="text-xs text-muted-foreground mt-1">{files.length} file(s) selected</p>}
                </div>
                <Button onClick={submit} disabled={submitting} className="w-full">
                  {submitting ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Upload className="w-4 h-4 mr-1" />}
                  Submit Claim
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : claims.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No claims submitted yet</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Submitted</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Approved</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {claims.map(c => (
                <TableRow key={c.id}>
                  <TableCell className="text-sm">{c.submitted_date ? new Date(c.submitted_date).toLocaleDateString() : '—'}</TableCell>
                  <TableCell><Badge variant="outline">{c.claim_type.replace('_', ' ')}</Badge></TableCell>
                  <TableCell>${Number(c.claim_amount).toFixed(2)}</TableCell>
                  <TableCell>{c.approved_amount != null ? `$${Number(c.approved_amount).toFixed(2)}` : '—'}</TableCell>
                  <TableCell><Badge variant={STATUS_VARIANT[c.status] || 'secondary'}>{c.status.replace('_', ' ')}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

export default SpecialClaimSubmit;

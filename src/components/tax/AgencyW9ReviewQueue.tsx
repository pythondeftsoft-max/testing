import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle2, XCircle, Eye, ShieldCheck } from 'lucide-react';
import { useAgencyW9ReviewQueue, useReviewW9Submission, type W9Submission, type W9Status } from '@/hooks/tax/useW9Submissions';
import { format } from 'date-fns';

interface Props { agencyId: string; }

const AgencyW9ReviewQueue: React.FC<Props> = ({ agencyId }) => {
  const [filter, setFilter] = useState<W9Status | 'all'>('submitted');
  const [selected, setSelected] = useState<W9Submission | null>(null);
  const [rejectMode, setRejectMode] = useState(false);
  const [reason, setReason] = useState('');
  const { data: queue, isLoading } = useAgencyW9ReviewQueue(agencyId, filter);
  const review = useReviewW9Submission();

  const statusBadge = (s: string) => {
    if (s === 'verified') return <Badge className="bg-green-100 text-green-800"><ShieldCheck className="w-3 h-3 mr-1" />Verified</Badge>;
    if (s === 'submitted') return <Badge variant="secondary">Pending</Badge>;
    if (s === 'rejected') return <Badge variant="destructive">Rejected</Badge>;
    return <Badge variant="outline">Draft</Badge>;
  };

  const closeAll = () => { setSelected(null); setRejectMode(false); setReason(''); };

  return (
    <Card>
      <CardHeader>
        <CardTitle>W-9 Review Queue</CardTitle>
        <Tabs value={filter} onValueChange={v => setFilter(v as any)}>
          <TabsList>
            <TabsTrigger value="submitted">Pending</TabsTrigger>
            <TabsTrigger value="verified">Verified</TabsTrigger>
            <TabsTrigger value="rejected">Rejected</TabsTrigger>
            <TabsTrigger value="all">All</TabsTrigger>
          </TabsList>
        </Tabs>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : !queue?.length ? (
          <p className="text-sm text-muted-foreground py-8 text-center">No W-9 submissions in this view.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Legal Name</TableHead>
                <TableHead>Year</TableHead>
                <TableHead>TIN Type</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {queue.map(s => (
                <TableRow key={s.id}>
                  <TableCell>
                    <div className="font-medium">{s.legal_name}</div>
                    {s.business_name && <div className="text-xs text-muted-foreground">{s.business_name}</div>}
                  </TableCell>
                  <TableCell>{s.tax_year}</TableCell>
                  <TableCell className="uppercase text-xs">{s.tin_type} ····{s.tin_last_four}</TableCell>
                  <TableCell className="text-xs">{s.submitted_at ? format(new Date(s.submitted_at), 'PP') : '—'}</TableCell>
                  <TableCell>{statusBadge(s.status)}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => setSelected(s)}>
                      <Eye className="w-3 h-3 mr-1" />View
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <Dialog open={!!selected} onOpenChange={o => !o && closeAll()}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>W-9 Submission</DialogTitle></DialogHeader>
          {selected && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><span className="text-muted-foreground">Legal Name:</span> <strong>{selected.legal_name}</strong></div>
                <div><span className="text-muted-foreground">Business Name:</span> {selected.business_name || '—'}</div>
                <div><span className="text-muted-foreground">Tax Class:</span> {selected.tax_classification}</div>
                <div><span className="text-muted-foreground">Tax Year:</span> {selected.tax_year}</div>
                <div><span className="text-muted-foreground">TIN:</span> {selected.tin_type.toUpperCase()} ····{selected.tin_last_four}</div>
                <div><span className="text-muted-foreground">Signed:</span> {selected.signed_at ? format(new Date(selected.signed_at), 'PP') : '—'}</div>
              </div>
              <div>
                <span className="text-muted-foreground">Address:</span><br />
                {selected.address_line1}{selected.address_line2 ? `, ${selected.address_line2}` : ''}<br />
                {selected.address_city}, {selected.address_state} {selected.address_zip}
              </div>
              <div><span className="text-muted-foreground">Signature:</span> <em>{selected.signature_typed_name || '—'}</em></div>

              {rejectMode && (
                <div className="pt-2">
                  <label className="text-xs font-medium">Rejection Reason</label>
                  <Textarea value={reason} onChange={e => setReason(e.target.value)} placeholder="Explain what needs to be corrected…" />
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            {selected?.status === 'submitted' && !rejectMode && (
              <>
                <Button variant="outline" onClick={() => setRejectMode(true)}>
                  <XCircle className="w-4 h-4 mr-2" />Reject
                </Button>
                <Button onClick={async () => { await review.mutateAsync({ id: selected.id, action: 'verify' }); closeAll(); }}>
                  <CheckCircle2 className="w-4 h-4 mr-2" />Verify
                </Button>
              </>
            )}
            {rejectMode && (
              <>
                <Button variant="outline" onClick={() => { setRejectMode(false); setReason(''); }}>Cancel</Button>
                <Button variant="destructive" disabled={!reason.trim()} onClick={async () => {
                  await review.mutateAsync({ id: selected!.id, action: 'reject', reason });
                  closeAll();
                }}>Confirm Reject</Button>
              </>
            )}
            {selected?.status !== 'submitted' && !rejectMode && (
              <Button variant="outline" onClick={closeAll}>Close</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default AgencyW9ReviewQueue;

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { FileSignature, Loader2 } from 'lucide-react';
import SpecialClaimDetailDialog from './SpecialClaimDetailDialog';

interface Props {
  agencyId: string;
  canManage: boolean;
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

const SpecialClaimsList: React.FC<Props> = ({ agencyId, canManage }) => {
  const [claims, setClaims] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tab, setTab] = useState('queue');

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('agency_special_claims')
      .select('*')
      .eq('agency_id', agencyId)
      .order('created_at', { ascending: false });
    setClaims(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [agencyId]);

  const queue = claims.filter(c => ['submitted', 'under_review'].includes(c.status));
  const decided = claims.filter(c => ['approved', 'denied'].includes(c.status));
  const paid = claims.filter(c => c.status === 'paid');

  const renderTable = (rows: any[]) => {
    if (rows.length === 0) return <p className="text-center text-muted-foreground py-8">No claims in this view</p>;
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Submitted</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Approved</TableHead>
            <TableHead>Status</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map(c => (
            <TableRow key={c.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedId(c.id)}>
              <TableCell className="text-sm">{c.submitted_date ? new Date(c.submitted_date).toLocaleDateString() : '—'}</TableCell>
              <TableCell><Badge variant="outline">{c.claim_type.replace('_', ' ')}</Badge></TableCell>
              <TableCell className="font-medium">${Number(c.claim_amount).toFixed(2)}</TableCell>
              <TableCell>{c.approved_amount != null ? `$${Number(c.approved_amount).toFixed(2)}` : '—'}</TableCell>
              <TableCell><Badge variant={STATUS_VARIANT[c.status] || 'secondary'}>{c.status.replace('_', ' ')}</Badge></TableCell>
              <TableCell><Button size="sm" variant="ghost">Review</Button></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2"><FileSignature className="w-4 h-4" /> Special Claims (HUD 52671)</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : (
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList>
              <TabsTrigger value="queue">Review Queue ({queue.length})</TabsTrigger>
              <TabsTrigger value="decided">Decided ({decided.length})</TabsTrigger>
              <TabsTrigger value="paid">Paid ({paid.length})</TabsTrigger>
            </TabsList>
            <TabsContent value="queue">{renderTable(queue)}</TabsContent>
            <TabsContent value="decided">{renderTable(decided)}</TabsContent>
            <TabsContent value="paid">{renderTable(paid)}</TabsContent>
          </Tabs>
        )}
        {selectedId && (
          <SpecialClaimDetailDialog
            claimId={selectedId}
            open={!!selectedId}
            onOpenChange={(v) => !v && setSelectedId(null)}
            canManage={canManage}
            onUpdated={load}
          />
        )}
      </CardContent>
    </Card>
  );
};

export default SpecialClaimsList;

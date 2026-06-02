import React, { useEffect, useMemo, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Banknote, FileText, ScrollText, Download, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Props {
  agencyId: string;
}

interface BatchRow {
  id: string;
  batch_number?: string | null;
  payment_date?: string | null;
  status?: string | null;
  total_amount?: number | null;
  payment_count?: number | null;
  created_at?: string | null;
}

interface NachaRow {
  id: string;
  file_name?: string | null;
  generated_at?: string | null;
  total_amount?: number | null;
  entry_count?: number | null;
  status?: string | null;
}

interface AuditRow {
  id: string;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  actor_id: string | null;
  created_at: string;
  metadata: any;
}

const MONEY_ENTITIES = ['hap_batch', 'agency_hap_batch', 'nacha_file', 'payment', 'disbursement', 'agency_payment_rails'];

const fmtMoney = (n?: number | null) =>
  n == null ? '—' : `$${Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtDate = (d?: string | null) => (d ? new Date(d).toLocaleDateString() : '—');

const AgencyPayouts: React.FC<Props> = ({ agencyId }) => {
  const [tab, setTab] = useState<'disbursements' | 'ach' | 'audit'>('disbursements');
  const [batches, setBatches] = useState<BatchRow[]>([]);
  const [nacha, setNacha] = useState<NachaRow[]>([]);
  const [audit, setAudit] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      const [b, n, a] = await Promise.all([
        supabase
          .from('agency_hap_batches' as any)
          .select('id, batch_number, payment_date, status, total_amount, payment_count, created_at')
          .eq('agency_id', agencyId)
          .order('created_at', { ascending: false })
          .limit(200),
        supabase
          .from('agency_nacha_files' as any)
          .select('id, file_name, generated_at, total_amount, entry_count, status')
          .eq('agency_id', agencyId)
          .order('generated_at', { ascending: false })
          .limit(200),
        supabase
          .from('agency_activity_log' as any)
          .select('id, action, entity_type, entity_id, actor_id, created_at, metadata')
          .eq('agency_id', agencyId)
          .in('entity_type', MONEY_ENTITIES)
          .order('created_at', { ascending: false })
          .limit(300),
      ]);
      if (cancelled) return;
      if (!b.error) setBatches((b.data as any) || []);
      if (!n.error) setNacha((n.data as any) || []);
      if (!a.error) setAudit((a.data as any) || []);
      setLoading(false);
    };
    load();
    return () => { cancelled = true; };
  }, [agencyId]);

  const filteredBatches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return batches;
    return batches.filter(b =>
      [b.batch_number, b.status, b.payment_date].some(v => v && String(v).toLowerCase().includes(q))
    );
  }, [batches, query]);

  const totalDisbursed = useMemo(
    () => batches.filter(b => b.status === 'disbursed' || b.status === 'paid').reduce((s, b) => s + (Number(b.total_amount) || 0), 0),
    [batches]
  );

  const exportAuditCsv = () => {
    const header = ['Date', 'Action', 'Entity Type', 'Entity ID', 'Actor', 'Metadata'];
    const rows = audit.map(a => [
      new Date(a.created_at).toISOString(),
      a.action,
      a.entity_type || '',
      a.entity_id || '',
      a.actor_id || '',
      JSON.stringify(a.metadata || {}),
    ]);
    const csv = [header, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payout-audit-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Audit CSV exported');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Payouts</h2>
          <p className="text-sm text-muted-foreground">
            Every dollar that left the agency — and who approved it.
          </p>
        </div>
        <div className="flex gap-3">
          <Card className="px-4 py-2">
            <p className="text-[10px] uppercase text-muted-foreground tracking-wide">Total Disbursed</p>
            <p className="text-lg font-semibold">{fmtMoney(totalDisbursed)}</p>
          </Card>
          <Card className="px-4 py-2">
            <p className="text-[10px] uppercase text-muted-foreground tracking-wide">Batches</p>
            <p className="text-lg font-semibold">{batches.length}</p>
          </Card>
          <Card className="px-4 py-2">
            <p className="text-[10px] uppercase text-muted-foreground tracking-wide">ACH Files</p>
            <p className="text-lg font-semibold">{nacha.length}</p>
          </Card>
        </div>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="space-y-4">
        <TabsList className="h-auto gap-1 flex-wrap">
          <TabsTrigger value="disbursements"><Banknote className="w-3.5 h-3.5 mr-1" /> Disbursements</TabsTrigger>
          <TabsTrigger value="ach"><FileText className="w-3.5 h-3.5 mr-1" /> ACH Files</TabsTrigger>
          <TabsTrigger value="audit"><ScrollText className="w-3.5 h-3.5 mr-1" /> Payout Audit</TabsTrigger>
        </TabsList>

        <TabsContent value="disbursements">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-3">
              <CardTitle className="text-base">HAP Batches</CardTitle>
              <Input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Filter by batch # / status…"
                className="max-w-xs h-8 text-sm"
              />
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
              ) : filteredBatches.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">No batches yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                      <tr>
                        <th className="text-left px-4 py-2">Batch #</th>
                        <th className="text-left px-4 py-2">Payment Date</th>
                        <th className="text-left px-4 py-2">Status</th>
                        <th className="text-right px-4 py-2">Payments</th>
                        <th className="text-right px-4 py-2">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredBatches.map(b => (
                        <tr key={b.id} className="border-t hover:bg-muted/30">
                          <td className="px-4 py-2 font-mono text-xs">{b.batch_number || b.id.slice(0, 8)}</td>
                          <td className="px-4 py-2">{fmtDate(b.payment_date)}</td>
                          <td className="px-4 py-2"><Badge variant="outline" className="text-xs">{b.status || '—'}</Badge></td>
                          <td className="px-4 py-2 text-right">{b.payment_count ?? '—'}</td>
                          <td className="px-4 py-2 text-right font-medium">{fmtMoney(b.total_amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ach">
          <Card>
            <CardHeader><CardTitle className="text-base">Generated NACHA Files</CardTitle></CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
              ) : nacha.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">No ACH files generated yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                      <tr>
                        <th className="text-left px-4 py-2">File</th>
                        <th className="text-left px-4 py-2">Generated</th>
                        <th className="text-left px-4 py-2">Status</th>
                        <th className="text-right px-4 py-2">Entries</th>
                        <th className="text-right px-4 py-2">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {nacha.map(f => (
                        <tr key={f.id} className="border-t hover:bg-muted/30">
                          <td className="px-4 py-2 font-mono text-xs">{f.file_name || f.id.slice(0, 8)}</td>
                          <td className="px-4 py-2">{fmtDate(f.generated_at)}</td>
                          <td className="px-4 py-2"><Badge variant="outline" className="text-xs">{f.status || '—'}</Badge></td>
                          <td className="px-4 py-2 text-right">{f.entry_count ?? '—'}</td>
                          <td className="px-4 py-2 text-right font-medium">{fmtMoney(f.total_amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base">Payout Audit Trail</CardTitle>
                <p className="text-xs text-muted-foreground mt-1">Money-movement events only — system audit lives under Admin → Audit.</p>
              </div>
              <Button variant="outline" size="sm" onClick={exportAuditCsv} disabled={audit.length === 0}>
                <Download className="w-3.5 h-3.5 mr-1" /> Export CSV
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
              ) : audit.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">No payout events recorded yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                      <tr>
                        <th className="text-left px-4 py-2">When</th>
                        <th className="text-left px-4 py-2">Action</th>
                        <th className="text-left px-4 py-2">Entity</th>
                        <th className="text-left px-4 py-2">Actor</th>
                        <th className="text-left px-4 py-2">Details</th>
                      </tr>
                    </thead>
                    <tbody>
                      {audit.map(a => (
                        <tr key={a.id} className="border-t hover:bg-muted/30 align-top">
                          <td className="px-4 py-2 whitespace-nowrap">{new Date(a.created_at).toLocaleString()}</td>
                          <td className="px-4 py-2 font-medium">{a.action}</td>
                          <td className="px-4 py-2 text-xs text-muted-foreground">{a.entity_type}</td>
                          <td className="px-4 py-2 font-mono text-[11px]">{a.actor_id ? a.actor_id.slice(0, 8) : '—'}</td>
                          <td className="px-4 py-2 text-xs text-muted-foreground max-w-md truncate">
                            {a.metadata ? JSON.stringify(a.metadata) : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AgencyPayouts;

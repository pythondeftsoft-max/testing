import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';

interface LogRow {
  id: string;
  actor_user_id: string | null;
  actor_role: string | null;
  target_table: string;
  target_row_id: string | null;
  field: string;
  action: string;
  reason: string | null;
  ip: string | null;
  created_at: string;
}

export default function PiiAccessLogPage() {
  const [rows, setRows] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('pii_access_log')
        .select('id, actor_user_id, actor_role, target_table, target_row_id, field, action, reason, ip, created_at')
        .order('created_at', { ascending: false })
        .limit(500);
      if (!error && data) setRows(data as LogRow[]);
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(r =>
      [r.target_table, r.field, r.action, r.actor_role ?? '', r.reason ?? '']
        .some(v => v.toLowerCase().includes(q))
    );
  }, [rows, filter]);

  const exportCsv = () => {
    const header = ['created_at', 'actor_user_id', 'actor_role', 'target_table', 'target_row_id', 'field', 'action', 'reason', 'ip'];
    const lines = [header.join(',')];
    for (const r of filtered) {
      lines.push([r.created_at, r.actor_user_id ?? '', r.actor_role ?? '', r.target_table, r.target_row_id ?? '', r.field, r.action, (r.reason ?? '').replace(/[",\n]/g, ' '), r.ip ?? ''].join(','));
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `pii-access-log-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="container mx-auto p-6 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>PII Access Log</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input placeholder="Filter by table, field, action, actor, reason…" value={filter} onChange={e => setFilter(e.target.value)} className="max-w-md" />
            <Button variant="outline" onClick={exportCsv}>Export CSV</Button>
          </div>
          {loading ? (
            <p className="text-muted-foreground">Loading…</p>
          ) : filtered.length === 0 ? (
            <p className="text-muted-foreground">No access events recorded.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b">
                    <th className="py-2 pr-4">When</th>
                    <th className="py-2 pr-4">Action</th>
                    <th className="py-2 pr-4">Target</th>
                    <th className="py-2 pr-4">Actor</th>
                    <th className="py-2 pr-4">Reason</th>
                    <th className="py-2 pr-4">IP</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(r => (
                    <tr key={r.id} className="border-b hover:bg-muted/40">
                      <td className="py-2 pr-4 whitespace-nowrap">{format(new Date(r.created_at), 'yyyy-MM-dd HH:mm:ss')}</td>
                      <td className="py-2 pr-4">
                        <Badge variant={r.action === 'reveal' ? 'destructive' : r.action === 'store' ? 'default' : 'secondary'}>{r.action}</Badge>
                      </td>
                      <td className="py-2 pr-4 font-mono text-xs">{r.target_table}.{r.field}<br /><span className="text-muted-foreground">{r.target_row_id?.slice(0, 8)}</span></td>
                      <td className="py-2 pr-4 font-mono text-xs">{r.actor_user_id?.slice(0, 8) ?? '—'}<br /><span className="text-muted-foreground">{r.actor_role}</span></td>
                      <td className="py-2 pr-4 max-w-xs truncate">{r.reason ?? '—'}</td>
                      <td className="py-2 pr-4 font-mono text-xs">{r.ip ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

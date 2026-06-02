import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Download, FileSpreadsheet, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface GlExport {
  id: string;
  export_name: string;
  format: string;
  period_start: string;
  period_end: string;
  source_types: string[];
  record_count: number;
  total_amount: number;
  file_path: string | null;
  file_name: string | null;
  status: string;
  created_at: string;
}

const FORMAT_LABELS: Record<string, string> = {
  quickbooks_iif: 'QuickBooks (.iif)',
  sage_csv: 'Sage 50/Intacct CSV',
  generic_csv: 'Generic CSV',
  generic_journal: 'Generic JSON Journal',
};

interface Props { agencyId: string; }

const AgencyGlExports: React.FC<Props> = ({ agencyId }) => {
  const qc = useQueryClient();
  const [generating, setGenerating] = useState(false);
  const [periodStart, setPeriodStart] = useState(() => {
    const d = new Date(); d.setDate(1); return d.toISOString().slice(0, 10);
  });
  const [periodEnd, setPeriodEnd] = useState(() => new Date().toISOString().slice(0, 10));
  const [exportFormat, setExportFormat] = useState('generic_csv');
  const [sources, setSources] = useState<string[]>(['hap_batches']);

  const { data: exports, isLoading } = useQuery({
    queryKey: ['agency-gl-exports', agencyId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('agency_gl_exports')
        .select('*')
        .eq('agency_id', agencyId)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data || []) as GlExport[];
    },
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('generate-gl-export', {
        body: {
          agency_id: agencyId,
          format: exportFormat,
          period_start: periodStart,
          period_end: periodEnd,
          source_types: sources,
          export_name: `GL ${periodStart} – ${periodEnd}`,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data: any) => {
      toast.success(`Export ready: ${data.record_count} lines, $${Number(data.total_amount).toFixed(2)}`);
      qc.invalidateQueries({ queryKey: ['agency-gl-exports', agencyId] });
      if (data.signedUrl) {
        const a = document.createElement('a');
        a.href = data.signedUrl;
        a.download = data.fileName;
        a.click();
      }
    },
    onError: (e: any) => toast.error(e.message || 'Failed to generate export'),
  });

  const handleDownload = async (filePath: string, fileName: string) => {
    const { data } = await supabase.storage.from('agency-generated-docs').createSignedUrl(filePath, 300);
    if (data?.signedUrl) {
      const a = document.createElement('a');
      a.href = data.signedUrl;
      a.download = fileName;
      a.click();
    } else {
      toast.error('Download link unavailable');
    }
  };

  const toggleSource = (s: string) => {
    setSources(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-primary" />
            GL / Accounting Export
          </CardTitle>
          <CardDescription>
            Generate journal entries from HAP batches and tenant ledger for QuickBooks, Sage, or any accounting system.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <Label>Period Start</Label>
              <Input type="date" value={periodStart} onChange={e => setPeriodStart(e.target.value)} />
            </div>
            <div>
              <Label>Period End</Label>
              <Input type="date" value={periodEnd} onChange={e => setPeriodEnd(e.target.value)} />
            </div>
            <div>
              <Label>Format</Label>
              <Select value={exportFormat} onValueChange={setExportFormat}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(FORMAT_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="mb-2 block">Data Sources</Label>
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox checked={sources.includes('hap_batches')} onCheckedChange={() => toggleSource('hap_batches')} />
                <span className="text-sm">HAP Batches</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox checked={sources.includes('tenant_ledger')} onCheckedChange={() => toggleSource('tenant_ledger')} />
                <span className="text-sm">Tenant Ledger</span>
              </label>
            </div>
          </div>

          <Button
            onClick={() => generateMutation.mutate()}
            disabled={generateMutation.isPending || sources.length === 0}
          >
            {generateMutation.isPending
              ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating...</>
              : <><Sparkles className="w-4 h-4 mr-2" /> Generate Export</>}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Recent Exports</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
          ) : !exports?.length ? (
            <p className="text-center text-muted-foreground py-6 text-sm">No exports yet. Generate your first one above.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Format</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Lines</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {exports.map(e => (
                  <TableRow key={e.id}>
                    <TableCell className="font-medium text-sm">{e.export_name}</TableCell>
                    <TableCell><Badge variant="outline">{FORMAT_LABELS[e.format] || e.format}</Badge></TableCell>
                    <TableCell className="text-xs">{e.period_start} → {e.period_end}</TableCell>
                    <TableCell>{e.record_count}</TableCell>
                    <TableCell>${Number(e.total_amount).toFixed(2)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {format(new Date(e.created_at), 'MMM d, h:mm a')}
                    </TableCell>
                    <TableCell>
                      {e.file_path && (
                        <Button size="sm" variant="ghost" onClick={() => handleDownload(e.file_path!, e.file_name || 'export')}>
                          <Download className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AgencyGlExports;

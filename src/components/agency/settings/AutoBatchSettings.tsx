import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, CheckCircle2, XCircle, Loader2, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Props {
  agencyId: string;
}

interface LogRow {
  id: string;
  run_at: string;
  status: string;
  contracts_count: number;
  total_amount: number;
  error_message: string | null;
  period_month: string | null;
}

export default function AutoBatchSettings({ agencyId }: Props) {
  const [enabled, setEnabled] = useState(false);
  const [day, setDay] = useState('25');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [logs, setLogs] = useState<LogRow[]>([]);

  const load = async () => {
    setLoading(true);
    const [{ data: agency }, { data: logRows }] = await Promise.all([
      supabase
        .from('housing_authorities')
        .select('auto_batch_enabled, auto_batch_day_of_month')
        .eq('id', agencyId)
        .single(),
      supabase
        .from('auto_batch_generation_log')
        .select('id, run_at, status, contracts_count, total_amount, error_message, period_month')
        .eq('agency_id', agencyId)
        .order('run_at', { ascending: false })
        .limit(5),
    ]);
    if (agency) {
      setEnabled(!!agency.auto_batch_enabled);
      setDay(String(agency.auto_batch_day_of_month ?? 25));
    }
    setLogs((logRows as LogRow[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [agencyId]);

  const save = async () => {
    setSaving(true);
    const { error } = await supabase
      .from('housing_authorities')
      .update({
        auto_batch_enabled: enabled,
        auto_batch_day_of_month: parseInt(day, 10),
      })
      .eq('id', agencyId);
    setSaving(false);
    if (error) {
      toast.error('Failed to save: ' + error.message);
      return;
    }
    toast.success('Auto-batch settings saved');
  };

  const runNow = async () => {
    setRunning(true);
    const { data, error } = await supabase.functions.invoke('auto-generate-monthly-batches', {
      method: 'POST',
      body: { agency_id: agencyId },
      // pass via querystring since the function reads URL params
      headers: {},
    });
    // Fall back: invoke via direct fetch with querystring for force flag
    setRunning(false);
    if (error) {
      toast.error('Run failed: ' + error.message);
      return;
    }
    toast.success('Generation run complete');
    await load();
  };

  const statusBadge = (status: string) => {
    if (status === 'success')
      return <Badge variant="default" className="gap-1"><CheckCircle2 className="w-3 h-3" />Success</Badge>;
    if (status === 'skipped_existing')
      return <Badge variant="secondary">Skipped (already exists)</Badge>;
    if (status === 'skipped_no_contracts')
      return <Badge variant="outline">No active contracts</Badge>;
    return <Badge variant="destructive" className="gap-1"><XCircle className="w-3 h-3" />Error</Badge>;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="w-5 h-5" /> Auto-Generate Monthly Batches
        </CardTitle>
        <CardDescription>
          On the day you choose each month, draft a HAP payment batch from your active contracts.
          Drafts require human approval before they send — nothing goes out automatically.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between rounded-md border p-3">
          <div>
            <Label className="text-sm font-medium">Enable auto-generation</Label>
            <p className="text-xs text-muted-foreground mt-0.5">Off by default — opt in when you're ready</p>
          </div>
          <Switch checked={enabled} onCheckedChange={setEnabled} disabled={loading} />
        </div>

        <div className="flex items-center gap-3">
          <Calendar className="w-4 h-4 text-muted-foreground" />
          <Label className="text-sm">Day of month to draft</Label>
          <Select value={day} onValueChange={setDay} disabled={loading || !enabled}>
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
                <SelectItem key={d} value={String(d)}>{d}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-xs text-muted-foreground">of each month, drafts the next month's batch</span>
        </div>

        <div className="flex gap-2">
          <Button onClick={save} disabled={saving || loading}>
            {saving && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
            Save settings
          </Button>
          <Button variant="outline" onClick={runNow} disabled={running || loading}>
            {running && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
            Run now (test)
          </Button>
        </div>

        <div>
          <h4 className="text-sm font-medium mb-2">Recent runs</h4>
          {logs.length === 0 ? (
            <p className="text-xs text-muted-foreground">No runs yet</p>
          ) : (
            <div className="space-y-1.5">
              {logs.map((log) => (
                <div key={log.id} className="flex items-center justify-between rounded-md border bg-muted/30 px-3 py-2 text-xs">
                  <div className="flex items-center gap-2">
                    {statusBadge(log.status)}
                    <span className="text-muted-foreground">
                      {new Date(log.run_at).toLocaleString()}
                    </span>
                  </div>
                  <div className="text-muted-foreground">
                    {log.status === 'success' && (
                      <>{log.contracts_count} contracts · ${Number(log.total_amount).toFixed(2)}</>
                    )}
                    {log.status === 'error' && <span className="text-destructive">{log.error_message}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

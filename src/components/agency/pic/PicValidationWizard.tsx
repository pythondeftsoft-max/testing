import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, ShieldCheck, AlertTriangle, AlertCircle, CheckCircle2, PlayCircle, Info } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

interface Issue {
  tenant_id: string | null;
  family_id: string;
  action_type: string;
  severity: 'error' | 'warning' | 'info';
  field_name: string;
  error_code: string;
  message: string;
}

interface Result {
  submission_id: string;
  batch_reference: string;
  record_count: number;
  valid_count: number;
  error_count: number;
  warning_count: number;
  issues: Issue[];
}

interface Props {
  agencyId: string;
}

const SEVERITY_META = {
  error: { icon: AlertCircle, className: 'text-destructive', badge: 'destructive' as const },
  warning: { icon: AlertTriangle, className: 'text-amber-600', badge: 'secondary' as const },
  info: { icon: Info, className: 'text-blue-600', badge: 'outline' as const },
};

const PicValidationWizard: React.FC<Props> = ({ agencyId }) => {
  const qc = useQueryClient();
  const currentYear = new Date().getFullYear();
  const currentQuarter = Math.ceil((new Date().getMonth() + 1) / 3);
  const [year, setYear] = useState(String(currentYear));
  const [quarter, setQuarter] = useState(String(currentQuarter));
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [filter, setFilter] = useState<'all' | 'error' | 'warning'>('all');

  const runValidation = async () => {
    setRunning(true);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke('validate-pic-50058', {
        body: { agency_id: agencyId, fiscal_year: parseInt(year), fiscal_quarter: parseInt(quarter) },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Validation failed');
      setResult(data as Result);
      qc.invalidateQueries({ queryKey: ['agency-pic-submissions', agencyId] });
      toast.success(`Validated ${data.record_count} records · ${data.error_count} errors`);
    } catch (e: any) {
      toast.error(e.message || 'Validation failed');
    } finally {
      setRunning(false);
    }
  };

  const filteredIssues = result?.issues.filter(i => filter === 'all' || i.severity === filter) || [];
  const groupedByTenant = filteredIssues.reduce<Record<string, Issue[]>>((acc, i) => {
    const key = i.family_id;
    if (!acc[key]) acc[key] = [];
    acc[key].push(i);
    return acc;
  }, {});

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary" />
          PIC Pre-Submission Validation Wizard
        </CardTitle>
        <CardDescription>
          Run all 16 PIC validation rules against active voucher leases before generating your HUD-50058 submission file.
          Results are saved as a draft submission for review and remediation.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Fiscal Year</label>
            <Select value={year} onValueChange={setYear}>
              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                {[currentYear - 1, currentYear, currentYear + 1].map(y => (
                  <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Quarter</label>
            <Select value={quarter} onValueChange={setQuarter}>
              <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4].map(q => (
                  <SelectItem key={q} value={String(q)}>Q{q}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={runValidation} disabled={running}>
            {running ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <PlayCircle className="h-4 w-4 mr-2" />}
            {running ? 'Validating...' : 'Run Validation'}
          </Button>
        </div>

        {result && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatCard label="Records" value={result.record_count} className="bg-muted" />
              <StatCard label="Valid" value={result.valid_count} className="bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400" />
              <StatCard label="Errors" value={result.error_count} className="bg-red-50 dark:bg-red-950/30 text-destructive" />
              <StatCard label="Warnings" value={result.warning_count} className="bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400" />
            </div>

            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Saved as draft <span className="font-mono text-foreground">{result.batch_reference}</span>
              </p>
              <Select value={filter} onValueChange={(v: any) => setFilter(v)}>
                <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All issues</SelectItem>
                  <SelectItem value="error">Errors only</SelectItem>
                  <SelectItem value="warning">Warnings only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {result.issues.length === 0 ? (
              <div className="flex flex-col items-center py-10 text-center">
                <CheckCircle2 className="h-12 w-12 text-green-600 mb-2" />
                <p className="font-medium">All records pass validation</p>
                <p className="text-sm text-muted-foreground">Ready to generate the HUD-50058 submission file.</p>
              </div>
            ) : (
              <ScrollArea className="h-96 border rounded-lg">
                <div className="p-3 space-y-3">
                  {Object.entries(groupedByTenant).map(([family, items]) => (
                    <div key={family} className="border rounded-md p-3 bg-card">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-mono text-sm font-medium">{family}</span>
                        <Badge variant="outline" className="text-xs">Action {items[0].action_type}</Badge>
                      </div>
                      <div className="space-y-1">
                        {items.map((issue, idx) => {
                          const meta = SEVERITY_META[issue.severity];
                          const Icon = meta.icon;
                          return (
                            <div key={idx} className="flex items-start gap-2 text-sm">
                              <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${meta.className}`} />
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <Badge variant={meta.badge} className="text-[10px] px-1 py-0">{issue.error_code}</Badge>
                                  <span className="text-xs text-muted-foreground">{issue.field_name}</span>
                                </div>
                                <p className="text-foreground">{issue.message}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                  {result.issues.length >= 200 && (
                    <p className="text-xs text-center text-muted-foreground py-2">
                      Showing first 200 issues. Open the saved submission for the full report.
                    </p>
                  )}
                </div>
              </ScrollArea>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const StatCard: React.FC<{ label: string; value: number; className?: string }> = ({ label, value, className = '' }) => (
  <div className={`p-3 rounded-lg ${className}`}>
    <p className="text-xs font-medium opacity-80">{label}</p>
    <p className="text-2xl font-bold">{value}</p>
  </div>
);

export default PicValidationWizard;

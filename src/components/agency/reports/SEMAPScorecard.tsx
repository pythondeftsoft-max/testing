import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Download, Save, Shield, CheckCircle, XCircle, Cpu } from 'lucide-react';
import { useSEMAPIndicators } from '@/hooks/useSEMAPIndicators';
import { exportCSV, exportSEMAPPdf } from '@/lib/exportHUDReport';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import SEMAPTrendChart from './SEMAPTrendChart';

interface Props { agencyId: string; agencyName: string; canEdit?: boolean; }

const currentYear = new Date().getFullYear();
const periods = Array.from({ length: 5 }, (_, i) => `FY${currentYear - i}`);

const SEMAPScorecard: React.FC<Props> = ({ agencyId, agencyName, canEdit = false }) => {
  const [period, setPeriod] = useState(periods[0]);
  const { indicators, loading, saving, updateIndicator, saveAll, totalMax, totalScore, overallPct, passing } = useSEMAPIndicators(agencyId, period);

  const handleSave = async () => {
    await saveAll();
    toast.success('SEMAP scores saved');
  };

  const handleExportCSV = () => {
    const headers = ['Indicator_#', 'Name', 'Max_Points', 'Score', 'Status', 'Notes'];
    const rows = indicators.map(i => [
      String(i.number), i.name, String(i.maxPoints), String(i.score),
      i.score >= Math.ceil(i.maxPoints * 0.6) ? 'Pass' : 'Fail', i.notes
    ]);
    exportCSV([headers, ...rows], `SEMAP-${period}`);
  };

  const handleExportPDF = () => {
    exportSEMAPPdf(agencyName, period, indicators);
  };

  if (loading) {
    return <div className="flex justify-center py-12"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h3 className="text-lg font-semibold">SEMAP Self-Assessment Scorecard</h3>
          <p className="text-sm text-muted-foreground">14 HUD Performance Indicators — 60% threshold to pass</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>{periods.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={handleExportCSV}><Download className="w-4 h-4 mr-1" /> CSV</Button>
          <Button variant="outline" size="sm" onClick={handleExportPDF}><Download className="w-4 h-4 mr-1" /> PDF</Button>
          {canEdit && (
            <Button size="sm" onClick={handleSave} disabled={saving}>
              <Save className="w-4 h-4 mr-1" /> {saving ? 'Saving...' : 'Save'}
            </Button>
          )}
        </div>
      </div>

      {/* Overall Score Banner */}
      <Card className={passing ? 'border-green-500/50 bg-green-50/50 dark:bg-green-950/20' : 'border-red-500/50 bg-red-50/50 dark:bg-red-950/20'}>
        <CardContent className="py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className={`w-8 h-8 ${passing ? 'text-green-600' : 'text-red-600'}`} />
            <div>
              <p className="text-sm text-muted-foreground">Overall SEMAP Score</p>
              <p className="text-2xl font-bold">{totalScore} / {totalMax} ({overallPct}%)</p>
            </div>
          </div>
          <Badge variant={passing ? 'default' : 'destructive'} className="text-lg px-4 py-1">
            {passing ? 'HIGH PERFORMER' : 'BELOW STANDARD'}
          </Badge>
        </CardContent>
      </Card>

      {/* Score Trend Over Time */}
      <SEMAPTrendChart agencyId={agencyId} />

      {/* Indicators Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-3 w-12">#</th>
                  <th className="text-left p-3">Indicator</th>
                  <th className="text-center p-3 w-20">Max</th>
                  <th className="text-center p-3 w-24">Score</th>
                  <th className="text-center p-3 w-20">Status</th>
                  <th className="text-left p-3 w-48">Notes</th>
                </tr>
              </thead>
              <tbody>
                {indicators.map(ind => {
                  const pass = ind.score >= Math.ceil(ind.maxPoints * 0.6);
                  return (
                    <tr key={ind.number} className="border-b hover:bg-muted/30">
                      <td className="p-3 font-mono text-muted-foreground">{ind.number}</td>
                      <td className="p-3">
                        <div className="font-medium">{ind.name}</div>
                        <div className="text-xs text-muted-foreground">{ind.description}</div>
                        {ind.autoComputed && (
                          <Badge variant="outline" className="mt-1 text-xs gap-1"><Cpu className="w-3 h-3" /> Auto-computed</Badge>
                        )}
                      </td>
                      <td className="p-3 text-center font-mono">{ind.maxPoints}</td>
                      <td className="p-3 text-center">
                        {canEdit ? (
                          <Input
                            type="number"
                            min={0}
                            max={ind.maxPoints}
                            value={ind.score}
                            onChange={e => updateIndicator(ind.number, { score: Math.min(ind.maxPoints, Math.max(0, parseInt(e.target.value) || 0)) })}
                            className="w-16 mx-auto text-center h-8"
                          />
                        ) : (
                          <span className="font-mono font-bold">{ind.score}</span>
                        )}
                      </td>
                      <td className="p-3 text-center">
                        {pass ? <CheckCircle className="w-5 h-5 text-green-600 mx-auto" /> : <XCircle className="w-5 h-5 text-red-500 mx-auto" />}
                      </td>
                      <td className="p-3">
                        {canEdit ? (
                          <Input
                            value={ind.notes}
                            onChange={e => updateIndicator(ind.number, { notes: e.target.value })}
                            placeholder="Add notes..."
                            className="h-8 text-xs"
                          />
                        ) : (
                          <span className="text-xs text-muted-foreground">{ind.notes || '—'}</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SEMAPScorecard;

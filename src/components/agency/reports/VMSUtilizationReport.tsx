import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, TrendingUp, DollarSign, Home, Percent } from 'lucide-react';
import { useVMSReport } from '@/hooks/useVMSReport';
import { exportCSV } from '@/lib/exportHUDReport';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface Props { agencyId: string; }

const VMSUtilizationReport: React.FC<Props> = ({ agencyId }) => {
  const { data, summary, loading } = useVMSReport(agencyId);

  const handleExport = () => {
    const headers = ['Month', 'Allocated', 'Leased', 'Utilization_Pct', 'HAP_Expense'];
    const rows = data.map(d => [d.month, String(d.allocated), String(d.leased), `${d.utilizationPct}%`, String(d.hapExpense)]);
    exportCSV([headers, ...rows], 'VMS-Utilization-Report');
  };

  if (loading) {
    return <div className="flex justify-center py-12"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Voucher Management System (VMS) Report</h3>
          <p className="text-sm text-muted-foreground">Monthly voucher utilization and HAP expenditure tracking</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleExport}>
          <Download className="w-4 h-4 mr-2" /> Export CSV
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1"><Home className="w-3 h-3" /> Total Allocated</div>
            <p className="text-2xl font-bold">{summary.totalAllocated}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1"><TrendingUp className="w-3 h-3" /> Leased Up</div>
            <p className="text-2xl font-bold">{summary.totalLeased}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1"><Percent className="w-3 h-3" /> Utilization</div>
            <p className={`text-2xl font-bold ${summary.utilizationPct >= 95 ? 'text-green-600' : summary.utilizationPct >= 80 ? 'text-yellow-600' : 'text-red-600'}`}>
              {summary.utilizationPct}%
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1"><DollarSign className="w-3 h-3" /> Monthly HAP</div>
            <p className="text-2xl font-bold">${summary.totalHAP.toLocaleString()}</p>
          </CardContent>
        </Card>
      </div>

      {data.length > 0 ? (
        <Card>
          <CardHeader><CardTitle className="text-sm">Monthly Utilization Trend</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="allocated" name="Allocated" fill="hsl(var(--muted-foreground))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="leased" name="Leased" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      ) : (
        <Card><CardContent className="py-12 text-center text-muted-foreground">No voucher data available for trend analysis</CardContent></Card>
      )}
    </div>
  );
};

export default VMSUtilizationReport;

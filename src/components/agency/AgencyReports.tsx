import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Download, TrendingUp, Users, ClipboardCheck, FileText } from 'lucide-react';

interface AgencyReportsProps {
  agencyId: string;
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--accent))', 'hsl(var(--muted))', '#f59e0b', '#10b981', '#ef4444'];

const AgencyReports: React.FC<AgencyReportsProps> = ({ agencyId }) => {
  const [voucherData, setVoucherData] = useState<any[]>([]);
  const [inspectionData, setInspectionData] = useState<any[]>([]);
  const [rftaData, setRftaData] = useState<any[]>([]);
  const [caseloadData, setCaseloadData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!agencyId) return;
    const fetchAll = async () => {
      setLoading(true);
      // Voucher stats
      const { data: vouchers } = await supabase
        .from('agency_vouchers')
        .select('status')
        .eq('agency_id', agencyId);
      if (vouchers) {
        const counts: Record<string, number> = {};
        vouchers.forEach((v: any) => { counts[v.status] = (counts[v.status] || 0) + 1; });
        setVoucherData(Object.entries(counts).map(([name, value]) => ({ name: name.replace(/_/g, ' '), value })));
      }

      // Inspection stats
      const { data: inspections } = await supabase
        .from('inspections')
        .select('result')
        .eq('agency_id', agencyId);
      if (inspections) {
        const counts: Record<string, number> = {};
        inspections.forEach((i: any) => { counts[i.result || 'pending'] = (counts[i.result || 'pending'] || 0) + 1; });
        setInspectionData(Object.entries(counts).map(([name, value]) => ({ name, value })));
      }

      // RFTA stats
      const { data: rftas } = await supabase
        .from('rfta_packets')
        .select('status, created_at, submitted_at, reviewed_at')
        .eq('agency_id', agencyId);
      if (rftas) {
        const counts: Record<string, number> = {};
        rftas.forEach((r: any) => { counts[r.status] = (counts[r.status] || 0) + 1; });
        setRftaData(Object.entries(counts).map(([name, value]) => ({ name: name.replace(/_/g, ' '), value })));
      }

      // Caseload per caseworker
      const { data: assignments } = await supabase
        .from('caseworker_assignments')
        .select('caseworker_id, is_active')
        .eq('is_active', true);
      if (assignments) {
        const counts: Record<string, number> = {};
        assignments.forEach((a: any) => { counts[a.caseworker_id] = (counts[a.caseworker_id] || 0) + 1; });
        // Fetch caseworker names
        const ids = Object.keys(counts);
        if (ids.length) {
          const { data: staff } = await supabase
            .from('agency_staff')
            .select('id, user_id')
            .in('id', ids);
          const userIds = staff?.map((s: any) => s.user_id) || [];
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, full_name')
            .in('id', userIds);
          const nameMap: Record<string, string> = {};
          profiles?.forEach((p: any) => { nameMap[p.id] = p.full_name || 'Unknown'; });
          const staffUserMap: Record<string, string> = {};
          staff?.forEach((s: any) => { staffUserMap[s.id] = s.user_id; });

          setCaseloadData(Object.entries(counts).map(([staffId, count]) => ({
            name: nameMap[staffUserMap[staffId]] || staffId.slice(0, 8),
            cases: count,
          })));
        }
      }

      setLoading(false);
    };
    fetchAll();
  }, [agencyId]);

  const exportCSV = (data: any[], filename: string) => {
    if (!data.length) return;
    const headers = Object.keys(data[0]);
    const csv = [headers.join(','), ...data.map(row => headers.map(h => row[h]).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return <div className="flex justify-center py-12"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Agency Reports</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Voucher Utilization */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="w-4 h-4" /> Voucher Status Distribution
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={() => exportCSV(voucherData, 'voucher-status')}>
              <Download className="w-4 h-4" />
            </Button>
          </CardHeader>
          <CardContent>
            {voucherData.length ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={voucherData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                    {voucherData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : <p className="text-sm text-muted-foreground text-center py-8">No voucher data</p>}
          </CardContent>
        </Card>

        {/* Inspection Results */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <ClipboardCheck className="w-4 h-4" /> Inspection Results
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={() => exportCSV(inspectionData, 'inspection-results')}>
              <Download className="w-4 h-4" />
            </Button>
          </CardHeader>
          <CardContent>
            {inspectionData.length ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={inspectionData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <p className="text-sm text-muted-foreground text-center py-8">No inspection data</p>}
          </CardContent>
        </Card>

        {/* RFTA Pipeline */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <FileText className="w-4 h-4" /> RFTA Pipeline
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={() => exportCSV(rftaData, 'rfta-pipeline')}>
              <Download className="w-4 h-4" />
            </Button>
          </CardHeader>
          <CardContent>
            {rftaData.length ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={rftaData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <p className="text-sm text-muted-foreground text-center py-8">No RFTA data</p>}
          </CardContent>
        </Card>

        {/* Caseload Distribution */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="w-4 h-4" /> Caseload per Caseworker
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={() => exportCSV(caseloadData, 'caseload-distribution')}>
              <Download className="w-4 h-4" />
            </Button>
          </CardHeader>
          <CardContent>
            {caseloadData.length ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={caseloadData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="cases" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <p className="text-sm text-muted-foreground text-center py-8">No caseload data</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AgencyReports;

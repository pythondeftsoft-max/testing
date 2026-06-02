import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { BarChart3, Loader2 } from 'lucide-react';

interface Props {
  agencyId: string;
}

interface CaseworkerRow {
  name: string;
  activeTenants: number;
  overdueRecerts: number;
  pendingInspections: number;
}

const workloadBadge = (total: number) => {
  if (total >= 10) return <Badge variant="destructive" className="text-xs">High</Badge>;
  if (total >= 5) return <Badge variant="warning" className="text-xs">Medium</Badge>;
  return <Badge variant="default" className="text-xs">Normal</Badge>;
};

const CaseloadAnalyticsCard: React.FC<Props> = ({ agencyId }) => {
  const [rows, setRows] = useState<CaseworkerRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const [staffRes, leasesRes, recertsRes, inspRes] = await Promise.all([
        supabase.from('agency_staff').select('id, user_id, profiles!agency_staff_user_id_fkey(full_name)').eq('agency_id', agencyId).eq('role', 'caseworker'),
        supabase.from('tenant_leases').select('id, caseworker_id, status').eq('agency_id', agencyId).eq('status', 'active'),
        supabase.from('agency_recertifications').select('id, assigned_to, status, due_date').eq('agency_id', agencyId).in('status', ['pending', 'overdue'] as any),
        supabase.from('inspections').select('id, inspector_id, status').eq('agency_id', agencyId).in('status', ['scheduled', 'in_progress'] as any),
      ]);

      const staff = (staffRes.data || []) as any[];
      const leases = (leasesRes.data || []) as any[];
      const recerts = (recertsRes.data || []) as any[];
      const inspections = (inspRes.data || []) as any[];
      const now = new Date().toISOString();

      const result: CaseworkerRow[] = staff.map(s => ({
        name: s.profiles?.full_name || s.id.slice(0, 8),
        activeTenants: leases.filter(l => l.caseworker_id === s.id).length,
        overdueRecerts: recerts.filter(r => r.assigned_to === s.user_id && r.due_date < now).length,
        pendingInspections: inspections.filter(i => i.inspector_id === s.id).length,
      }));

      result.sort((a, b) => (b.overdueRecerts + b.pendingInspections) - (a.overdueRecerts + a.pendingInspections));
      setRows(result);
      setLoading(false);
    };
    fetch();
  }, [agencyId]);

  if (loading) return <Card><CardContent className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-primary" /></CardContent></Card>;
  if (!rows.length) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <BarChart3 className="h-4 w-4" /> Caseload Analytics
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Caseworker</TableHead>
              <TableHead className="text-center">Active Tenants</TableHead>
              <TableHead className="text-center">Overdue Recerts</TableHead>
              <TableHead className="text-center">Pending Inspections</TableHead>
              <TableHead className="text-center">Load</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r, i) => (
              <TableRow key={i}>
                <TableCell className="font-medium text-sm">{r.name}</TableCell>
                <TableCell className="text-center">{r.activeTenants}</TableCell>
                <TableCell className="text-center">
                  <span className={r.overdueRecerts > 0 ? 'text-destructive font-semibold' : ''}>{r.overdueRecerts}</span>
                </TableCell>
                <TableCell className="text-center">{r.pendingInspections}</TableCell>
                <TableCell className="text-center">{workloadBadge(r.overdueRecerts + r.pendingInspections)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default CaseloadAnalyticsCard;

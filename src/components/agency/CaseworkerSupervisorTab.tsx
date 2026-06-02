import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Users, Shuffle, AlertTriangle, Loader2, Search, ArrowRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Props {
  agencyId: string;
}

interface CaseworkerStat {
  staffId: string;
  userId: string;
  name: string;
  activeTenants: number;
  overdueRecerts: number;
  upcomingRecerts: number;
  pendingInspections: number;
}

interface AssignmentRow {
  id: string;
  tenant_id: string;
  caseworker_id: string;
  tenant_name: string;
  caseworker_name: string;
}

const loadBadge = (tenants: number) => {
  if (tenants >= 60) return <Badge variant="destructive" className="text-xs">Overloaded</Badge>;
  if (tenants >= 35) return <Badge variant="warning" className="text-xs">Heavy</Badge>;
  if (tenants >= 15) return <Badge variant="default" className="text-xs">Healthy</Badge>;
  return <Badge variant="secondary" className="text-xs">Light</Badge>;
};

const CaseworkerSupervisorTab: React.FC<Props> = ({ agencyId }) => {
  const [caseworkers, setCaseworkers] = useState<CaseworkerStat[]>([]);
  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [reassignOpen, setReassignOpen] = useState(false);
  const [reassignRow, setReassignRow] = useState<AssignmentRow | null>(null);
  const [newCaseworker, setNewCaseworker] = useState('');
  const [working, setWorking] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);

    const [staffRes, asgRes, recertRes, inspRes] = await Promise.all([
      supabase
        .from('agency_staff')
        .select('id, user_id, role, profiles:user_id(full_name, email)')
        .eq('agency_id', agencyId)
        .eq('is_active', true)
        .in('role', ['caseworker', 'caseworker_supervisor'] as any),
      (supabase
        .from('caseworker_assignments') as any)
        .select('id, tenant_id, caseworker_id, profiles:tenant_id(full_name)')
        .eq('agency_id', agencyId)
        .eq('is_active', true),
      (supabase
        .from('agency_recertifications') as any)
        .select('id, assigned_to, status, due_date')
        .eq('agency_id', agencyId)
        .in('status', ['pending', 'overdue', 'initiated', 'docs_requested', 'under_review']),
      supabase
        .from('inspections')
        .select('id, inspector_id, status')
        .eq('agency_id', agencyId)
        .in('status', ['scheduled', 'in_progress'] as any),
    ]);

    const staff = (staffRes.data || []) as any[];
    const asg = (asgRes.data || []) as any[];
    const recerts = (recertRes.data || []) as any[];
    const inspections = (inspRes.data || []) as any[];

    const today = new Date();
    const in30 = new Date();
    in30.setDate(today.getDate() + 30);

    const staffById = new Map(staff.map(s => [s.id, s]));

    const stats: CaseworkerStat[] = staff
      .filter(s => s.role === 'caseworker')
      .map(s => {
        const myAssignments = asg.filter(a => a.caseworker_id === s.id);
        const overdue = recerts.filter(r => r.assigned_to === s.user_id && r.due_date && new Date(r.due_date) < today).length;
        const upcoming = recerts.filter(r => {
          if (r.assigned_to !== s.user_id || !r.due_date) return false;
          const d = new Date(r.due_date);
          return d >= today && d <= in30;
        }).length;
        const insp = inspections.filter(i => i.inspector_id === s.id).length;
        return {
          staffId: s.id,
          userId: s.user_id,
          name: s.profiles?.full_name || s.profiles?.email || s.id.slice(0, 8),
          activeTenants: myAssignments.length,
          overdueRecerts: overdue,
          upcomingRecerts: upcoming,
          pendingInspections: insp,
        };
      })
      .sort((a, b) => b.activeTenants - a.activeTenants);

    const assignRows: AssignmentRow[] = asg.map(a => ({
      id: a.id,
      tenant_id: a.tenant_id,
      caseworker_id: a.caseworker_id,
      tenant_name: a.profiles?.full_name || a.tenant_id.slice(0, 8),
      caseworker_name: staffById.get(a.caseworker_id)?.profiles?.full_name || 'Unassigned',
    }));

    setCaseworkers(stats);
    setAssignments(assignRows);
    setLoading(false);
  }, [agencyId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filteredAssignments = useMemo(() => {
    if (!search.trim()) return assignments;
    const q = search.toLowerCase();
    return assignments.filter(a =>
      a.tenant_name.toLowerCase().includes(q) ||
      a.caseworker_name.toLowerCase().includes(q)
    );
  }, [assignments, search]);

  const totalTenants = caseworkers.reduce((sum, cw) => sum + cw.activeTenants, 0);
  const totalOverdue = caseworkers.reduce((sum, cw) => sum + cw.overdueRecerts, 0);
  const avgLoad = caseworkers.length ? Math.round(totalTenants / caseworkers.length) : 0;

  const openReassign = (row: AssignmentRow) => {
    setReassignRow(row);
    setNewCaseworker('');
    setReassignOpen(true);
  };

  const handleReassign = async () => {
    if (!reassignRow || !newCaseworker) {
      toast.error('Select a caseworker');
      return;
    }
    if (newCaseworker === reassignRow.caseworker_id) {
      toast.error('That tenant is already assigned to this caseworker');
      return;
    }
    setWorking(true);

    // Deactivate old assignment, create new
    await (supabase.from('caseworker_assignments') as any)
      .update({ is_active: false })
      .eq('id', reassignRow.id);

    const { error } = await supabase.from('caseworker_assignments').insert({
      agency_id: agencyId,
      caseworker_id: newCaseworker,
      tenant_id: reassignRow.tenant_id,
      is_active: true,
    } as any);

    if (error) {
      toast.error('Failed to reassign');
      setWorking(false);
      return;
    }

    toast.success('Tenant reassigned');
    setReassignOpen(false);
    setWorking(false);
    fetchData();
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Active Caseworkers</p>
            <p className="text-2xl font-semibold">{caseworkers.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Total Tenants Assigned</p>
            <p className="text-2xl font-semibold">{totalTenants}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Avg Caseload</p>
            <p className="text-2xl font-semibold">{avgLoad}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Overdue Recerts</p>
            <p className={`text-2xl font-semibold ${totalOverdue > 0 ? 'text-destructive' : ''}`}>{totalOverdue}</p>
          </CardContent>
        </Card>
      </div>

      {/* Caseworker workload grid */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" /> Caseload Balance
          </CardTitle>
        </CardHeader>
        <CardContent>
          {caseworkers.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">No active caseworkers in this agency.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Caseworker</TableHead>
                  <TableHead className="text-center">Active Tenants</TableHead>
                  <TableHead className="text-center">Recerts (next 30d)</TableHead>
                  <TableHead className="text-center">Overdue Recerts</TableHead>
                  <TableHead className="text-center">Open Inspections</TableHead>
                  <TableHead className="text-center">Load</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {caseworkers.map(cw => (
                  <TableRow key={cw.staffId}>
                    <TableCell className="font-medium">{cw.name}</TableCell>
                    <TableCell className="text-center">{cw.activeTenants}</TableCell>
                    <TableCell className="text-center">{cw.upcomingRecerts}</TableCell>
                    <TableCell className="text-center">
                      {cw.overdueRecerts > 0 ? (
                        <span className="inline-flex items-center gap-1 text-destructive font-semibold">
                          <AlertTriangle className="h-3 w-3" />
                          {cw.overdueRecerts}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">0</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">{cw.pendingInspections}</TableCell>
                    <TableCell className="text-center">{loadBadge(cw.activeTenants)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Reassign tenants */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Shuffle className="h-4 w-4" /> Tenant Assignments
            </CardTitle>
            <div className="relative w-64">
              <Search className="h-4 w-4 absolute left-2 top-2.5 text-muted-foreground" />
              <Input
                placeholder="Search tenant or caseworker"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredAssignments.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">No assignments found.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tenant</TableHead>
                  <TableHead>Current Caseworker</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAssignments.slice(0, 100).map(a => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">{a.tenant_name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{a.caseworker_name}</TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" onClick={() => openReassign(a)} className="gap-1">
                        Reassign <ArrowRight className="h-3 w-3" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {filteredAssignments.length > 100 && (
            <p className="text-xs text-muted-foreground mt-2 text-center">
              Showing first 100 of {filteredAssignments.length} — refine search to see more.
            </p>
          )}
        </CardContent>
      </Card>

      <Dialog open={reassignOpen} onOpenChange={setReassignOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reassign {reassignRow?.tenant_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              Currently assigned to <span className="font-medium text-foreground">{reassignRow?.caseworker_name}</span>
            </div>
            <div>
              <Label>New Caseworker</Label>
              <Select value={newCaseworker} onValueChange={setNewCaseworker}>
                <SelectTrigger><SelectValue placeholder="Select caseworker" /></SelectTrigger>
                <SelectContent>
                  {caseworkers.map(cw => (
                    <SelectItem key={cw.staffId} value={cw.staffId}>
                      {cw.name} ({cw.activeTenants} tenants)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReassignOpen(false)}>Cancel</Button>
            <Button onClick={handleReassign} disabled={working || !newCaseworker}>
              {working ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Reassigning…</> : 'Reassign'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CaseworkerSupervisorTab;

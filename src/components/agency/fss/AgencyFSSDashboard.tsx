import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, DollarSign, CheckCircle2, UserPlus, Search, RefreshCw } from 'lucide-react';
import { useFSSParticipants, FSSParticipant } from '@/hooks/useFSSParticipants';
import EnrollFSSDialog from './EnrollFSSDialog';
import FSSParticipantDetail from './FSSParticipantDetail';
import { format, parseISO } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';

const STATUS_COLORS: Record<string, string> = {
  enrolled: 'bg-blue-100 text-blue-800',
  active: 'bg-green-100 text-green-800',
  completed: 'bg-purple-100 text-purple-800',
  terminated: 'bg-red-100 text-red-800',
  expired: 'bg-gray-100 text-gray-800',
};

interface AgencyFSSDashboardProps {
  agencyId: string;
  canManage: boolean;
  tenants?: { id: string; name: string }[];
}

const AgencyFSSDashboard: React.FC<AgencyFSSDashboardProps> = ({ agencyId, canManage, tenants = [] }) => {
  const { participants, loading, enrollParticipant, updateParticipant, fetchEscrow, addEscrowEntry, refresh, activeCount, completedCount, totalParticipants } = useFSSParticipants(agencyId);

  const [enrollOpen, setEnrollOpen] = useState(false);
  const [selectedParticipant, setSelectedParticipant] = useState<FSSParticipant | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const filtered = participants.filter(p => {
    if (statusFilter !== 'all' && p.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (p.tenant_name || '').toLowerCase().includes(q);
    }
    return true;
  });

  const goalsProgress = participants.reduce((acc, p) => {
    const completed = (p.itsp_goals || []).filter(g => g.status === 'completed').length;
    const total = (p.itsp_goals || []).length;
    return { completed: acc.completed + completed, total: acc.total + total };
  }, { completed: 0, total: 0 });

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-md bg-primary/10"><Users className="w-5 h-5 text-primary" /></div>
            <div>
              <p className="text-xs text-muted-foreground">Active Participants</p>
              <p className="text-2xl font-bold">{activeCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-md bg-purple-100"><CheckCircle2 className="w-5 h-5 text-purple-600" /></div>
            <div>
              <p className="text-xs text-muted-foreground">Completed</p>
              <p className="text-2xl font-bold">{completedCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-md bg-green-100"><DollarSign className="w-5 h-5 text-green-600" /></div>
            <div>
              <p className="text-xs text-muted-foreground">Total Enrolled</p>
              <p className="text-2xl font-bold">{totalParticipants}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-md bg-yellow-100"><CheckCircle2 className="w-5 h-5 text-yellow-600" /></div>
            <div>
              <p className="text-xs text-muted-foreground">ITSP Goals</p>
              <p className="text-2xl font-bold">{goalsProgress.completed}/{goalsProgress.total}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search participants..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="enrolled">Enrolled</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="terminated">Terminated</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="icon" onClick={refresh}><RefreshCw className="w-4 h-4" /></Button>
        {canManage && (
          <Button onClick={() => setEnrollOpen(true)}>
            <UserPlus className="w-4 h-4 mr-1" /> Enroll
          </Button>
        )}
      </div>

      {/* Participants Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tenant</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Enrolled</TableHead>
                <TableHead>Contract End</TableHead>
                <TableHead>Goals</TableHead>
                <TableHead className="text-right">Baseline Rent</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">
                    {totalParticipants === 0 ? 'No FSS participants yet. Enroll a tenant to get started.' : 'No matching participants.'}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map(p => {
                  const goalsDone = (p.itsp_goals || []).filter(g => g.status === 'completed').length;
                  const goalsTotal = (p.itsp_goals || []).length;
                  return (
                    <TableRow
                      key={p.id}
                      className="cursor-pointer"
                      onClick={() => { setSelectedParticipant(p); setDetailOpen(true); }}
                    >
                      <TableCell className="font-medium">{p.tenant_name}</TableCell>
                      <TableCell>
                        <Badge className={STATUS_COLORS[p.status]}>{p.status}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">{format(parseISO(p.enrollment_date), 'MMM d, yyyy')}</TableCell>
                      <TableCell className="text-sm">
                        {p.contract_end_date ? format(parseISO(p.contract_end_date), 'MMM d, yyyy') : '—'}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{goalsDone}/{goalsTotal}</span>
                      </TableCell>
                      <TableCell className="text-right text-sm">${p.baseline_rent.toLocaleString()}</TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialogs */}
      <EnrollFSSDialog
        open={enrollOpen}
        onOpenChange={setEnrollOpen}
        tenants={tenants}
        onEnroll={enrollParticipant}
      />
      <FSSParticipantDetail
        participant={selectedParticipant}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onUpdate={updateParticipant}
        fetchEscrow={fetchEscrow}
        addEscrowEntry={addEscrowEntry}
      />
    </div>
  );
};

export default AgencyFSSDashboard;

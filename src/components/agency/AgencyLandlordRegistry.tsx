import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Plus, Search, Building2, AlertCircle, CheckCheck } from 'lucide-react';
import { useAgencyLandlords } from '@/hooks/useAgencyLandlords';
import LandlordDetailDrawer from './LandlordDetailDrawer';
import { EmptyState } from '@/components/shared/EmptyState';
import { useToast } from '@/hooks/use-toast';

interface Props {
  agencyId: string;
  canManage: boolean;
}

const w9Badge = (s: string) => {
  if (s === 'approved') return <Badge variant="success">Approved</Badge>;
  if (s === 'submitted') return <Badge variant="warning">Submitted</Badge>;
  return <Badge variant="secondary">Pending</Badge>;
};

const onboardBadge = (s: string) => {
  if (s === 'active') return <Badge variant="success">Active</Badge>;
  if (s === 'inactive') return <Badge variant="destructive">Inactive</Badge>;
  if (s === 'pending_review') return <Badge className="bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-700">Pending Review</Badge>;
  return <Badge variant="secondary">Invited</Badge>;
};

const AgencyLandlordRegistry: React.FC<Props> = ({ agencyId, canManage }) => {
  const { landlords, loading, refetch, addLandlord, updateLandlord } = useAgencyLandlords(agencyId);
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [addOpen, setAddOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [detailTarget, setDetailTarget] = useState<{ id: string; name: string } | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkRunning, setBulkRunning] = useState(false);

  const pendingCount = landlords.filter(l => l.onboarding_status === 'pending_review').length;

  const filtered = landlords.filter(l => {
    const matchesSearch = l.landlord_name.toLowerCase().includes(search.toLowerCase()) ||
      l.landlord_email.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || l.onboarding_status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleAdd = () => {
    if (!newName || !newEmail) return;
    addLandlord(newName, newEmail);
    setNewName('');
    setNewEmail('');
    setAddOpen(false);
  };

  const selectablePending = useMemo(
    () => filtered.filter(l => l.onboarding_status === 'pending_review' && l.w9_status === 'approved'),
    [filtered]
  );
  const allSelected = selectablePending.length > 0 && selectablePending.every(l => selected.has(l.id));

  const toggleAll = (checked: boolean) => {
    setSelected(checked ? new Set(selectablePending.map(l => l.id)) : new Set());
  };
  const toggleOne = (id: string, checked: boolean) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (checked) next.add(id); else next.delete(id);
      return next;
    });
  };

  const bulkApprove = async () => {
    if (selected.size === 0) return;
    setBulkRunning(true);
    let ok = 0; let skipped = 0;
    for (const id of Array.from(selected)) {
      const l = landlords.find(x => x.id === id);
      if (!l) continue;
      if (l.w9_status !== 'approved') { skipped++; continue; }
      try {
        await updateLandlord(id, { onboarding_status: 'active' as any });
        ok++;
      } catch { skipped++; }
    }
    setBulkRunning(false);
    setSelected(new Set());
    refetch();
    toast({
      title: `Approved ${ok} landlord${ok === 1 ? '' : 's'}`,
      description: skipped ? `${skipped} skipped (W-9 not approved or error).` : undefined,
    });
  };

  return (
    <>
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="h-4 w-4" /> Landlord Registry ({landlords.length})
            {pendingCount > 0 && (
              <Badge className="bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-700 ml-1">
                <AlertCircle className="w-3 h-3 mr-1" />
                {pendingCount} Pending
              </Badge>
            )}
          </CardTitle>
          <div className="flex gap-2 flex-wrap">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9 w-36 text-xs">
                <SelectValue placeholder="Filter status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending_review">Pending Review</SelectItem>
                <SelectItem value="invited">Invited</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search..." className="pl-8 h-9 w-48" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            {canManage && (
              <Dialog open={addOpen} onOpenChange={setAddOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="gap-1"><Plus className="h-3 w-3" /> Add Landlord</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Add Landlord</DialogTitle></DialogHeader>
                  <div className="space-y-3">
                    <div><Label>Name</Label><Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Full name" /></div>
                    <div><Label>Email</Label><Input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="email@example.com" /></div>
                    <Button onClick={handleAdd} className="w-full">Add Landlord</Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {canManage && selected.size > 0 && (
          <div className="mb-3 flex items-center justify-between p-2 rounded-md bg-primary/5 border border-primary/30">
            <span className="text-sm">{selected.size} selected</span>
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>Clear</Button>
              <Button size="sm" disabled={bulkRunning} onClick={bulkApprove} className="gap-1">
                <CheckCheck className="h-3 w-3" /> Bulk Approve
              </Button>
            </div>
          </div>
        )}
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : (
          <div className="relative w-full overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {canManage && (
                    <TableHead className="w-8">
                      <Checkbox
                        checked={allSelected}
                        onCheckedChange={(v) => toggleAll(!!v)}
                        aria-label="Select all approvable"
                      />
                    </TableHead>
                  )}
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>W-9 Status</TableHead>
                  <TableHead>Payment Method</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Pay-Ready</TableHead>
                  <TableHead>Properties</TableHead>
                  {canManage && <TableHead>Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length ? filtered.map(l => {
                  const eligible = l.onboarding_status === 'pending_review' && l.w9_status === 'approved';
                  return (
                  <TableRow key={l.id} className="cursor-pointer hover:bg-accent/50" onClick={() => setDetailTarget({ id: l.id, name: l.landlord_name })}>
                    {canManage && (
                      <TableCell onClick={e => e.stopPropagation()}>
                        <Checkbox
                          checked={selected.has(l.id)}
                          disabled={!eligible}
                          onCheckedChange={(v) => toggleOne(l.id, !!v)}
                          aria-label={`Select ${l.landlord_name}`}
                        />
                      </TableCell>
                    )}
                    <TableCell className="font-medium">{l.landlord_name}</TableCell>
                    <TableCell className="text-sm">{l.landlord_email}</TableCell>
                    <TableCell>{w9Badge(l.w9_status)}</TableCell>
                    <TableCell className="text-sm capitalize">{l.payment_method.replace('_', ' ')}</TableCell>
                    <TableCell>{onboardBadge(l.onboarding_status)}</TableCell>
                    <TableCell>
                      {(l as any).pay_ready
                        ? <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-300">Approved</Badge>
                        : <Badge variant="outline" className="border-amber-400 text-amber-700 dark:text-amber-300">Not Ready</Badge>}
                    </TableCell>
                    <TableCell className="text-sm">{l.properties_count}</TableCell>
                    {canManage && (
                      <TableCell>
                        <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                          {l.w9_status !== 'approved' && (
                            <Select onValueChange={v => updateLandlord(l.id, { w9_status: v as any })}>
                              <SelectTrigger className="h-8 w-24 text-xs"><SelectValue placeholder="W-9" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="submitted">Submitted</SelectItem>
                                <SelectItem value="approved">Approved</SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                          {l.onboarding_status === 'invited' && (
                            <Button size="sm" variant="outline" onClick={() => updateLandlord(l.id, { onboarding_status: 'active' as any })}>
                              Activate
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                  );
                }) : (
                  <TableRow>
                    <TableCell colSpan={canManage ? 9 : 7} className="text-center py-8 text-muted-foreground">
                      {statusFilter !== 'all' ? `No landlords with status "${statusFilter.replace('_', ' ')}".` : 'No landlords registered.'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>

    {detailTarget && (
      <LandlordDetailDrawer
        open={!!detailTarget}
        onOpenChange={(open) => !open && setDetailTarget(null)}
        landlordId={detailTarget.id}
        landlordName={detailTarget.name}
        agencyId={agencyId}
        isAdmin={canManage}
        onUpdate={refetch}
      />
    )}
    </>
  );
};

export default AgencyLandlordRegistry;

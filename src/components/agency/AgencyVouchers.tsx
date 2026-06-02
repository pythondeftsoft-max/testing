import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Shield, Plus, Clock, AlertTriangle, CalendarPlus, Ticket } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import IssueVoucherDialog from './IssueVoucherDialog';
import ProgramFilter, { HousingProgramType } from './ProgramFilter';
import { useEnabledPrograms } from '@/hooks/useEnabledPrograms';
import { EmptyState } from '@/components/shared/EmptyState';

interface Voucher {
  id: string;
  voucher_number: string | null;
  voucher_type: string;
  status: string;
  amount: number | null;
  issued_at: string | null;
  expires_at: string | null;
  tenant_id: string;
  shopping_deadline: string | null;
  extension_count: number;
  extension_days: number;
  lifecycle_status: string;
  leased_up_at: string | null;
}

interface AgencyVouchersProps {
  vouchers: Voucher[];
  loading: boolean;
  agencyId: string;
  canManage: boolean;
  onRefresh: () => void;
  onIssueVoucher: (voucher: any) => void;
}

const statusVariant = (s: string): "success" | "warning" | "secondary" | "destructive" | "default" => {
  switch (s) {
    case 'active': return 'success';
    case 'pending': return 'warning';
    case 'expired': return 'secondary';
    case 'revoked': case 'ported': return 'destructive';
    default: return 'default';
  }
};

const lifecycleVariant = (s: string): "success" | "warning" | "secondary" | "destructive" | "default" => {
  switch (s) {
    case 'issued': return 'default';
    case 'searching': return 'warning';
    case 'leased_up': return 'success';
    case 'expired': case 'terminated': return 'destructive';
    case 'ported': return 'secondary';
    default: return 'default';
  }
};

const getShoppingDaysLeft = (deadline: string | null): number | null => {
  if (!deadline) return null;
  const diff = new Date(deadline).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

const ShoppingCountdown: React.FC<{ deadline: string | null }> = ({ deadline }) => {
  const days = getShoppingDaysLeft(deadline);
  if (days === null) return <span className="text-muted-foreground">—</span>;
  const color = days > 30 ? 'text-green-600' : days > 15 ? 'text-yellow-600' : 'text-red-600';
  const icon = days <= 15 ? <AlertTriangle className="h-3 w-3 inline mr-1" /> : <Clock className="h-3 w-3 inline mr-1" />;
  return (
    <span className={`font-medium ${color} text-sm flex items-center gap-0.5`}>
      {icon}{days}d left
    </span>
  );
};

// Pipeline summary cards
const PipelineSummary: React.FC<{ vouchers: Voucher[] }> = ({ vouchers }) => {
  const counts: Record<string, number> = { issued: 0, searching: 0, leased_up: 0, expired: 0, terminated: 0, ported: 0 };
  vouchers.forEach(v => { counts[v.lifecycle_status] = (counts[v.lifecycle_status] || 0) + 1; });

  const stages = [
    { key: 'issued', label: 'Issued', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' },
    { key: 'searching', label: 'Searching', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' },
    { key: 'leased_up', label: 'Leased Up', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' },
    { key: 'expired', label: 'Expired', color: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300' },
    { key: 'terminated', label: 'Terminated', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' },
    { key: 'ported', label: 'Ported', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300' },
  ];

  return (
    <div className="flex gap-2 flex-wrap mb-4">
      {stages.map(s => (
        <div key={s.key} className={`px-3 py-1.5 rounded-lg text-sm font-medium ${s.color}`}>
          {s.label}: {counts[s.key] || 0}
        </div>
      ))}
    </div>
  );
};

const AgencyVouchers: React.FC<AgencyVouchersProps> = ({ vouchers, loading, agencyId, canManage, onRefresh, onIssueVoucher }) => {
  const [issueOpen, setIssueOpen] = useState(false);
  const [lifecycleFilter, setLifecycleFilter] = useState('all');
  const [programFilter, setProgramFilter] = useState<HousingProgramType>('all');
  const { data: enabledPrograms } = useEnabledPrograms(agencyId);

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from('agency_vouchers').update({ status } as any).eq('id', id);
    if (error) { toast.error('Failed to update voucher'); return; }
    toast.success(`Voucher ${status}`);
    onRefresh();
  };

  const updateLifecycle = async (id: string, lifecycle_status: string) => {
    const updates: any = { lifecycle_status };
    if (lifecycle_status === 'leased_up') updates.leased_up_at = new Date().toISOString();
    const { error } = await supabase.from('agency_vouchers').update(updates).eq('id', id);
    if (error) { toast.error('Failed to update lifecycle'); return; }
    toast.success(`Voucher moved to ${lifecycle_status.replace('_', ' ')}`);
    onRefresh();
  };

  const grantExtension = async (id: string, currentDeadline: string | null, currentCount: number, currentDays: number) => {
    const addDays = 30;
    const newDeadline = currentDeadline
      ? new Date(new Date(currentDeadline).getTime() + addDays * 86400000).toISOString().split('T')[0]
      : new Date(Date.now() + addDays * 86400000).toISOString().split('T')[0];
    const { error } = await supabase.from('agency_vouchers').update({
      shopping_deadline: newDeadline,
      extension_count: currentCount + 1,
      extension_days: currentDays + addDays,
    } as any).eq('id', id);
    if (error) { toast.error('Failed to grant extension'); return; }
    toast.success(`30-day extension granted`);
    onRefresh();
  };

  const filtered = vouchers.filter(v => {
    if (lifecycleFilter !== 'all' && v.lifecycle_status !== lifecycleFilter) return false;
    if (programFilter !== 'all' && (v as any).program_type !== programFilter) return false;
    return true;
  });

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="h-4 w-4" /> Vouchers ({vouchers.length})
            </CardTitle>
            {canManage && (
              <Button size="sm" onClick={() => setIssueOpen(true)} className="gap-1">
                <Plus className="h-3 w-3" /> Issue Voucher
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : vouchers.length === 0 ? (
            <EmptyState
              bare
              icon={Ticket}
              title="No vouchers issued yet"
              description="Issue your first voucher to start tracking the leasing pipeline. Voucher holders will appear here as they search, lease up, and renew."
              primaryAction={canManage ? { label: 'Issue Voucher', onClick: () => setIssueOpen(true) } : undefined}
            />
          ) : (
            <>
              <PipelineSummary vouchers={vouchers} />

              <div className="mb-3">
                <ProgramFilter value={programFilter} onChange={setProgramFilter} enabledPrograms={enabledPrograms} />
              </div>

              <Tabs value={lifecycleFilter} onValueChange={setLifecycleFilter} className="mb-4">
                <TabsList className="h-8">
                  <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
                  <TabsTrigger value="issued" className="text-xs">Issued</TabsTrigger>
                  <TabsTrigger value="searching" className="text-xs">Searching</TabsTrigger>
                  <TabsTrigger value="leased_up" className="text-xs">Leased Up</TabsTrigger>
                  <TabsTrigger value="expired" className="text-xs">Expired</TabsTrigger>
                </TabsList>
              </Tabs>

              <div className="relative w-full overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Voucher #</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Lifecycle</TableHead>
                      <TableHead>Shopping Time</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Issued</TableHead>
                      {canManage && <TableHead>Actions</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.length ? filtered.map(v => (
                      <TableRow key={v.id}>
                        <TableCell className="font-mono text-sm">{v.voucher_number || '—'}</TableCell>
                        <TableCell className="capitalize">{v.voucher_type}</TableCell>
                        <TableCell><Badge variant={statusVariant(v.status)}>{v.status}</Badge></TableCell>
                        <TableCell><Badge variant={lifecycleVariant(v.lifecycle_status)}>{v.lifecycle_status.replace('_', ' ')}</Badge></TableCell>
                        <TableCell>
                          <ShoppingCountdown deadline={v.shopping_deadline} />
                          {v.extension_count > 0 && (
                            <span className="text-xs text-muted-foreground ml-1">({v.extension_count} ext)</span>
                          )}
                        </TableCell>
                        <TableCell>{v.amount ? `$${v.amount.toLocaleString()}` : '—'}</TableCell>
                        <TableCell className="text-sm">{v.issued_at ? new Date(v.issued_at).toLocaleDateString() : '—'}</TableCell>
                        {canManage && (
                          <TableCell>
                            <div className="flex gap-1 flex-wrap">
                              {v.lifecycle_status === 'issued' && (
                                <Button size="sm" variant="outline" onClick={() => updateLifecycle(v.id, 'searching')}>Start Search</Button>
                              )}
                              {v.lifecycle_status === 'searching' && (
                                <>
                                  <Button size="sm" variant="default" onClick={() => updateLifecycle(v.id, 'leased_up')}>Lease Up</Button>
                                  <Button size="sm" variant="outline" onClick={() => grantExtension(v.id, v.shopping_deadline, v.extension_count, v.extension_days)} title="Grant 30-day extension">
                                    <CalendarPlus className="h-3 w-3" />
                                  </Button>
                                </>
                              )}
                              {v.status === 'active' && (
                                <Button size="sm" variant="secondary" onClick={() => updateStatus(v.id, 'expired')}>Expire</Button>
                              )}
                              {v.status === 'pending' && (
                                <Button size="sm" variant="default" onClick={() => updateStatus(v.id, 'active')}>Activate</Button>
                              )}
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    )) : (
                      <TableRow>
                        <TableCell colSpan={canManage ? 8 : 7} className="text-center py-8 text-muted-foreground">
                          No vouchers found.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <IssueVoucherDialog open={issueOpen} onOpenChange={setIssueOpen} agencyId={agencyId} onIssued={(v) => { onIssueVoucher(v); setIssueOpen(false); }} />
    </>
  );
};

export default AgencyVouchers;

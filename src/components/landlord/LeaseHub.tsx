import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { FileText, Plus, PenLine, CheckCircle2, XCircle, Clock, AlertTriangle, RotateCcw, CalendarDays } from 'lucide-react';
import { useLeaseManagement, Lease } from '@/hooks/useLeaseManagement';
import { format, parseISO, differenceInDays } from 'date-fns';

interface Props {
  landlordId: string;
}

const statusColors: Record<string, string> = {
  draft: 'secondary',
  pending_signature: 'default',
  active: 'success',
  expired: 'destructive',
  terminated: 'destructive',
};

const signatureLabels: Record<string, string> = {
  unsigned: 'Unsigned',
  landlord_signed: 'Landlord Signed',
  tenant_signed: 'Tenant Signed',
  fully_executed: 'Fully Executed',
};

const LeaseHub: React.FC<Props> = ({ landlordId }) => {
  const { leases, templates, loading, createLease, signLease, terminateLease, saveTemplate } = useLeaseManagement(landlordId);
  const [showCreateLease, setShowCreateLease] = useState(false);
  const [showCreateTemplate, setShowCreateTemplate] = useState(false);
  const [terminateId, setTerminateId] = useState<string | null>(null);
  const [terminateReason, setTerminateReason] = useState('');
  const [leaseForm, setLeaseForm] = useState({
    property_id: '', tenant_id: '', lease_start: '', lease_end: '',
    monthly_rent: '', security_deposit: '', auto_renew: false, renewal_term_months: 12,
  });
  const [templateForm, setTemplateForm] = useState({
    template_name: '', default_term_months: 12, late_fee_amount: 50,
    late_fee_grace_days: 5, security_deposit_months: 1, pet_policy: 'not_allowed',
    clauses: '',
  });

  const activeLeases = leases.filter(l => l.status === 'active');
  const pendingLeases = leases.filter(l => l.status === 'draft' || l.status === 'pending_signature');
  const expiredLeases = leases.filter(l => l.status === 'expired' || l.status === 'terminated');
  const expiringLeases = activeLeases.filter(l => {
    if (!l.lease_end) return false;
    const days = differenceInDays(parseISO(l.lease_end), new Date());
    return days >= 0 && days <= 90;
  });

  const handleCreateLease = async () => {
    const success = await createLease({
      property_id: leaseForm.property_id,
      tenant_id: leaseForm.tenant_id,
      lease_start: leaseForm.lease_start,
      lease_end: leaseForm.lease_end,
      monthly_rent: Number(leaseForm.monthly_rent),
      security_deposit: Number(leaseForm.security_deposit),
      auto_renew: leaseForm.auto_renew,
      renewal_term_months: leaseForm.renewal_term_months,
    } as any);
    if (success) setShowCreateLease(false);
  };

  const handleSaveTemplate = async () => {
    await saveTemplate({
      template_name: templateForm.template_name,
      default_term_months: templateForm.default_term_months,
      late_fee_amount: templateForm.late_fee_amount,
      late_fee_grace_days: templateForm.late_fee_grace_days,
      security_deposit_months: templateForm.security_deposit_months,
      pet_policy: templateForm.pet_policy,
      clauses: templateForm.clauses.split('\n').filter(Boolean),
    });
    setShowCreateTemplate(false);
  };

  const handleTerminate = async () => {
    if (terminateId && terminateReason) {
      await terminateLease(terminateId, terminateReason);
      setTerminateId(null);
      setTerminateReason('');
    }
  };

  const LeaseCard = ({ lease }: { lease: Lease }) => {
    const daysLeft = lease.lease_end ? differenceInDays(parseISO(lease.lease_end), new Date()) : null;
    return (
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium text-sm">
                  {lease.lease_start && lease.lease_end
                    ? `${format(parseISO(lease.lease_start), 'MMM d, yyyy')} — ${format(parseISO(lease.lease_end), 'MMM d, yyyy')}`
                    : 'Dates TBD'}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Rent: ${lease.monthly_rent?.toLocaleString()}/mo • Deposit: ${lease.security_deposit?.toLocaleString()}
              </p>
              {daysLeft !== null && daysLeft >= 0 && daysLeft <= 90 && (
                <p className="text-xs text-yellow-600 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" /> Expires in {daysLeft} days
                </p>
              )}
            </div>
            <div className="flex flex-col items-end gap-1">
              <Badge variant={statusColors[lease.status] as any}>{lease.status.replace('_', ' ')}</Badge>
              <span className="text-xs text-muted-foreground">{signatureLabels[lease.signature_status]}</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mt-3">
            {lease.status === 'draft' && (
              <Button size="sm" variant="default" onClick={() => signLease(lease.id, 'landlord')}>
                <PenLine className="h-3 w-3 mr-1" /> Sign as Landlord
              </Button>
            )}
            {(lease.signature_status === 'landlord_signed' || lease.signature_status === 'tenant_signed') && (
              <Badge variant="outline" className="text-xs">
                <Clock className="h-3 w-3 mr-1" /> Awaiting {lease.signature_status === 'landlord_signed' ? 'tenant' : 'landlord'} signature
              </Badge>
            )}
            {lease.status === 'active' && (
              <Button size="sm" variant="outline" className="text-destructive" onClick={() => setTerminateId(lease.id)}>
                <XCircle className="h-3 w-3 mr-1" /> Terminate
              </Button>
            )}
            {lease.auto_renew && (
              <Badge variant="outline" className="text-xs">
                <RotateCcw className="h-3 w-3 mr-1" /> Auto-renew {lease.renewal_term_months}mo
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return <div className="flex justify-center py-12"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold">{activeLeases.length}</p><p className="text-xs text-muted-foreground">Active</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold">{pendingLeases.length}</p><p className="text-xs text-muted-foreground">Pending</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-yellow-600">{expiringLeases.length}</p><p className="text-xs text-muted-foreground">Expiring (90d)</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold">{templates.length}</p><p className="text-xs text-muted-foreground">Templates</p></CardContent></Card>
      </div>

      <div className="flex gap-2">
        <Button onClick={() => setShowCreateLease(true)}><Plus className="h-4 w-4 mr-1" /> New Lease</Button>
        <Button variant="outline" onClick={() => setShowCreateTemplate(true)}><FileText className="h-4 w-4 mr-1" /> New Template</Button>
      </div>

      <Tabs defaultValue="active">
        <TabsList>
          <TabsTrigger value="active">Active ({activeLeases.length})</TabsTrigger>
          <TabsTrigger value="pending">Pending ({pendingLeases.length})</TabsTrigger>
          <TabsTrigger value="expiring">Expiring ({expiringLeases.length})</TabsTrigger>
          <TabsTrigger value="archived">Archived ({expiredLeases.length})</TabsTrigger>
        </TabsList>

        {(['active', 'pending', 'expiring', 'archived'] as const).map(tab => {
          const list = tab === 'active' ? activeLeases : tab === 'pending' ? pendingLeases : tab === 'expiring' ? expiringLeases : expiredLeases;
          return (
            <TabsContent key={tab} value={tab}>
              {list.length ? (
                <div className="space-y-3">{list.map(l => <LeaseCard key={l.id} lease={l} />)}</div>
              ) : (
                <Card><CardContent className="py-12 text-center text-muted-foreground">No {tab} leases.</CardContent></Card>
              )}
            </TabsContent>
          );
        })}
      </Tabs>

      {/* Create Lease Dialog */}
      <Dialog open={showCreateLease} onOpenChange={setShowCreateLease}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create New Lease</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Lease Start</Label><Input type="date" value={leaseForm.lease_start} onChange={e => setLeaseForm(f => ({ ...f, lease_start: e.target.value }))} /></div>
              <div><Label>Lease End</Label><Input type="date" value={leaseForm.lease_end} onChange={e => setLeaseForm(f => ({ ...f, lease_end: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Monthly Rent ($)</Label><Input type="number" value={leaseForm.monthly_rent} onChange={e => setLeaseForm(f => ({ ...f, monthly_rent: e.target.value }))} /></div>
              <div><Label>Security Deposit ($)</Label><Input type="number" value={leaseForm.security_deposit} onChange={e => setLeaseForm(f => ({ ...f, security_deposit: e.target.value }))} /></div>
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={leaseForm.auto_renew} onCheckedChange={v => setLeaseForm(f => ({ ...f, auto_renew: v }))} />
              <Label>Auto-renew</Label>
              {leaseForm.auto_renew && (
                <Input type="number" className="w-20" value={leaseForm.renewal_term_months} onChange={e => setLeaseForm(f => ({ ...f, renewal_term_months: Number(e.target.value) }))} />
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateLease(false)}>Cancel</Button>
            <Button onClick={handleCreateLease}>Create Lease</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Template Dialog */}
      <Dialog open={showCreateTemplate} onOpenChange={setShowCreateTemplate}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create Lease Template</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <div><Label>Template Name</Label><Input value={templateForm.template_name} onChange={e => setTemplateForm(f => ({ ...f, template_name: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Default Term (months)</Label><Input type="number" value={templateForm.default_term_months} onChange={e => setTemplateForm(f => ({ ...f, default_term_months: Number(e.target.value) }))} /></div>
              <div><Label>Late Fee ($)</Label><Input type="number" value={templateForm.late_fee_amount} onChange={e => setTemplateForm(f => ({ ...f, late_fee_amount: Number(e.target.value) }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Grace Days</Label><Input type="number" value={templateForm.late_fee_grace_days} onChange={e => setTemplateForm(f => ({ ...f, late_fee_grace_days: Number(e.target.value) }))} /></div>
              <div><Label>Deposit (months)</Label><Input type="number" value={templateForm.security_deposit_months} onChange={e => setTemplateForm(f => ({ ...f, security_deposit_months: Number(e.target.value) }))} /></div>
            </div>
            <div>
              <Label>Pet Policy</Label>
              <Select value={templateForm.pet_policy} onValueChange={v => setTemplateForm(f => ({ ...f, pet_policy: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="not_allowed">No Pets</SelectItem>
                  <SelectItem value="allowed_with_deposit">Pets with Deposit</SelectItem>
                  <SelectItem value="allowed">Pets Allowed</SelectItem>
                  <SelectItem value="case_by_case">Case by Case</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Custom Clauses (one per line)</Label><Textarea rows={4} value={templateForm.clauses} onChange={e => setTemplateForm(f => ({ ...f, clauses: e.target.value }))} placeholder="No smoking on premises&#10;Quiet hours 10pm-8am" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateTemplate(false)}>Cancel</Button>
            <Button onClick={handleSaveTemplate}>Save Template</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Terminate Dialog */}
      <Dialog open={!!terminateId} onOpenChange={o => { if (!o) setTerminateId(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Terminate Lease</DialogTitle></DialogHeader>
          <div className="py-4">
            <Label>Reason for Termination</Label>
            <Textarea rows={3} value={terminateReason} onChange={e => setTerminateReason(e.target.value)} placeholder="Provide reason..." />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTerminateId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleTerminate} disabled={!terminateReason}>Terminate</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LeaseHub;

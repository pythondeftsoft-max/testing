import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Save, Loader2, FileText, DollarSign } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { useSuperAdminCheck } from '@/hooks/useSuperAdminCheck';

interface Props {
  agencyId: string;
}

interface Contract {
  id: string;
  agency_id: string;
  monthly_rate: number;
  setup_fee: number;
  payment_terms: string;
  contract_start: string | null;
  contract_end: string | null;
  status: string;
  billing_contact_name: string | null;
  billing_contact_email: string | null;
  po_number: string | null;
  notes: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  created_at: string;
}

interface Invoice {
  id: string;
  invoice_number: string;
  amount: number;
  status: string;
  issued_date: string | null;
  due_date: string | null;
  paid_date: string | null;
  line_items: any[];
}

const statusColors: Record<string, string> = {
  pending: 'bg-warning/10 text-warning border-warning/20',
  active: 'bg-success/10 text-success border-success/20',
  expired: 'bg-muted text-muted-foreground',
  suspended: 'bg-destructive/10 text-destructive border-destructive/20',
};

const invoiceStatusColors: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  sent: 'bg-info/10 text-info border-info/20',
  paid: 'bg-success/10 text-success border-success/20',
  overdue: 'bg-destructive/10 text-destructive border-destructive/20',
};

const AgencyContractManager: React.FC<Props> = ({ agencyId }) => {
  const { data: isSuperAdmin } = useSuperAdminCheck();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    monthly_rate: '',
    setup_fee: '',
    payment_terms: 'net-30',
    contract_start: '',
    contract_end: '',
    status: 'pending',
    billing_contact_name: '',
    billing_contact_email: '',
    po_number: '',
    notes: '',
  });

  const fetchData = async () => {
    setLoading(true);
    const [contractRes, invoiceRes] = await Promise.all([
      supabase.from('agency_contracts').select('*').eq('agency_id', agencyId).order('created_at', { ascending: false }),
      supabase.from('agency_invoices').select('*').eq('agency_id', agencyId).order('created_at', { ascending: false }),
    ]);
    setContracts((contractRes.data as any[]) || []);
    setInvoices((invoiceRes.data as any[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [agencyId]);

  const saveContract = async () => {
    if (!isSuperAdmin) { toast.error('Only super admins can manage contracts'); return; }
    setSaving(true);
    const payload = {
      agency_id: agencyId,
      monthly_rate: parseFloat(form.monthly_rate) || 0,
      setup_fee: parseFloat(form.setup_fee) || 0,
      payment_terms: form.payment_terms,
      contract_start: form.contract_start || null,
      contract_end: form.contract_end || null,
      status: form.status,
      billing_contact_name: form.billing_contact_name || null,
      billing_contact_email: form.billing_contact_email || null,
      po_number: form.po_number || null,
      notes: form.notes || null,
    };
    const { error } = await supabase.from('agency_contracts').insert(payload as any);
    if (error) { toast.error('Failed to create contract'); console.error(error); }
    else { toast.success('Contract created'); setDialogOpen(false); fetchData(); }
    setSaving(false);
  };

  const updateContractStatus = async (contractId: string, newStatus: string) => {
    if (!isSuperAdmin) return;
    const { error } = await supabase.from('agency_contracts').update({ status: newStatus } as any).eq('id', contractId);
    if (error) toast.error('Failed to update status');
    else { toast.success(`Contract ${newStatus}`); fetchData(); }
  };

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold flex items-center gap-2">
            <DollarSign className="w-4 h-4" /> Contract Management
          </h3>
          <p className="text-sm text-muted-foreground">Manage billing contracts and invoices for this agency</p>
        </div>
        {isSuperAdmin && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2"><Plus className="w-4 h-4" /> New Contract</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>Create Contract</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Monthly Rate ($)</Label>
                    <Input type="number" value={form.monthly_rate} onChange={e => setForm(f => ({ ...f, monthly_rate: e.target.value }))} placeholder="2500" />
                  </div>
                  <div>
                    <Label>Setup Fee ($)</Label>
                    <Input type="number" value={form.setup_fee} onChange={e => setForm(f => ({ ...f, setup_fee: e.target.value }))} placeholder="5000" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Payment Terms</Label>
                    <Select value={form.payment_terms} onValueChange={v => setForm(f => ({ ...f, payment_terms: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="net-30">Net 30</SelectItem>
                        <SelectItem value="net-60">Net 60</SelectItem>
                        <SelectItem value="net-90">Net 90</SelectItem>
                        <SelectItem value="due-on-receipt">Due on Receipt</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Status</Label>
                    <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="suspended">Suspended</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Start Date</Label><Input type="date" value={form.contract_start} onChange={e => setForm(f => ({ ...f, contract_start: e.target.value }))} /></div>
                  <div><Label>End Date</Label><Input type="date" value={form.contract_end} onChange={e => setForm(f => ({ ...f, contract_end: e.target.value }))} /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Billing Contact</Label><Input value={form.billing_contact_name} onChange={e => setForm(f => ({ ...f, billing_contact_name: e.target.value }))} placeholder="Jane Smith" /></div>
                  <div><Label>Billing Email</Label><Input type="email" value={form.billing_contact_email} onChange={e => setForm(f => ({ ...f, billing_contact_email: e.target.value }))} placeholder="billing@agency.gov" /></div>
                </div>
                <div><Label>PO Number</Label><Input value={form.po_number} onChange={e => setForm(f => ({ ...f, po_number: e.target.value }))} placeholder="PO-2026-001" /></div>
                <div><Label>Notes</Label><Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} /></div>
                <Button onClick={saveContract} disabled={saving} className="w-full gap-2">
                  <Save className="w-4 h-4" /> {saving ? 'Creating...' : 'Create Contract'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Active Contracts */}
      {contracts.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground">No contracts yet. {isSuperAdmin && 'Click "New Contract" to create one.'}</CardContent></Card>
      ) : (
        <div className="space-y-4">
          {contracts.map(contract => (
            <Card key={contract.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium">
                    ${Number(contract.monthly_rate).toLocaleString()}/mo
                    {contract.setup_fee > 0 && <span className="text-muted-foreground ml-2">+ ${Number(contract.setup_fee).toLocaleString()} setup</span>}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={statusColors[contract.status] || ''}>
                      {contract.status}
                    </Badge>
                    {isSuperAdmin && contract.status === 'pending' && (
                      <Button size="sm" variant="outline" onClick={() => updateContractStatus(contract.id, 'active')}>Activate</Button>
                    )}
                    {isSuperAdmin && contract.status === 'active' && (
                      <Button size="sm" variant="outline" onClick={() => updateContractStatus(contract.id, 'suspended')}>Suspend</Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <div><span className="text-muted-foreground">Terms:</span> <span className="font-medium">{contract.payment_terms}</span></div>
                  {contract.po_number && <div><span className="text-muted-foreground">PO:</span> <span className="font-medium">{contract.po_number}</span></div>}
                  {contract.contract_start && <div><span className="text-muted-foreground">Start:</span> <span className="font-medium">{format(new Date(contract.contract_start), 'MMM d, yyyy')}</span></div>}
                  {contract.contract_end && <div><span className="text-muted-foreground">End:</span> <span className="font-medium">{format(new Date(contract.contract_end), 'MMM d, yyyy')}</span></div>}
                  {contract.billing_contact_name && <div><span className="text-muted-foreground">Contact:</span> <span className="font-medium">{contract.billing_contact_name}</span></div>}
                  {contract.billing_contact_email && <div><span className="text-muted-foreground">Email:</span> <span className="font-medium">{contract.billing_contact_email}</span></div>}
                </div>
                {contract.notes && <p className="text-sm text-muted-foreground mt-2 italic">{contract.notes}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Invoice History */}
      {invoices.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <FileText className="w-4 h-4" /> Invoice History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Issued</TableHead>
                  <TableHead>Due</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map(inv => (
                  <TableRow key={inv.id}>
                    <TableCell className="font-mono text-sm">{inv.invoice_number}</TableCell>
                    <TableCell>${Number(inv.amount).toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={invoiceStatusColors[inv.status] || ''}>
                        {inv.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{inv.issued_date ? format(new Date(inv.issued_date), 'MMM d, yyyy') : '—'}</TableCell>
                    <TableCell>{inv.due_date ? format(new Date(inv.due_date), 'MMM d, yyyy') : '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AgencyContractManager;

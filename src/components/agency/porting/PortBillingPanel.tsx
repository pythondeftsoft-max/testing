import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { DollarSign, Plus, Loader2 } from 'lucide-react';

interface BillingRow {
  id: string;
  billing_month: string;
  hap_portion: number;
  admin_fee_portion: number;
  total_amount: number;
  status: string;
  invoiced_at: string | null;
  paid_at: string | null;
}

interface Props {
  agencyId: string;
}

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  invoiced: 'bg-blue-100 text-blue-800',
  paid: 'bg-green-100 text-green-800',
  disputed: 'bg-red-100 text-red-800',
};

const PortBillingPanel: React.FC<Props> = ({ agencyId }) => {
  const [rows, setRows] = useState<(BillingRow & { packet_label: string; counterparty: string; role: 'billing' | 'paying' })[]>([]);
  const [loading, setLoading] = useState(true);
  const [billedPackets, setBilledPackets] = useState<{ id: string; label: string }[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ port_packet_id: '', billing_month: '', hap_portion: '', admin_fee_portion: '' });
  const [saving, setSaving] = useState(false);

  const fetchAll = async () => {
    setLoading(true);
    const { data: billing } = await supabase
      .from('agency_port_billing')
      .select('*, agency_port_packets!inner(receiving_pha_name, receiving_pha_code, packet_type)')
      .or(`billing_agency_id.eq.${agencyId},paying_agency_id.eq.${agencyId}`)
      .order('billing_month', { ascending: false });

    const mapped = (billing || []).map((r: any) => ({
      ...r,
      packet_label: r.agency_port_packets?.receiving_pha_name || 'Port',
      counterparty: r.agency_port_packets?.receiving_pha_code || '',
      role: r.billing_agency_id === agencyId ? 'billing' as const : 'paying' as const,
    }));
    setRows(mapped);

    // packets we own that are billed (we're the billing agency)
    const { data: packets } = await supabase
      .from('agency_port_packets')
      .select('id, receiving_pha_name, packet_type, decision')
      .eq('agency_id', agencyId)
      .eq('decision', 'billed');
    setBilledPackets((packets || []).map((p: any) => ({
      id: p.id,
      label: `${p.receiving_pha_name || 'Port'} (${p.packet_type})`,
    })));

    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, [agencyId]);

  const addBilling = async () => {
    if (!form.port_packet_id || !form.billing_month) { toast.error('Packet and month required'); return; }
    setSaving(true);
    // get packet to know paying agency
    const { data: packet } = await supabase
      .from('agency_port_packets')
      .select('agency_id, porting_request_id, porting_requests!inner(from_agency_id, to_agency_id)')
      .eq('id', form.port_packet_id)
      .single();
    const pr: any = (packet as any)?.porting_requests;
    // billing agency = us (agency that absorbed/bills); paying = the other side
    const paying_agency_id = pr.from_agency_id === agencyId ? pr.to_agency_id : pr.from_agency_id;
    const hap = Number(form.hap_portion) || 0;
    const admin = Number(form.admin_fee_portion) || 0;
    const { error } = await supabase.from('agency_port_billing').insert({
      port_packet_id: form.port_packet_id,
      billing_agency_id: agencyId,
      paying_agency_id,
      billing_month: form.billing_month + '-01',
      hap_portion: hap,
      admin_fee_portion: admin,
      total_amount: hap + admin,
      status: 'pending',
    });
    setSaving(false);
    if (error) { toast.error('Failed to add billing'); return; }
    toast.success('Billing month added');
    setAddOpen(false);
    setForm({ port_packet_id: '', billing_month: '', hap_portion: '', admin_fee_portion: '' });
    fetchAll();
  };

  const updateStatus = async (id: string, status: string) => {
    const updates: any = { status };
    if (status === 'invoiced') updates.invoiced_at = new Date().toISOString();
    if (status === 'paid') updates.paid_at = new Date().toISOString();
    const { error } = await supabase.from('agency_port_billing').update(updates).eq('id', id);
    if (error) { toast.error('Update failed'); return; }
    toast.success('Status updated');
    fetchAll();
  };

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-base">
          <DollarSign className="w-4 h-4" /> Port Billing Reconciliation
        </CardTitle>
        {billedPackets.length > 0 && (
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <Plus className="w-4 h-4 mr-1" />Add Month
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">No billing reconciliations yet.</p>
        ) : (
          <div className="space-y-2">
            {rows.map(r => (
              <div key={r.id} className="flex items-center justify-between p-3 border rounded-md">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{r.packet_label}</span>
                    <Badge variant="outline" className="text-xs">{r.role === 'billing' ? 'We bill' : 'We pay'}</Badge>
                    <Badge className={statusColors[r.status] || 'bg-muted'}>{r.status}</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(r.billing_month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} •
                    HAP ${Number(r.hap_portion).toFixed(2)} + Admin ${Number(r.admin_fee_portion).toFixed(2)} = <strong>${Number(r.total_amount).toFixed(2)}</strong>
                  </div>
                </div>
                {r.role === 'billing' && r.status === 'pending' && (
                  <Button size="sm" variant="outline" onClick={() => updateStatus(r.id, 'invoiced')}>Mark Invoiced</Button>
                )}
                {r.role === 'billing' && r.status === 'invoiced' && (
                  <Button size="sm" variant="outline" onClick={() => updateStatus(r.id, 'paid')}>Mark Paid</Button>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Billing Month</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Port Packet</Label>
              <select className="w-full border rounded-md p-2 text-sm bg-background"
                value={form.port_packet_id}
                onChange={(e) => setForm({ ...form, port_packet_id: e.target.value })}>
                <option value="">Select packet…</option>
                {billedPackets.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
              </select>
            </div>
            <div>
              <Label>Billing Month</Label>
              <Input type="month" value={form.billing_month}
                onChange={(e) => setForm({ ...form, billing_month: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>HAP Portion ($)</Label>
                <Input type="number" step="0.01" value={form.hap_portion}
                  onChange={(e) => setForm({ ...form, hap_portion: e.target.value })} />
              </div>
              <div>
                <Label>Admin Fee ($)</Label>
                <Input type="number" step="0.01" value={form.admin_fee_portion}
                  onChange={(e) => setForm({ ...form, admin_fee_portion: e.target.value })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={addBilling} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default PortBillingPanel;

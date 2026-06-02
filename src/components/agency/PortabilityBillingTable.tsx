import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Plus, DollarSign } from 'lucide-react';

interface Props {
  portabilityId: string;
  agencyId: string;
  defaultHapAmount?: number | null;
  defaultAdminFee?: number | null;
}

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  invoiced: 'bg-blue-100 text-blue-800',
  paid: 'bg-green-100 text-green-800',
  overdue: 'bg-red-100 text-red-800',
  cancelled: 'bg-muted',
};

const PortabilityBillingTable: React.FC<Props> = ({ portabilityId, agencyId, defaultHapAmount, defaultAdminFee }) => {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<string>(new Date().toISOString().slice(0, 7));
  const [hap, setHap] = useState<string>(defaultHapAmount?.toString() || '');
  const [admin, setAdmin] = useState<string>(defaultAdminFee?.toString() || '0');

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('agency_portability_billing').select('*').eq('portability_id', portabilityId).order('billing_period_month', { ascending: false });
    setRows(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [portabilityId]);

  const addBilling = async () => {
    if (!period || !hap) { toast.error('Period and HAP amount required'); return; }
    const monthDate = `${period}-01`;
    const { error } = await supabase.from('agency_portability_billing').insert({
      portability_id: portabilityId,
      agency_id: agencyId,
      billing_period_month: monthDate,
      hap_amount: parseFloat(hap),
      admin_fee: parseFloat(admin || '0'),
      status: 'pending',
    });
    if (error) { toast.error(error.message); return; }
    toast.success('Billing record added');
    load();
  };

  const markPaid = async (id: string) => {
    const { error } = await supabase.from('agency_portability_billing').update({ status: 'paid', paid_date: new Date().toISOString().slice(0, 10) }).eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success('Marked paid');
    load();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base"><DollarSign className="w-4 h-4" /> Monthly Billing</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2 items-end p-3 border border-border rounded-lg bg-muted/30">
          <div className="flex-1 min-w-[120px]">
            <label className="text-xs text-muted-foreground">Period</label>
            <Input type="month" value={period} onChange={e => setPeriod(e.target.value)} />
          </div>
          <div className="flex-1 min-w-[100px]">
            <label className="text-xs text-muted-foreground">HAP $</label>
            <Input type="number" step="0.01" value={hap} onChange={e => setHap(e.target.value)} />
          </div>
          <div className="flex-1 min-w-[100px]">
            <label className="text-xs text-muted-foreground">Admin Fee $</label>
            <Input type="number" step="0.01" value={admin} onChange={e => setAdmin(e.target.value)} />
          </div>
          <Button onClick={addBilling}><Plus className="w-4 h-4 mr-1" />Add</Button>
        </div>

        {loading ? <p className="text-center text-muted-foreground py-4">Loading...</p> : rows.length === 0 ? (
          <p className="text-center text-muted-foreground py-4">No billing records yet</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Period</TableHead>
                <TableHead>HAP</TableHead>
                <TableHead>Admin</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map(r => (
                <TableRow key={r.id}>
                  <TableCell>{new Date(r.billing_period_month).toLocaleDateString(undefined, { year: 'numeric', month: 'short' })}</TableCell>
                  <TableCell>${Number(r.hap_amount).toFixed(2)}</TableCell>
                  <TableCell>${Number(r.admin_fee).toFixed(2)}</TableCell>
                  <TableCell className="font-medium">${Number(r.total_amount).toFixed(2)}</TableCell>
                  <TableCell><Badge className={statusColors[r.status] || ''}>{r.status}</Badge></TableCell>
                  <TableCell>{r.status !== 'paid' && <Button size="sm" variant="outline" onClick={() => markPaid(r.id)}>Mark Paid</Button>}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

export default PortabilityBillingTable;

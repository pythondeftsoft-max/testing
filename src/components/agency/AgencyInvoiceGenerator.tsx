import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Trash2, FileDown, Send, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useSuperAdminCheck } from '@/hooks/useSuperAdminCheck';
import { useAgencyEmailSettings } from '@/hooks/useAgencyEmailSettings';

interface Props {
  agencyId: string;
}

interface LineItem {
  description: string;
  amount: number;
}

const AgencyInvoiceGenerator: React.FC<Props> = ({ agencyId }) => {
  const { data: isSuperAdmin } = useSuperAdminCheck();
  const { data: emailSettings } = useAgencyEmailSettings(agencyId);
  const [contracts, setContracts] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedContractId, setSelectedContractId] = useState<string>('');
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { description: 'Monthly Platform Fee', amount: 0 },
  ]);
  const [dueDate, setDueDate] = useState('');

  useEffect(() => {
    supabase.from('agency_contracts').select('*').eq('agency_id', agencyId).eq('status', 'active')
      .then(({ data }) => {
        setContracts((data as any[]) || []);
        if (data && data.length > 0) {
          setSelectedContractId(data[0].id);
          const items: LineItem[] = [{ description: 'Monthly Platform Fee', amount: Number((data[0] as any).monthly_rate) || 0 }];
          // Auto-add custom email domain fee if applicable
          const domainFee = Number((data[0] as any).custom_email_domain_fee) || 0;
          if (domainFee > 0) {
            items.push({ description: 'Custom Email Domain Add-On', amount: domainFee });
          }
          setLineItems(items);
        }
      });
  }, [agencyId]);

  // Also check email settings for fee when they load
  useEffect(() => {
    if (emailSettings && emailSettings.sender_mode === 'custom_domain' && emailSettings.monthly_addon_fee > 0) {
      setLineItems(prev => {
        const hasAddon = prev.some(li => li.description === 'Custom Email Domain Add-On');
        if (!hasAddon) {
          return [...prev, { description: 'Custom Email Domain Add-On', amount: emailSettings.monthly_addon_fee }];
        }
        return prev;
      });
    }
  }, [emailSettings]);

  const addLineItem = () => setLineItems(prev => [...prev, { description: '', amount: 0 }]);
  const removeLineItem = (i: number) => setLineItems(prev => prev.filter((_, idx) => idx !== i));
  const updateLineItem = (i: number, field: keyof LineItem, value: string | number) => {
    setLineItems(prev => prev.map((item, idx) => idx === i ? { ...item, [field]: value } : item));
  };

  const total = lineItems.reduce((sum, li) => sum + (Number(li.amount) || 0), 0);

  const generateInvoiceNumber = () => {
    const now = new Date();
    return `INV-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
  };

  const createInvoice = async (status: 'draft' | 'sent') => {
    if (!isSuperAdmin) { toast.error('Only super admins can generate invoices'); return; }
    if (total <= 0) { toast.error('Invoice total must be greater than 0'); return; }
    setSaving(true);

    const today = new Date().toISOString().split('T')[0];
    const payload = {
      agency_id: agencyId,
      contract_id: selectedContractId || null,
      invoice_number: generateInvoiceNumber(),
      amount: total,
      line_items: lineItems,
      status,
      issued_date: today,
      due_date: dueDate || null,
    };

    const { error } = await supabase.from('agency_invoices').insert(payload as any);
    if (error) { toast.error('Failed to create invoice'); console.error(error); }
    else {
      toast.success(`Invoice ${status === 'sent' ? 'created & sent' : 'saved as draft'}`);
      setDialogOpen(false);
    }
    setSaving(false);
  };

  if (!isSuperAdmin) return null;

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-2"><FileDown className="w-4 h-4" /> Generate Invoice</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Generate Invoice</DialogTitle></DialogHeader>
        <div className="space-y-4">
          {contracts.length > 0 && (
            <div>
              <Label>Contract</Label>
              <Select value={selectedContractId} onValueChange={v => {
                setSelectedContractId(v);
                const c = contracts.find(c => c.id === v);
                if (c) setLineItems([{ description: 'Monthly Platform Fee', amount: Number(c.monthly_rate) || 0 }]);
              }}>
                <SelectTrigger><SelectValue placeholder="Select contract" /></SelectTrigger>
                <SelectContent>
                  {contracts.map(c => (
                    <SelectItem key={c.id} value={c.id}>${Number(c.monthly_rate).toLocaleString()}/mo — {c.payment_terms}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <Label>Due Date</Label>
            <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Line Items</Label>
              <Button size="sm" variant="ghost" onClick={addLineItem}><Plus className="w-3 h-3 mr-1" /> Add</Button>
            </div>
            {lineItems.map((item, i) => (
              <div key={i} className="flex gap-2 items-center">
                <Input
                  className="flex-1"
                  placeholder="Description"
                  value={item.description}
                  onChange={e => updateLineItem(i, 'description', e.target.value)}
                />
                <Input
                  className="w-28"
                  type="number"
                  placeholder="Amount"
                  value={item.amount || ''}
                  onChange={e => updateLineItem(i, 'amount', parseFloat(e.target.value) || 0)}
                />
                {lineItems.length > 1 && (
                  <Button size="icon" variant="ghost" onClick={() => removeLineItem(i)}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                )}
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <span className="font-medium">Total</span>
            <span className="text-lg font-bold">${total.toLocaleString()}</span>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" className="flex-1 gap-2" onClick={() => createInvoice('draft')} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />} Save Draft
            </Button>
            <Button className="flex-1 gap-2" onClick={() => createInvoice('sent')} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Send Invoice
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AgencyInvoiceGenerator;

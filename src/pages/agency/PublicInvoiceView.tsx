import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';

export default function PublicInvoiceView() {
  const { token } = useParams();
  const [invoice, setInvoice] = useState<any>(null);
  const [agency, setAgency] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    (async () => {
      const { data } = await supabase
        .from('agency_invoices')
        .select('*, housing_authorities(name, slug)')
        .eq('public_token', token)
        .maybeSingle();
      setInvoice(data);
      setAgency((data as any)?.housing_authorities);
      setLoading(false);
    })();
  }, [token]);

  if (loading) return <div className="p-12 text-center"><Loader2 className="inline h-5 w-5 animate-spin" /></div>;
  if (!invoice) return <div className="p-12 text-center text-muted-foreground">Invoice not found.</div>;

  const items = (invoice.line_items as any[]) || [];

  return (
    <div className="max-w-3xl mx-auto p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Invoice {invoice.invoice_number}</h1>
          <p className="text-muted-foreground">{agency?.name}</p>
        </div>
        <Badge variant={invoice.status === 'paid' ? 'default' : 'secondary'} className="text-base px-3 py-1">
          {invoice.status.toUpperCase()}
        </Badge>
      </div>

      <Card>
        <CardHeader><CardTitle>Summary</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><span className="text-muted-foreground">Issued:</span> {invoice.issued_date}</div>
            <div><span className="text-muted-foreground">Due:</span> {invoice.due_date}</div>
          </div>
          <table className="w-full text-sm">
            <thead className="border-b"><tr><th className="text-left py-2">Description</th><th className="text-right py-2">Amount</th></tr></thead>
            <tbody>
              {items.map((li, i) => (
                <tr key={i} className="border-b"><td className="py-2">{li.description}</td><td className="text-right py-2">${Number(li.amount).toLocaleString()}</td></tr>
              ))}
              <tr className="font-bold"><td className="py-3">Total</td><td className="text-right py-3">${Number(invoice.amount).toLocaleString()}</td></tr>
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Payment Instructions</CardTitle></CardHeader>
        <CardContent className="text-sm space-y-2">
          <p>Please remit payment by ACH or check within {invoice.due_date ? '30 days' : 'the agreed terms'}.</p>
          <div className="bg-muted/50 p-4 rounded space-y-1 font-mono text-xs">
            <div>Pay to: OpenKey Housing, Inc.</div>
            <div>Reference: {invoice.invoice_number}</div>
            <div>Contact accounting@openkeyhousing.com for ACH instructions.</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

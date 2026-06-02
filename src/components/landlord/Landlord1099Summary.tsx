import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileDown, DollarSign, CalendarDays, Package, Loader2 } from 'lucide-react';
import { useLandlordHAPPaymentStats } from '@/hooks/useLandlordHAPTransactions';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Props {
  landlordId: string;
  landlordName?: string;
  portfolioId?: string;
}

const Landlord1099Summary: React.FC<Props> = ({ landlordId, landlordName, portfolioId }) => {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(String(currentYear));
  const [bundling, setBundling] = useState(false);
  const { toast } = useToast();
  const { data: stats } = useLandlordHAPPaymentStats(landlordId, portfolioId);

  const annualTotal = stats?.annualTotals?.[selectedYear] || 0;
  const paymentCount = stats?.annualCounts?.[selectedYear] || 0;

  const downloadYearEndBundle = async () => {
    setBundling(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-yearend-bundle', {
        body: { landlord_id: landlordId, tax_year: Number(selectedYear) },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Failed to generate bundle');
      window.open(data.signed_url, '_blank');
      toast({ title: 'Year-end bundle ready', description: `${data.pages} pages combined.` });
    } catch (e: any) {
      toast({ title: 'Bundle failed', description: String(e.message || e), variant: 'destructive' });
    } finally {
      setBundling(false);
    }
  };

  const downloadPDF = () => {
    const doc = new jsPDF();
    const year = selectedYear;

    doc.setFontSize(16);
    doc.text('Annual HAP Payment Summary', 14, 20);
    doc.setFontSize(10);
    doc.text(`Tax Year: ${year}`, 14, 28);
    doc.text(`Landlord: ${landlordName || 'N/A'}`, 14, 35);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 42);

    doc.setFontSize(12);
    doc.text('Summary', 14, 56);

    autoTable(doc, {
      startY: 60,
      head: [['Description', 'Amount']],
      body: [
        ['Total HAP Payments Received', `$${Number(annualTotal).toLocaleString()}`],
        ['Number of Payments', String(paymentCount)],
        ['Tax Year', year],
      ],
      styles: { fontSize: 10 },
      headStyles: { fillColor: [41, 65, 122] },
    });

    const y = (doc as any).lastAutoTable.finalY + 20;
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text('This summary is provided for informational purposes only.', 14, y);
    doc.text('Consult your tax advisor regarding 1099-MISC reporting requirements.', 14, y + 5);
    doc.text('Amounts shown may differ from official IRS Form 1099-MISC.', 14, y + 10);

    doc.save(`hap-1099-summary-${year}.pdf`);
  };

  const years = Array.from({ length: 5 }, (_, i) => String(currentYear - i));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <Select value={selectedYear} onValueChange={setSelectedYear}>
          <SelectTrigger className="w-[120px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={downloadYearEndBundle} disabled={bundling}>
            {bundling ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Package className="h-4 w-4 mr-1" />}
            Download Year-End Bundle
          </Button>
          <Button variant="outline" size="sm" onClick={downloadPDF}>
            <FileDown className="h-4 w-4 mr-1" /> Download 1099 Summary
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-6 flex items-center gap-4">
            <DollarSign className="h-10 w-10 text-primary" />
            <div>
              <p className="text-3xl font-bold">${Number(annualTotal).toLocaleString()}</p>
              <p className="text-sm text-muted-foreground">Total HAP for {selectedYear}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 flex items-center gap-4">
            <CalendarDays className="h-10 w-10 text-primary" />
            <div>
              <p className="text-3xl font-bold">{paymentCount}</p>
              <p className="text-sm text-muted-foreground">Payments in {selectedYear}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">Important Notice</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            If your total HAP payments exceed $600 in a calendar year, you may receive an IRS Form 1099-MISC
            from the housing authority. This summary is for your records and does not replace the official 1099 form.
            Please consult a tax professional for guidance.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Landlord1099Summary;

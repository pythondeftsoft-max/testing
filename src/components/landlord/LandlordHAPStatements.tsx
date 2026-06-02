import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, Download, DollarSign, CalendarRange } from 'lucide-react';
import { useHAPStatements, type HAPStatementLineItem } from '@/hooks/useHAPStatements';
import { downloadAnnualStatementPdf } from '@/utils/landlordAnnualStatement';
import jsPDF from 'jspdf';

interface Props {
  landlordId: string;
  landlordName?: string;
}

const LandlordHAPStatements: React.FC<Props> = ({ landlordId, landlordName }) => {
  const { statements, loading } = useHAPStatements(landlordId);

  const availableYears = useMemo(() => {
    const years = new Set<number>();
    statements.forEach(s => years.add(new Date(s.statement_month + 'T00:00:00').getFullYear()));
    const arr = Array.from(years).sort((a, b) => b - a);
    return arr.length ? arr : [new Date().getFullYear()];
  }, [statements]);

  const [annualYear, setAnnualYear] = useState<number>(availableYears[0]);

  React.useEffect(() => {
    if (!availableYears.includes(annualYear)) setAnnualYear(availableYears[0]);
  }, [availableYears, annualYear]);

  const downloadAnnual = () => {
    downloadAnnualStatementPdf({ year: annualYear, landlordName, statements });
  };

  const fmt = (n: number) => `$${Number(n).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

  const downloadPdf = (statement: typeof statements[0]) => {
    const doc = new jsPDF();
    const month = new Date(statement.statement_month + 'T00:00:00').toLocaleDateString('en-US', { year: 'numeric', month: 'long' });

    doc.setFontSize(18);
    doc.text('HAP Owner Statement', 20, 25);
    doc.setFontSize(11);
    doc.text(`Statement Period: ${month}`, 20, 35);
    doc.text(`Total Payment: ${fmt(statement.total_amount)}`, 20, 42);
    doc.text(`Generated: ${new Date(statement.created_at).toLocaleDateString()}`, 20, 49);

    doc.setFontSize(10);
    let y = 65;
    doc.setFont('helvetica', 'bold');
    doc.text('Property', 20, y);
    doc.text('Unit', 80, y);
    doc.text('HAP', 110, y);
    doc.text('Adj', 140, y);
    doc.text('Net', 170, y);
    doc.setFont('helvetica', 'normal');

    const items = statement.line_items as HAPStatementLineItem[];
    items.forEach(item => {
      y += 8;
      if (y > 270) { doc.addPage(); y = 20; }
      doc.text(item.property_name?.slice(0, 25) || '-', 20, y);
      doc.text(item.unit_number || '-', 80, y);
      doc.text(fmt(item.hap_amount), 110, y);
      doc.text(fmt(item.adjustment_amount), 140, y);
      doc.text(fmt(item.net_payment), 170, y);
    });

    doc.save(`HAP_Statement_${month.replace(' ', '_')}.pdf`);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">HAP Owner Statements</h2>
        </div>
      </div>

      {/* Annual Summary Rollup */}
      <Card className="border-primary/30 bg-primary/5">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <CalendarRange className="h-4 w-4 text-primary" />
            Annual Summary (for tax prep)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <p className="text-sm text-muted-foreground flex-1">
              Aggregates all monthly statements for a tax year, with property-level subtotals that reconcile to your 1099-MISC.
            </p>
            <Select value={String(annualYear)} onValueChange={v => setAnnualYear(Number(v))}>
              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                {availableYears.map(y => (
                  <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={downloadAnnual} disabled={statements.length === 0}>
              <Download className="h-4 w-4 mr-2" /> Download Annual PDF
            </Button>
          </div>
        </CardContent>
      </Card>

      {statements.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No HAP statements available yet.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {statements.map(stmt => {
            const items = stmt.line_items as HAPStatementLineItem[];
            const month = new Date(stmt.statement_month + 'T00:00:00').toLocaleDateString('en-US', { year: 'numeric', month: 'long' });

            return (
              <Card key={stmt.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      {month}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{fmt(stmt.total_amount)}</Badge>
                      <Button size="sm" variant="outline" onClick={() => downloadPdf(stmt)}>
                        <Download className="h-3.5 w-3.5 mr-1" /> PDF
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-xs text-muted-foreground space-y-1">
                    {items.map((item, i) => (
                      <div key={i} className="flex justify-between py-1 border-b last:border-0">
                        <span>{item.property_name} — Unit {item.unit_number}</span>
                        <span className="font-mono">{fmt(item.net_payment)}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default LandlordHAPStatements;

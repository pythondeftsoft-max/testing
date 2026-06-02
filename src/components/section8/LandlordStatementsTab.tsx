import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DollarSign, Calendar, Download, Home, FileDown } from 'lucide-react';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface LandlordStatementsTabProps {
  userId: string;
}

const groupByMonth = (items: any[]) => {
  const groups: Record<string, any[]> = {};
  items.forEach(item => {
    const date = item.created_at ? new Date(item.created_at) : new Date();
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(item);
  });
  return Object.entries(groups).sort(([a], [b]) => b.localeCompare(a));
};

const formatMonth = (key: string) => {
  const [year, month] = key.split('-');
  return new Date(Number(year), Number(month) - 1).toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
};

const fmt = (n: number) => `$${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

const LandlordStatementsTab = ({ userId }: LandlordStatementsTabProps) => {
  const currentYear = new Date().getFullYear();
  const [summaryYear, setSummaryYear] = useState(String(currentYear));
  const years = Array.from({ length: 5 }, (_, i) => String(currentYear - i));

  const { data: statements, isLoading } = useQuery({
    queryKey: ['landlord-s8-statements', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hap_batch_items')
        .select('*')
        .eq('landlord_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (!data?.length) return [];

      // Enrich with unit/property info and batch reference
      const unitIds = [...new Set(data.filter(d => d.unit_id).map(d => d.unit_id))];
      const batchIds = [...new Set(data.filter(d => d.batch_id).map(d => d.batch_id))];
      const unitMap: Record<string, any> = {};
      const propMap: Record<string, any> = {};
      const batchMap: Record<string, any> = {};

      if (unitIds.length) {
        const { data: units } = await supabase
          .from('property_units')
          .select('id, unit_number, property_id')
          .in('id', unitIds);
        const propIds = new Set<string>();
        units?.forEach(u => { unitMap[u.id] = u; if (u.property_id) propIds.add(u.property_id); });
        if (propIds.size) {
          const { data: props } = await supabase
            .from('properties')
            .select('id, address, city')
            .in('id', Array.from(propIds));
          props?.forEach(p => { propMap[p.id] = p; });
        }
      }

      if (batchIds.length) {
        const { data: batches } = await (supabase as any)
          .from('hap_batches')
          .select('id, batch_number, period_start, period_end, status')
          .in('id', batchIds);
        batches?.forEach((b: any) => { batchMap[b.id] = b; });
      }

      return data.map(item => {
        const unit = unitMap[item.unit_id];
        const prop = unit?.property_id ? propMap[unit.property_id] : null;
        const batch = batchMap[item.batch_id];
        return {
          ...item,
          property_address: prop ? `${prop.address}, ${prop.city}` : null,
          unit_number: unit?.unit_number || null,
          batch_number: batch?.batch_number || null,
          batch_status: batch?.status || null,
          period_start: batch?.period_start || null,
          period_end: batch?.period_end || null,
        };
      });
    },
  });

  const downloadMonthPdf = (monthKey: string, items: any[]) => {
    const doc = new jsPDF();
    const month = formatMonth(monthKey);
    const total = items.reduce((s, i) => s + (i.net_payment || 0), 0);

    doc.setFontSize(18);
    doc.text('HAP Owner Statement', 20, 25);
    doc.setFontSize(11);
    doc.text(`Period: ${month}`, 20, 35);
    doc.text(`Total Net Payment: ${fmt(total)}`, 20, 42);
    doc.text(`Generated: ${format(new Date(), 'MMMM d, yyyy')}`, 20, 49);

    autoTable(doc, {
      startY: 60,
      head: [['Property', 'Unit', 'Batch', 'HAP', 'Adj', 'Net']],
      body: items.map(item => [
        (item.property_address || 'N/A').slice(0, 28),
        item.unit_number || '-',
        item.batch_number || '-',
        fmt(item.hap_amount),
        fmt(item.adjustment_amount),
        fmt(item.net_payment),
      ]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [41, 65, 122] },
    });

    doc.save(`HAP_Statement_${month.replace(' ', '_')}.pdf`);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!statements?.length) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <DollarSign className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">No Statements</h3>
          <p className="text-muted-foreground">No HAP disbursement statements are available yet.</p>
        </CardContent>
      </Card>
    );
  }

  const grouped = groupByMonth(statements);
  const totalAll = statements.reduce((s: number, i: any) => s + (i.net_payment || 0), 0);

  // Annual totals for 1099 summary
  const annualTotals: Record<string, { total: number; count: number }> = {};
  (statements || []).forEach((item: any) => {
    const yr = String(new Date(item.created_at).getFullYear());
    if (!annualTotals[yr]) annualTotals[yr] = { total: 0, count: 0 };
    annualTotals[yr].total += item.net_payment || 0;
    annualTotals[yr].count += 1;
  });

  const download1099Summary = () => {
    const yearData = annualTotals[summaryYear] || { total: 0, count: 0 };
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('Annual HAP Payment Summary (1099-Ready)', 14, 20);
    doc.setFontSize(10);
    doc.text(`Tax Year: ${summaryYear}`, 14, 28);
    doc.text(`Generated: ${format(new Date(), 'MMMM d, yyyy')}`, 14, 35);

    autoTable(doc, {
      startY: 45,
      head: [['Description', 'Amount']],
      body: [
        ['Total HAP Payments Received', fmt(yearData.total)],
        ['Number of Payments', String(yearData.count)],
        ['Tax Year', summaryYear],
      ],
      styles: { fontSize: 10 },
      headStyles: { fillColor: [41, 65, 122] },
    });

    const y = (doc as any).lastAutoTable.finalY + 15;
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text('This summary is provided for informational purposes only.', 14, y);
    doc.text('If total exceeds $600, you may receive IRS Form 1099-MISC.', 14, y + 5);
    doc.text('Consult your tax advisor regarding reporting requirements.', 14, y + 10);

    doc.save(`HAP_1099_Summary_${summaryYear}.pdf`);
  };

  return (
    <div className="space-y-4">
      {/* 1099 Annual Summary Section */}
      {statements && statements.length > 0 && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="py-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-semibold text-foreground flex items-center gap-2">
                  <FileDown className="h-4 w-4 text-primary" />
                  1099 Annual Summary
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Download a tax-year summary of HAP payments received
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Select value={summaryYear} onValueChange={setSummaryYear}>
                  <SelectTrigger className="w-[100px] h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                  </SelectContent>
                </Select>
                <div className="text-sm font-medium text-foreground min-w-[80px]">
                  {fmt(annualTotals[summaryYear]?.total || 0)}
                </div>
                <Button variant="outline" size="sm" onClick={download1099Summary}>
                  <Download className="h-3.5 w-3.5 mr-1" /> 1099 PDF
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Statements Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Owner Statements</h2>
        </div>
        <Badge variant="secondary" className="text-sm">{fmt(totalAll)} total</Badge>
      </div>

      {grouped.map(([monthKey, items]) => {
        const monthTotal = items.reduce((s: number, i: any) => s + (i.net_payment || 0), 0);
        return (
          <Card key={monthKey}>
            <CardContent className="py-4 space-y-3">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <h3 className="font-medium text-foreground flex items-center gap-1.5">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  {formatMonth(monthKey)}
                </h3>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{fmt(monthTotal)}</Badge>
                  <Button size="sm" variant="outline" onClick={() => downloadMonthPdf(monthKey, items)}>
                    <Download className="h-3.5 w-3.5 mr-1" /> PDF
                  </Button>
                </div>
              </div>

              {/* Detail table */}
              <div className="overflow-x-auto -mx-2">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground">
                      <th className="text-left py-2 px-2 font-medium">Property</th>
                      <th className="text-left py-2 px-2 font-medium hidden sm:table-cell">Unit</th>
                      <th className="text-left py-2 px-2 font-medium hidden md:table-cell">Batch</th>
                      <th className="text-right py-2 px-2 font-medium">HAP</th>
                      <th className="text-right py-2 px-2 font-medium hidden sm:table-cell">Adj</th>
                      <th className="text-right py-2 px-2 font-medium">Net</th>
                      <th className="text-right py-2 px-2 font-medium hidden lg:table-cell">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item: any) => (
                      <tr key={item.id} className="border-b border-border last:border-0">
                        <td className="py-2 px-2">
                          <div className="flex items-center gap-1">
                            <Home className="h-3 w-3 shrink-0 text-muted-foreground" />
                            <span className="truncate max-w-[180px]">{item.property_address || 'Unknown'}</span>
                          </div>
                        </td>
                        <td className="py-2 px-2 hidden sm:table-cell">{item.unit_number || '-'}</td>
                        <td className="py-2 px-2 hidden md:table-cell font-mono text-muted-foreground">{item.batch_number || '-'}</td>
                        <td className="py-2 px-2 text-right font-mono">{fmt(item.hap_amount)}</td>
                        <td className="py-2 px-2 text-right font-mono hidden sm:table-cell">
                          {item.adjustment_amount !== 0 && item.adjustment_amount != null ? (
                            <span className="text-destructive">{fmt(item.adjustment_amount)}</span>
                          ) : '-'}
                        </td>
                        <td className="py-2 px-2 text-right font-mono font-medium text-foreground">{fmt(item.net_payment)}</td>
                        <td className="py-2 px-2 text-right hidden lg:table-cell">
                          <Badge variant="outline" className="text-[10px] capitalize">
                            {item.status || 'pending'}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default LandlordStatementsTab;

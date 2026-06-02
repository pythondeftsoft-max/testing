import React from 'react';
import { Button } from '@/components/ui/button';
import { FileDown } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { RentComparable, RentReasonablenessAnalysis } from '@/hooks/useRentComparables';

interface Props {
  agencyName: string;
  proposedRent: number;
  analysis: RentReasonablenessAnalysis | null;
  comparables: RentComparable[];
  propertyAddress?: string;
}

const RentReasonablenessPDF: React.FC<Props> = ({ agencyName, proposedRent, analysis, comparables, propertyAddress }) => {
  const generate = () => {
    const doc = new jsPDF();
    const now = new Date();

    // Title
    doc.setFontSize(16);
    doc.text('Rent Reasonableness Determination', 14, 20);
    doc.setFontSize(10);
    doc.text(agencyName, 14, 28);
    doc.text(`Generated: ${now.toLocaleDateString()}`, 14, 34);

    if (propertyAddress) {
      doc.text(`Subject Property: ${propertyAddress}`, 14, 42);
    }

    // Proposed rent
    let y = propertyAddress ? 52 : 44;
    doc.setFontSize(12);
    doc.text(`Proposed Rent: $${proposedRent.toLocaleString()}`, 14, y);
    y += 10;

    // Comparables table
    if (comparables.length > 0) {
      autoTable(doc, {
        startY: y,
        head: [['Address', 'BR', 'BA', 'Sq Ft', 'Rent', 'Condition', 'Date Surveyed']],
        body: comparables.map(c => [
          c.address,
          String(c.bedrooms),
          String(c.bathrooms),
          c.square_footage ? c.square_footage.toLocaleString() : '—',
          `$${Number(c.monthly_rent).toLocaleString()}`,
          c.unit_condition || '—',
          new Date(c.date_surveyed).toLocaleDateString(),
        ]),
        styles: { fontSize: 8 },
        headStyles: { fillColor: [41, 65, 122] },
      });

      y = (doc as any).lastAutoTable.finalY + 10;
    }

    // Analysis results
    if (analysis) {
      doc.setFontSize(11);
      doc.text(`Comparable Average: $${analysis.comparable_avg?.toLocaleString() ?? '—'}`, 14, y);
      doc.text(`Comparable Median: $${analysis.comparable_median?.toLocaleString() ?? '—'}`, 14, y + 7);
      doc.text(`Comparables Used: ${analysis.comparable_count}`, 14, y + 14);

      y += 24;
      doc.setFontSize(14);
      const det = analysis.determination.toUpperCase();
      doc.setTextColor(det === 'PASS' ? 34 : 220, det === 'PASS' ? 139 : 53, det === 'PASS' ? 34 : 69);
      doc.text(`Determination: ${det}`, 14, y);
      doc.setTextColor(0, 0, 0);
      y += 14;
    }

    // Signature line
    y = Math.max(y, 220);
    doc.setFontSize(10);
    doc.line(14, y, 100, y);
    doc.text('Analyst Signature', 14, y + 5);
    doc.line(120, y, 196, y);
    doc.text('Date', 120, y + 5);

    doc.save(`rent-reasonableness-${now.toISOString().split('T')[0]}.pdf`);
  };

  return (
    <Button variant="outline" size="sm" onClick={generate}>
      <FileDown className="h-4 w-4 mr-1" /> Export PDF
    </Button>
  );
};

export default RentReasonablenessPDF;

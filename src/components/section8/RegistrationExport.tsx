import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';
import { useState } from 'react';
import jsPDF from 'jspdf';
import type { AgencyLandlord } from '@/hooks/useAgencyLandlords';

interface RegistrationExportProps {
  registration: AgencyLandlord;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'icon';
}

export const RegistrationExport = ({ registration, variant = 'outline', size = 'sm' }: RegistrationExportProps) => {
  const [generating, setGenerating] = useState(false);

  const generatePDF = () => {
    setGenerating(true);
    try {
      const doc = new jsPDF();
      const margin = 20;
      let y = margin;

      // Title
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('Section 8 Registration Summary', margin, y);
      y += 12;

      // PHA Info
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      const phaName = registration.agency?.name || 'Housing Authority';
      const phaLocation = [registration.agency?.city, registration.agency?.state].filter(Boolean).join(', ');
      doc.text(`Housing Authority: ${phaName}`, margin, y); y += 7;
      if (phaLocation) { doc.text(`Location: ${phaLocation}`, margin, y); y += 7; }
      y += 5;

      // Landlord Info
      doc.setFont('helvetica', 'bold');
      doc.text('Landlord Information', margin, y); y += 7;
      doc.setFont('helvetica', 'normal');
      doc.text(`Name: ${registration.landlord_name}`, margin, y); y += 7;
      doc.text(`Email: ${registration.landlord_email}`, margin, y); y += 7;
      doc.text(`Payment Method: ${registration.payment_method.replace(/_/g, ' ')}`, margin, y); y += 7;
      doc.text(`W-9 Status: ${registration.w9_status}`, margin, y); y += 7;
      doc.text(`Onboarding Status: ${registration.onboarding_status.replace(/_/g, ' ')}`, margin, y); y += 7;
      doc.text(`Registered: ${new Date(registration.created_at).toLocaleDateString()}`, margin, y); y += 12;

      // Enrolled Units
      if (registration.units && registration.units.length > 0) {
        doc.setFont('helvetica', 'bold');
        doc.text('Enrolled Units', margin, y); y += 7;
        doc.setFont('helvetica', 'normal');
        registration.units.forEach(u => {
          const propName = u.property?.address || u.property?.name || 'Property';
          const unitLabel = u.unit?.unit_number ? ` — Unit ${u.unit.unit_number}` : '';
          const location = [u.property?.city, u.property?.state].filter(Boolean).join(', ');
          doc.text(`• ${propName}${unitLabel}${location ? ` (${location})` : ''}`, margin + 4, y);
          y += 6;
          if (y > 270) { doc.addPage(); y = margin; }
        });
        y += 5;
      }

      // Notes
      if (registration.notes) {
        doc.setFont('helvetica', 'bold');
        doc.text('Notes', margin, y); y += 7;
        doc.setFont('helvetica', 'normal');
        const lines = doc.splitTextToSize(registration.notes, 170);
        doc.text(lines, margin, y);
      }

      // Footer
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(128);
        doc.text(`Generated ${new Date().toLocaleString()} — Page ${i} of ${pageCount}`, margin, 285);
      }

      doc.save(`registration-${phaName.replace(/\s+/g, '-').toLowerCase()}-${registration.id.slice(0, 8)}.pdf`);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Button variant={variant} size={size} onClick={generatePDF} disabled={generating}>
      {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
      {size !== 'icon' && <span className="ml-1">Export PDF</span>}
    </Button>
  );
};

import React, { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Download, FileText } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { toast } from 'sonner';

import { Figure1SystemArchitecture } from './figures/Figure1SystemArchitecture';
import { Figure2EntityRelationship } from './figures/Figure2EntityRelationship';
import { Figure3PaymentTaggingSequence } from './figures/Figure3PaymentTaggingSequence';
import { Figure4TenantLifecycle } from './figures/Figure4TenantLifecycle';
import { Figure5PaymentProcessing } from './figures/Figure5PaymentProcessing';
import { Figure6AutoTagRules } from './figures/Figure6AutoTagRules';
import { Figure7AdminControlPlane } from './figures/Figure7AdminControlPlane';
import { Figure8PaymentCorrection } from './figures/Figure8PaymentCorrection';

const figures = [
  { id: 'fig-1', label: 'FIG. 1', title: 'System Architecture Diagram', component: Figure1SystemArchitecture },
  { id: 'fig-2', label: 'FIG. 2', title: 'Entity-Relationship Diagram', component: Figure2EntityRelationship },
  { id: 'fig-3', label: 'FIG. 3', title: 'Payment Tagging Sequence Diagram', component: Figure3PaymentTaggingSequence },
  { id: 'fig-4', label: 'FIG. 4', title: 'Tenant Application Lifecycle State Machine', component: Figure4TenantLifecycle },
  { id: 'fig-5', label: 'FIG. 5', title: 'End-to-End Payment Processing Flowchart', component: Figure5PaymentProcessing },
  { id: 'fig-6', label: 'FIG. 6', title: 'Auto-Tag Rules Processing Flow', component: Figure6AutoTagRules },
  { id: 'fig-7', label: 'FIG. 7', title: 'Administrative Control Plane Architecture', component: Figure7AdminControlPlane },
  { id: 'fig-8', label: 'FIG. 8', title: 'Payment Correction State Machine', component: Figure8PaymentCorrection },
];

// Convert canvas to pure black and white
const convertToBW = (canvas: HTMLCanvasElement): void => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  
  // Threshold conversion to pure B&W
  for (let i = 0; i < data.length; i += 4) {
    const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
    const bw = avg > 128 ? 255 : 0;
    data[i] = bw;     // R
    data[i + 1] = bw; // G
    data[i + 2] = bw; // B
    // Alpha stays the same
  }
  
  ctx.putImageData(imageData, 0, 0);
};

export function WorkflowFiguresTab() {
  const [activeTab, setActiveTab] = useState('fig-1');
  const [isDownloading, setIsDownloading] = useState(false);

  const downloadPdf = async (figureId: string, title: string) => {
    const element = document.getElementById(figureId);
    if (!element) {
      toast.error('Could not find figure element');
      return;
    }

    setIsDownloading(true);
    try {
      // Scale 1.5 = ~150 DPI (under 300 DPI limit)
      const canvas = await html2canvas(element, { 
        backgroundColor: '#ffffff', 
        scale: 1.5,
        useCORS: true,
        logging: false,
      });
      
      // Convert to pure black and white
      convertToBW(canvas);
      
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'letter',
        compress: true,
        putOnlyUsedFonts: true,
      });
      
      // Use PNG for B&W line art - NO TEXT ADDED VIA jsPDF (pure image only)
      const imgData = canvas.toDataURL('image/png');
      const pdfWidth = 215.9;
      const pdfHeight = 279.4;
      const margin = 12.7; // 0.5 inch margin (USPTO standard)
      const imgWidth = pdfWidth - (margin * 2);
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      // Pure image only - no font dependencies
      pdf.addImage(imgData, 'PNG', margin, margin, imgWidth, Math.min(imgHeight, pdfHeight - (margin * 2)));
      pdf.save(`${figureId}-${title.toLowerCase().replace(/\s+/g, '-')}.pdf`);
      toast.success(`Downloaded ${figureId}.pdf (USPTO-compliant)`);
    } catch (error) {
      console.error('PDF download error:', error);
      toast.error('Failed to download PDF');
    } finally {
      setIsDownloading(false);
    }
  };

  const downloadAllPdfs = async () => {
    setIsDownloading(true);
    const originalTab = activeTab;
    
    try {
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'letter',
        compress: true,
        putOnlyUsedFonts: true,
      });
      
      const pdfWidth = 215.9;
      const pdfHeight = 279.4;
      const margin = 12.7; // 0.5 inch margin (USPTO standard)
      const imgWidth = pdfWidth - (margin * 2);

      for (let i = 0; i < figures.length; i++) {
        const fig = figures[i];
        setActiveTab(fig.id);
        await new Promise(resolve => setTimeout(resolve, 200));

        const element = document.getElementById(fig.id);
        if (!element) continue;

        // Scale 1.5 = ~150 DPI (under 300 DPI limit, good quality for print)
        const canvas = await html2canvas(element, {
          backgroundColor: '#ffffff',
          scale: 1.5,
          useCORS: true,
          logging: false,
        });
        
        // Convert to pure black and white
        convertToBW(canvas);

        // Use PNG for B&W line art - NO TEXT ADDED (pure image only, no font dependencies)
        const imgData = canvas.toDataURL('image/png');
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        if (i > 0) pdf.addPage();
        
        // Pure image only - sheet numbers are rendered in the HTML components
        pdf.addImage(
          imgData, 
          'PNG', 
          margin, 
          margin, 
          imgWidth, 
          Math.min(imgHeight, pdfHeight - (margin * 2))
        );
      }

      pdf.save('openkey-patent-workflow-figures.pdf');
      toast.success('Downloaded USPTO-compliant PDF (all figures)');
    } catch (error) {
      console.error('PDF download error:', error);
      toast.error('Failed to download PDF');
    } finally {
      setActiveTab(originalTab);
      setIsDownloading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <FileText className="w-6 h-6 text-primary" />
          <h2 className="text-2xl font-semibold text-foreground">Patent Workflow Figures</h2>
        </div>
        <Button 
          onClick={downloadAllPdfs} 
          variant="default" 
          disabled={isDownloading}
        >
          <Download className="w-4 h-4 mr-2" />
          {isDownloading ? 'Downloading...' : 'Download All (PDF)'}
        </Button>
      </div>
      
      <p className="text-muted-foreground mb-6">
        USPTO-compliant patent diagrams: Helvetica font, pure B&W, under 300 DPI, all fonts embedded.
      </p>
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex flex-wrap gap-1 h-auto p-1 bg-muted">
          {figures.map(fig => (
            <TabsTrigger 
              key={fig.id} 
              value={fig.id} 
              className="text-xs px-3 py-1.5"
            >
              {fig.label}
            </TabsTrigger>
          ))}
        </TabsList>
        
        {figures.map(fig => (
          <TabsContent key={fig.id} value={fig.id} className="mt-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-foreground">
                {fig.label} – {fig.title}
              </h3>
              <Button 
                onClick={() => downloadPdf(fig.id, fig.title)} 
                variant="outline" 
                size="sm"
                disabled={isDownloading}
              >
                <Download className="w-4 h-4 mr-2" />
                {isDownloading ? 'Downloading...' : 'Download PDF'}
              </Button>
            </div>
            <div 
              id={fig.id} 
              className="bg-white border-2 border-black p-8 min-h-[800px] overflow-auto"
              style={{ aspectRatio: '8.5 / 11' }}
            >
              <fig.component />
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

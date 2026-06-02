
import React from 'react';
import { CardEnhanced, CardEnhancedContent, CardEnhancedDescription, CardEnhancedHeader, CardEnhancedTitle } from '@/components/enhanced/CardEnhanced';
import { Button } from '@/components/ui/button';
import { Download, FileSpreadsheet } from 'lucide-react';

interface ReportItem {
  id: string;
  name: string;
  description: string;
  category: 'business' | 'accounting' | 'property' | 'financial';
  icon: React.ComponentType<{ className?: string }>;
  generatePDF: () => Promise<void>;
  generateExcel?: () => Promise<void>;
}

interface ReportCardProps {
  report: ReportItem;
  onReportClick?: (reportId: string) => void;
}

export const ReportCard: React.FC<ReportCardProps> = ({ report, onReportClick }) => {
  const Icon = report.icon;

  const handleGeneratePDF = async () => {
    try {
      await report.generatePDF();
    } catch (error) {
      console.error('Error generating PDF:', error);
    }
  };

  const handleGenerateExcel = async () => {
    if (report.generateExcel) {
      try {
        await report.generateExcel();
      } catch (error) {
        console.error('Error generating Excel:', error);
      }
    }
  };

  const handleCardClick = () => {
    if (onReportClick) {
      onReportClick(report.id);
    }
  };

  return (
    <CardEnhanced 
      variant="elevated" 
      className="h-full cursor-pointer hover:shadow-lg transition-shadow"
      onClick={handleCardClick}
    >
      <CardEnhancedHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-blue-gold">
            <Icon className="h-5 w-5 text-white" />
          </div>
          <div className="flex-1">
            <CardEnhancedTitle className="text-lg" gradient>{report.name}</CardEnhancedTitle>
          </div>
        </div>
        <CardEnhancedDescription className="text-sm">
          {report.description}
        </CardEnhancedDescription>
      </CardEnhancedHeader>
      <CardEnhancedContent className="pt-0">
        <div className="flex gap-2">
          <Button
            onClick={handleGeneratePDF}
            size="sm"
            variant="blue"
            className="flex-1"
          >
            <Download className="h-4 w-4 mr-2" />
            PDF
          </Button>
          {report.generateExcel && (
            <Button
              onClick={handleGenerateExcel}
              variant="outline"
              size="sm"
              className="flex-1 border-openkey-gold text-openkey-gold hover:bg-openkey-gold hover:text-white"
            >
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Excel
            </Button>
          )}
        </div>
      </CardEnhancedContent>
    </CardEnhanced>
  );
};

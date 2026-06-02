import React from 'react';
import { Button } from '@/components/ui/button';
import { Download, FileText } from 'lucide-react';
import { usePropertyImportTemplate } from '@/hooks/usePropertyImportTemplate';
import { ImportTemplateOptions } from '@/types/propertyImport';

interface TemplateDownloadButtonProps {
  templateType: 'simple' | 'units';
}

const TemplateDownloadButton = ({ templateType }: TemplateDownloadButtonProps) => {
  const { downloadTemplate, isDownloading } = usePropertyImportTemplate();

  const handleDownload = () => {
    const options: ImportTemplateOptions = { template_type: templateType };
    downloadTemplate(options);
  };

  const getButtonText = () => {
    if (templateType === 'simple') {
      return 'Simple Properties Template';
    }
    return 'Properties with Units Template';
  };

  const getDescription = () => {
    if (templateType === 'simple') {
      return 'For single-family homes, townhouses, or condos without separate units';
    }
    return 'For apartment buildings, duplexes, or properties with multiple rental units';
  };

  return (
    <div className="space-y-2">
      <Button
        variant="outline"
        onClick={handleDownload}
        disabled={isDownloading}
        className="gap-2"
      >
        {isDownloading ? (
          <>
            <FileText className="h-4 w-4 animate-pulse" />
            Generating...
          </>
        ) : (
          <>
            <Download className="h-4 w-4" />
            {getButtonText()}
          </>
        )}
      </Button>
      <p className="text-xs text-muted-foreground">{getDescription()}</p>
    </div>
  );
};

export default TemplateDownloadButton;
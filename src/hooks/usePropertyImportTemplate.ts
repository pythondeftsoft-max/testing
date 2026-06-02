
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { generateImportTemplate } from '@/services/propertyImportApi';
import { ImportTemplateOptions } from '@/types/propertyImport';
import { toast } from 'sonner';

export const usePropertyImportTemplate = () => {
  const [isDownloading, setIsDownloading] = useState(false);

  const generateTemplateMutation = useMutation({
    mutationFn: generateImportTemplate,
    onSuccess: (data, variables) => {
      // Create and trigger download
      const templateType = variables.template_type || 'simple';
      const filename = `property-import-template-${templateType}-${new Date().toISOString().split('T')[0]}.csv`;
      
      const blob = new Blob([data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success('Template downloaded successfully');
      setIsDownloading(false);
    },
    onError: (error) => {
      console.error('Template generation error:', error);
      toast.error('Failed to generate template');
      setIsDownloading(false);
    }
  });

  const downloadTemplate = (options: ImportTemplateOptions = {}) => {
    setIsDownloading(true);
    generateTemplateMutation.mutate(options);
  };

  return {
    downloadTemplate,
    isDownloading: isDownloading || generateTemplateMutation.isPending,
    error: generateTemplateMutation.error
  };
};

import React, { useCallback, useState, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Upload, AlertCircle, FileText, ArrowRight, Loader2 } from 'lucide-react';
import { PropertyImportData } from '@/types/propertyImport';
import { toast } from 'sonner';
import TemplateDownloadButton from './TemplateDownloadButton';
import { usePropertyImport } from './ImportContext';

interface ImportUploadStepProps {
  className?: string;
  onNextStep?: (csvData: PropertyImportData[]) => void;
}

export function ImportUploadStep({ className }: ImportUploadStepProps) {
  const { setCsvDataAndGoToProcessing } = usePropertyImport();
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [csvData, setCsvData] = useState<PropertyImportData[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  
  // Re-entry protection and timeout management
  const hasNavigatedRef = useRef(false);
  const navigationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const parseCSV = (csvText: string): PropertyImportData[] => {
    console.log('Starting CSV parsing...');
    const lines = csvText.trim().split('\n');
    if (lines.length < 2) {
      throw new Error('CSV file must contain at least a header row and one data row');
    }

    // More robust CSV parsing that handles quotes and commas in values
    const parseCSVLine = (line: string): string[] => {
      const result: string[] = [];
      let current = '';
      let inQuotes = false;
      let i = 0;
      
      while (i < line.length) {
        const char = line[i];
        
        if (char === '"') {
          if (inQuotes && line[i + 1] === '"') {
            // Escaped quote
            current += '"';
            i += 2;
          } else {
            // Toggle quote state
            inQuotes = !inQuotes;
            i++;
          }
        } else if (char === ',' && !inQuotes) {
          result.push(current.trim());
          current = '';
          i++;
        } else {
          current += char;
          i++;
        }
      }
      
      result.push(current.trim());
      return result;
    };

    const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase().replace(/\s+/g, '_'));
    console.log('Parsed headers:', headers);
    const data: PropertyImportData[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue; // Skip empty lines
      
      const values = parseCSVLine(line);
      const row: any = {};
      
      headers.forEach((header, index) => {
        const value = values[index] || '';
        row[header] = value;
      });

      // Keep original CSV data structure for field mapping
      const propertyData: PropertyImportData = {
        street_address: '',
        city: '',
        state: '',
        zipcode: '',
        ...row
      };

      console.log(`Row ${i} raw data:`, propertyData);
      
      data.push(propertyData);
    }

    console.log('Final parsed data:', data.length, 'rows');
    return data;
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.csv')) {
      toast.error('Please upload a CSV file');
      return;
    }

    setUploadedFile(file);
    setIsProcessing(true);

    try {
      const text = await file.text();
      const parsed = parseCSV(text);
      setCsvData(parsed);
      toast.success(`Parsed ${parsed.length} rows from CSV`);
    } catch (error) {
      toast.error(`Error parsing CSV: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setUploadedFile(null);
      setCsvData([]);
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.csv']
    },
    multiple: false,
    maxSize: 10 * 1024 * 1024 // 10MB
  });

  const handleNext = () => {
    if (!csvData.length || isLoading) {
      console.log('[ImportUploadStep] handleNext blocked:', { 
        csvDataLength: csvData.length, 
        isLoading,
        isProcessing,
        isNavigating 
      });
      return;
    }
    
    // Prevent multiple clicks
    if (hasNavigatedRef.current) {
      console.log('[ImportUploadStep] Navigation already in progress, ignoring click');
      return;
    }
    
    console.log('[ImportUploadStep] Going directly to processing with data:', {
      rowCount: csvData.length,
      timestamp: new Date().toISOString(),
      sampleData: csvData.slice(0, 2)
    });
    
    hasNavigatedRef.current = true;
    setIsNavigating(true);
    
    try {
      // Go directly to processing step, bypassing field mapping
      const success = setCsvDataAndGoToProcessing(csvData);
      
      if (success) {
        console.log('[ImportUploadStep] Successfully navigated to processing');
        toast.success('Proceeding to processing step');
      } else {
        console.warn('[ImportUploadStep] Navigation to processing failed');
        toast.error('Failed to proceed to processing');
        setIsNavigating(false);
        hasNavigatedRef.current = false;
      }
      
    } catch (error) {
      console.error('[ImportUploadStep] Navigation error:', error);
      setIsNavigating(false);
      hasNavigatedRef.current = false;
      toast.error('Failed to proceed to processing');
    }
  };

  const handleRemoveFile = () => {
    console.log('[ImportUploadStep] Removing file and resetting state');
    setUploadedFile(null);
    setCsvData([]);
    setIsNavigating(false);
    hasNavigatedRef.current = false;
    
    // Clear any pending timeouts
    if (navigationTimeoutRef.current) {
      clearTimeout(navigationTimeoutRef.current);
      navigationTimeoutRef.current = null;
    }
  };

  const isLoading = isProcessing || isNavigating;

  return (
    <div className="space-y-6">
      {/* Template Download Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">1. Download Template</h3>
        <p className="text-muted-foreground">
          Start by downloading our CSV template to ensure your data is formatted correctly.
        </p>
        <div className="flex gap-3">
          <TemplateDownloadButton templateType="simple" />
          <TemplateDownloadButton templateType="units" />
        </div>
      </div>

      {/* File Upload Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">2. Upload Your CSV File</h3>
        
        {!uploadedFile ? (
          <Card>
            <CardContent className="p-6">
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                  isDragActive
                    ? 'border-primary bg-primary/5'
                    : 'border-muted-foreground/25 hover:border-primary hover:bg-primary/5'
                }`}
              >
                <input {...getInputProps()} />
                <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                {isDragActive ? (
                  <p className="text-lg font-medium">Drop your CSV file here...</p>
                ) : (
                  <>
                    <p className="text-lg font-medium mb-2">
                      Drag & drop your CSV file here, or click to browse
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Supports CSV files up to 10MB
                    </p>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileText className="h-8 w-8 text-primary" />
                  <div>
                    <p className="font-medium">{uploadedFile.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {csvData.length} rows • {(uploadedFile.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={handleRemoveFile}>
                  Remove
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Preview Section */}
      {csvData.length > 0 && (
        <div className="space-y-4">
          {/* CSV Data Preview */}
          <Card>
            <CardContent className="p-4">
              <h4 className="font-medium mb-2">Data Preview</h4>
              <p className="text-sm text-muted-foreground mb-3">
                First few columns of your uploaded data:
              </p>
              <ScrollArea className="h-80 w-full">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border border-border rounded">
                    <thead>
                      <tr className="bg-muted">
                        {Object.keys(csvData[0]).slice(0, 6).map(header => (
                          <th key={header} className="border border-border p-2 text-left">
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {csvData.slice(0, 10).map((row, index) => (
                        <tr key={index}>
                          {Object.keys(row).slice(0, 6).map(key => (
                            <td key={key} className="border border-border p-2">
                              {String(row[key as keyof PropertyImportData] || '-')}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          <div className="flex items-center gap-2 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <p className="text-sm text-blue-800 dark:text-blue-200">
              Ready to process {csvData.length} property records with AI-powered analysis
            </p>
          </div>
          
          <div className="flex justify-end">
            <Button 
              onClick={handleNext}
              disabled={isLoading}
              size="lg"
              className="gap-2"
            >
              {isNavigating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Going to Processing...
                </>
              ) : (
                <>
                  Next: Processing
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </div>
          
        </div>
      )}
    </div>
  );
}

import React, { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Upload, Download, FileText, CheckCircle, AlertCircle } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';

interface CSVImportDialogProps {
  portfolioId: string;
  trigger?: React.ReactNode;
  onImportComplete: () => void;
}

interface ImportResult {
  success: boolean;
  processed: number;
  errors: string[];
}

const IMPORT_TYPES = [
  { value: 'assets', label: 'Portfolio Assets', template: 'assets-template.csv' },
  { value: 'liabilities', label: 'Liabilities', template: 'liabilities-template.csv' },
  { value: 'stocks', label: 'Stocks & ETFs', template: 'stocks-template.csv' },
  { value: 'crypto', label: 'Cryptocurrency', template: 'crypto-template.csv' },
];

export const CSVImportDialog: React.FC<CSVImportDialogProps> = ({
  portfolioId,
  trigger,
  onImportComplete
}) => {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    getUser();
  }, []);
  const [open, setOpen] = useState(false);
  const [importType, setImportType] = useState<string>('');
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ImportResult | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const csvFile = acceptedFiles[0];
    if (csvFile && csvFile.type === 'text/csv') {
      setFile(csvFile);
    } else {
      toast.error('Please upload a valid CSV file');
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.csv']
    },
    multiple: false
  });

  const downloadTemplate = (templateName: string) => {
    // Generate CSV template based on import type
    let csvContent = '';
    
    switch (importType) {
      case 'assets':
        csvContent = 'asset_name,asset_value,acquisition_cost,annual_income,annual_expenses,asset_category,tags,description\n';
        csvContent += 'Example Property,500000,450000,24000,5000,real_estate,"property,rental",Investment property in downtown\n';
        csvContent += 'Apple Stock,15000,12000,150,0,stocks,"tech,dividend",100 shares of AAPL\n';
        break;
      case 'liabilities':
        csvContent = 'liability_name,current_balance,original_amount,interest_rate,monthly_payment,liability_type,is_secured,description\n';
        csvContent += 'Home Mortgage,350000,400000,3.5,1800,mortgage,true,Primary residence mortgage\n';
        csvContent += 'Credit Card,5000,10000,18.9,200,credit_card,false,Chase Freedom card\n';
        break;
      case 'stocks':
        csvContent = 'symbol,shares,acquisition_price,acquisition_date,dividend_yield,asset_name\n';
        csvContent += 'AAPL,100,150.00,2023-01-15,0.5,Apple Inc.\n';
        csvContent += 'MSFT,50,300.00,2023-02-01,0.8,Microsoft Corporation\n';
        break;
      case 'crypto':
        csvContent = 'symbol,amount,acquisition_price,acquisition_date,wallet_address,asset_name\n';
        csvContent += 'BTC,0.5,45000,2023-01-15,1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa,Bitcoin\n';
        csvContent += 'ETH,2.0,2500,2023-02-01,0x742d35Cc6639C0532fEb04e63e0d4E1E6a8db60B,Ethereum\n';
        break;
    }

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = templateName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const processImport = async () => {
    if (!file || !importType || !user) return;

    setImporting(true);
    setProgress(0);

    try {
      // Parse CSV file
      const text = await file.text();
      const lines = text.split('\n');
      const headers = lines[0].split(',').map(h => h.trim());
      
      const csvData = lines.slice(1)
        .filter(line => line.trim())
        .map(line => {
          const values = line.split(',');
          const row: any = {};
          headers.forEach((header, index) => {
            row[header] = values[index]?.trim() || '';
          });
          return row;
        });

      // Simulate progress
      setProgress(50);

      // Call edge function to process data
      const { data, error } = await supabase.functions.invoke('csv-import-processor', {
        body: {
          csvData,
          portfolioId,
          userId: user.id,
          importType
        }
      });

      setProgress(100);

      if (error) throw error;

      setResult({
        success: data.imported > 0,
        processed: data.imported,
        errors: data.errors || []
      });

      if (data.imported > 0) {
        toast.success(`Successfully imported ${data.imported} items`);
        onImportComplete();
      } else {
        toast.error('Import completed with errors');
      }
    } catch (error) {
      console.error('Import error:', error);
      setResult({
        success: false,
        processed: 0,
        errors: ['Failed to process the import file. Please check the format and try again.']
      });
      toast.error('Import failed');
    } finally {
      setImporting(false);
    }
  };

  const resetDialog = () => {
    setImportType('');
    setFile(null);
    setImporting(false);
    setProgress(0);
    setResult(null);
  };

  return (
    <Dialog open={open} onOpenChange={(open) => {
      setOpen(open);
      if (!open) resetDialog();
    }}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Upload className="w-4 h-4 mr-2" />
            Import CSV
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import Portfolio Data</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {!result && (
            <>
              {/* Import Type Selection */}
              <div className="space-y-2">
                <Label>Import Type</Label>
                <Select value={importType} onValueChange={setImportType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select what you want to import" />
                  </SelectTrigger>
                  <SelectContent>
                    {IMPORT_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Template Download */}
              {importType && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Download className="w-4 h-4" />
                      Download Template
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-3">
                      Download the CSV template to see the required format and example data.
                    </p>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        const template = IMPORT_TYPES.find(t => t.value === importType);
                        if (template) downloadTemplate(template.template);
                      }}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download {IMPORT_TYPES.find(t => t.value === importType)?.label} Template
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* File Upload */}
              {importType && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Upload className="w-4 h-4" />
                      Upload CSV File
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div
                      {...getRootProps()}
                      className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                        isDragActive ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <input {...getInputProps()} />
                      {file ? (
                        <div className="flex items-center justify-center gap-2 text-primary">
                          <FileText className="w-5 h-5" />
                          <span>{file.name}</span>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <Upload className="w-8 h-8 mx-auto text-muted-foreground" />
                          <p className="text-sm">
                            {isDragActive ? 'Drop the CSV file here' : 'Drag & drop CSV file here, or click to select'}
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Progress */}
              {importing && (
                <Card>
                  <CardContent className="p-6">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Processing import...</span>
                        <span className="text-sm text-muted-foreground">{progress}%</span>
                      </div>
                      <Progress value={progress} />
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}

          {/* Results */}
          {result && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  {result.success ? (
                    <CheckCircle className="w-5 h-5 text-success" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-destructive" />
                  )}
                  Import {result.success ? 'Completed' : 'Failed'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm">
                  Processed: <strong>{result.processed}</strong> items
                </p>
                {result.errors.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-destructive">Errors:</p>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      {result.errors.slice(0, 5).map((error, index) => (
                        <li key={index}>• {error}</li>
                      ))}
                      {result.errors.length > 5 && (
                        <li>• ... and {result.errors.length - 5} more errors</li>
                      )}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              {result ? 'Close' : 'Cancel'}
            </Button>
            {!result && (
              <Button 
                onClick={processImport}
                disabled={!file || !importType || importing}
              >
                {importing ? 'Processing...' : 'Import Data'}
              </Button>
            )}
            {result && (
              <Button onClick={resetDialog} variant="outline">
                Import More
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
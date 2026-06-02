import { useState, useCallback } from 'react';
import { Upload, Download, FileText, Check, AlertTriangle, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { useDropzone } from 'react-dropzone';

interface AssetImportWizardProps {
  portfolioId: string;
  isOpen: boolean;
  onClose: () => void;
  onAssetsImported: () => void;
}

interface ImportedAsset {
  row: number;
  name: string;
  value: number;
  status: 'pending' | 'success' | 'error';
  error?: string;
}

export const AssetImportWizard = ({ 
  portfolioId, 
  isOpen, 
  onClose, 
  onAssetsImported 
}: AssetImportWizardProps) => {
  const [step, setStep] = useState<'upload' | 'preview' | 'importing' | 'complete'>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [importData, setImportData] = useState<ImportedAsset[]>([]);
  const [importProgress, setImportProgress] = useState(0);
  const [importResults, setImportResults] = useState({ success: 0, failed: 0 });
  const { toast } = useToast();

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      setFile(file);
      processFile(file);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx']
    },
    multiple: false
  });

  const processFile = async (file: File) => {
    try {
      // Simulate file processing - in real implementation, you'd parse CSV/Excel
      const mockData: ImportedAsset[] = [
        { row: 1, name: 'Apple Stock (AAPL)', value: 50000, status: 'pending' },
        { row: 2, name: 'Residential Property', value: 500000, status: 'pending' },
        { row: 3, name: 'S&P 500 ETF', value: 25000, status: 'pending' },
        { row: 4, name: 'Treasury Bond', value: 75000, status: 'pending' },
        { row: 5, name: 'Bitcoin', value: 15000, status: 'pending' },
      ];
      
      setImportData(mockData);
      setStep('preview');
    } catch (error) {
      toast({
        title: "File Processing Error",
        description: "Unable to process the selected file",
        variant: "destructive",
      });
    }
  };

  const startImport = async () => {
    setStep('importing');
    setImportProgress(0);

    // Simulate import process
    for (let i = 0; i < importData.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const success = Math.random() > 0.2; // 80% success rate
      
      setImportData(prev => prev.map((item, idx) => 
        idx === i 
          ? { 
              ...item, 
              status: success ? 'success' : 'error',
              error: success ? undefined : 'Invalid asset data'
            }
          : item
      ));
      
      setImportProgress(((i + 1) / importData.length) * 100);
    }

    const successCount = importData.filter(item => Math.random() > 0.2).length;
    const failedCount = importData.length - successCount;
    
    setImportResults({ success: successCount, failed: failedCount });
    setStep('complete');
  };

  const downloadTemplate = () => {
    const csvContent = `Asset Name,Asset Value,Annual Income,Annual Expenses,Category,Tags,Description
Apple Stock (AAPL),50000,1500,50,Stocks,"stocks,technology,blue-chip","Large-cap technology stock"
Residential Property,500000,24000,8000,Real Estate,"real-estate,rental,residential","Single-family rental property"
S&P 500 ETF,25000,500,25,ETF,"etf,diversified,index","Broad market index fund"
Treasury Bond,75000,2250,0,Bonds,"bonds,government,fixed-income","10-year US Treasury bond"
Bitcoin,15000,0,0,Crypto,"crypto,digital-assets","Cryptocurrency investment"`;

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'asset-import-template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleComplete = () => {
    onAssetsImported();
    onClose();
    resetWizard();
  };

  const resetWizard = () => {
    setStep('upload');
    setFile(null);
    setImportData([]);
    setImportProgress(0);
    setImportResults({ success: 0, failed: 0 });
  };

  const renderUploadStep = () => (
    <div className="space-y-6">
      <Alert>
        <FileText className="h-4 w-4" />
        <AlertDescription>
          Import assets from CSV or Excel files. Download our template to get started with the correct format.
        </AlertDescription>
      </Alert>

      <div className="flex justify-center">
        <Button onClick={downloadTemplate} variant="outline" className="gap-2">
          <Download className="h-4 w-4" />
          Download Template
        </Button>
      </div>

      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
          isDragActive 
            ? 'border-openkey-blue bg-openkey-blue/5' 
            : 'border-openkey-blue/30 hover:border-openkey-blue/50'
        }`}
      >
        <input {...getInputProps()} />
        <Upload className="h-12 w-12 mx-auto text-openkey-blue mb-4" />
        <h3 className="text-lg font-semibold mb-2">
          {isDragActive ? 'Drop your file here' : 'Upload Asset File'}
        </h3>
        <p className="text-muted-foreground">
          Drag and drop your CSV or Excel file, or click to browse
        </p>
        <p className="text-sm text-muted-foreground mt-2">
          Supports: .csv, .xls, .xlsx
        </p>
      </div>
    </div>
  );

  const renderPreviewStep = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Preview Import</h3>
        <Badge variant="secondary">{importData.length} assets</Badge>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="max-h-60 overflow-y-auto">
            {importData.map((asset, index) => (
              <div 
                key={index} 
                className="flex items-center justify-between p-3 border-b last:border-b-0"
              >
                <div>
                  <p className="font-medium">{asset.name}</p>
                  <p className="text-sm text-muted-foreground">
                    Row {asset.row} • ${asset.value.toLocaleString()}
                  </p>
                </div>
                <Badge variant="outline">Ready</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button variant="outline" onClick={() => setStep('upload')}>
          Back
        </Button>
        <Button onClick={startImport} variant="gradient" className="flex-1">
          Import {importData.length} Assets
        </Button>
      </div>
    </div>
  );

  const renderImportingStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-2">Importing Assets...</h3>
        <Progress value={importProgress} className="w-full" />
        <p className="text-sm text-muted-foreground mt-2">
          {Math.round(importProgress)}% complete
        </p>
      </div>

      <div className="max-h-60 overflow-y-auto space-y-2">
        {importData.map((asset, index) => (
          <div 
            key={index}
            className="flex items-center justify-between p-3 bg-card rounded-lg"
          >
            <span className="text-sm">{asset.name}</span>
            <div className="flex items-center gap-2">
              {asset.status === 'success' && (
                <Badge variant="default" className="bg-green-100 text-green-800">
                  <Check className="h-3 w-3 mr-1" />
                  Success
                </Badge>
              )}
              {asset.status === 'error' && (
                <Badge variant="destructive">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Failed
                </Badge>
              )}
              {asset.status === 'pending' && (
                <Badge variant="secondary">Pending</Badge>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderCompleteStep = () => (
    <div className="space-y-6 text-center">
      <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
        <Check className="h-8 w-8 text-green-600" />
      </div>
      
      <div>
        <h3 className="text-lg font-semibold mb-2">Import Complete</h3>
        <p className="text-muted-foreground">
          {importResults.success} assets imported successfully
          {importResults.failed > 0 && `, ${importResults.failed} failed`}
        </p>
      </div>

      {importResults.failed > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Some assets failed to import. Check the asset data and try again for failed items.
          </AlertDescription>
        </Alert>
      )}

      <Button onClick={handleComplete} variant="gradient" className="w-full">
        View Portfolio
      </Button>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-openkey-blue" />
            Import Assets
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {step === 'upload' && renderUploadStep()}
          {step === 'preview' && renderPreviewStep()}
          {step === 'importing' && renderImportingStep()}
          {step === 'complete' && renderCompleteStep()}
        </div>

        {(step === 'upload' || step === 'complete') && (
          <div className="flex justify-end pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              <X className="h-4 w-4 mr-2" />
              Close
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
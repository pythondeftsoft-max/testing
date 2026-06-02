import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Upload, Database, CheckCircle, ArrowLeft } from 'lucide-react';
import { usePropertyImport } from './ImportContext';

const ImportSubmittingStep = () => {
  const { importStep, goToStep, isSubmittingImport } = usePropertyImport();

  return (
    <div className="space-y-6 text-center">
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <div className="p-4 rounded-full bg-primary/10">
            <Loader2 className="h-8 w-8 text-primary animate-spin" />
          </div>
        </div>
        
        <div>
          <h3 className="text-xl font-semibold mb-2">Importing Properties</h3>
          <p className="text-muted-foreground">
            Your properties and units are being created. This may take a few moments.
          </p>
        </div>
      </div>

      {/* Progress Steps */}
      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="p-2 rounded-full bg-green-100 dark:bg-green-900/20">
                <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div className="text-left">
                <p className="font-medium">Data Validated</p>
                <p className="text-sm text-muted-foreground">All import data has been validated</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900/20">
                <Upload className="h-5 w-5 text-blue-600 dark:text-blue-400 animate-pulse" />
              </div>
              <div className="text-left">
                <p className="font-medium">Creating Properties</p>
                <p className="text-sm text-muted-foreground">Adding properties to your portfolio</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="p-2 rounded-full bg-gray-100 dark:bg-gray-900/20">
                <Database className="h-5 w-5 text-gray-400" />
              </div>
              <div className="text-left">
                <p className="font-medium text-muted-foreground">Setting up Units</p>
                <p className="text-sm text-muted-foreground">Associating units with properties</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Progress Bar */}
      <div className="w-full max-w-md mx-auto">
        <div className="bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div 
            className="bg-primary h-2 rounded-full transition-all duration-300 ease-out"
            style={{ width: `${importStep.progress}%` }}
          />
        </div>
        <p className="text-sm text-muted-foreground mt-2">
          {importStep.progress}% complete
        </p>
      </div>

      <div className="text-sm text-muted-foreground">
        Please don't close this window while the import is in progress.
      </div>

      {/* Back Button (only show if not actively submitting) */}
      {!isSubmittingImport && (
        <div className="flex justify-start gap-3 mt-6">
          <Button 
            variant="outline"
            onClick={() => goToStep('review')}
            size="lg"
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Review
          </Button>
        </div>
      )}
    </div>
  );
};

export default ImportSubmittingStep;
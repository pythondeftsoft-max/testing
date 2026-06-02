import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';
import { ImportValidationError } from '@/types/propertyImport';

interface ImportValidationErrorsProps {
  errors: ImportValidationError[];
}

const ImportValidationErrors = ({ errors }: ImportValidationErrorsProps) => {
  if (errors.length === 0) return null;

  return (
    <Card className="border-red-200 dark:border-red-800">
      <CardHeader className="pb-3">
        <CardTitle className="text-red-600 dark:text-red-400 flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          Validation Errors ({errors.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 max-h-60 overflow-y-auto">
          {errors.map((error, index) => (
            <div 
              key={index}
              className="p-3 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-800"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="font-medium text-sm text-red-800 dark:text-red-200">
                    Row {error.row}: {error.field}
                  </div>
                  <div className="text-sm text-red-600 dark:text-red-400 mt-1">
                    {error.message}
                  </div>
                  {error.value && (
                    <div className="text-xs text-muted-foreground mt-1">
                      Value: "{error.value}"
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            <strong>Please fix these errors in your CSV file and upload again.</strong>
            <br />
            Make sure all required fields (street_address, city, state, zipcode) are filled and properly formatted.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default ImportValidationErrors;
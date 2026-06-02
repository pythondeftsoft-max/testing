import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight, RefreshCw, CheckCircle } from 'lucide-react';
import { ProcessingRowResult } from '@/types/propertyImport';

interface ProcessingActionsProps {
  results: ProcessingRowResult[];
  onReprocessAll: () => void;
  onGoToStep: (step: 'upload' | 'review') => void;
  isReprocessing?: boolean;
}

const ProcessingActions = ({ results, onReprocessAll, onGoToStep, isReprocessing }: ProcessingActionsProps) => {
  const failedCount = results.filter(r => r.status === 'failed').length;
  const successCount = results.filter(r => r.status === 'success').length;
  const canProceed = failedCount === 0;

  return (
    <div className="flex flex-col gap-4">
      {/* Reprocess Actions */}
      {failedCount > 0 && (
        <div className="flex items-center justify-between p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
          <div>
            <h4 className="font-medium text-amber-800 dark:text-amber-200">
              {failedCount} rows need attention
            </h4>
            <p className="text-sm text-amber-700 dark:text-amber-300">
              Edit the failed rows above and reprocess to continue.
            </p>
          </div>
          <Button
            onClick={onReprocessAll}
            disabled={isReprocessing}
            variant="outline"
            className="gap-2"
          >
            {isReprocessing ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Reprocessing...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4" />
                Reprocess All
              </>
            )}
          </Button>
        </div>
      )}

      {/* Success Message */}
      {canProceed && successCount > 0 && (
        <div className="flex items-center gap-2 p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
          <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
          <div>
            <h4 className="font-medium text-green-800 dark:text-green-200">
              All rows processed successfully!
            </h4>
            <p className="text-sm text-green-700 dark:text-green-300">
              Ready to proceed to the review step.
            </p>
          </div>
        </div>
      )}

      {/* Navigation Actions */}
      <div className="flex justify-between gap-3">
        <Button 
          variant="outline"
          onClick={() => onGoToStep('upload')}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Upload
        </Button>
        
        <Button 
          onClick={() => onGoToStep('review')}
          disabled={!canProceed}
          className="gap-2"
        >
          Continue to Review
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default ProcessingActions;
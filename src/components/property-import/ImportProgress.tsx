import React from 'react';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Circle, Loader2 } from 'lucide-react';
import { usePropertyImport } from './ImportContext';

const ImportProgress = () => {
  const { importStep, goToStep, addressProcessingResult } = usePropertyImport();

  const steps = [
    { key: 'upload', label: 'Upload' },
    { key: 'processing', label: 'Processing' },
    { key: 'review', label: 'Review' },
    { key: 'submitting', label: 'Submitting' },
    { key: 'completed', label: 'Complete' }
  ];

  const currentStepIndex = steps.findIndex(step => step.key === importStep.step);

  const getStepIcon = (stepIndex: number) => {
    if (stepIndex < currentStepIndex) {
      return <CheckCircle className="h-4 w-4 text-green-600" />;
    } else if (stepIndex === currentStepIndex) {
      return importStep.step === 'processing' || importStep.step === 'submitting' 
        ? <Loader2 className="h-4 w-4 text-primary animate-spin" />
        : <div className="h-4 w-4 rounded-full bg-primary" />;
    } else {
      return <Circle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStepStatus = (stepIndex: number) => {
    if (stepIndex < currentStepIndex) return 'completed';
    if (stepIndex === currentStepIndex) return 'current';
    return 'pending';
  };

  const canNavigateToStep = (stepIndex: number) => {
    // Can navigate to completed steps, current step, or next step if we have data
    return stepIndex <= currentStepIndex || 
           (stepIndex === 1 && importStep.step === 'upload') ||
           (stepIndex === 2 && addressProcessingResult);
  };

  const handleStepClick = (step: typeof steps[0], index: number) => {
    if (canNavigateToStep(index)) {
      goToStep(step.key as any);
    }
  };

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2">
        {steps.map((step, index) => (
          <div key={step.key} className="flex items-center">
            <div className="flex flex-col items-center gap-2">
              <div 
                className={`flex items-center gap-2 ${
                  canNavigateToStep(index) ? 'cursor-pointer hover:opacity-80' : 'cursor-not-allowed opacity-60'
                }`}
                onClick={() => handleStepClick(step, index)}
              >
                {getStepIcon(index)}
                <Badge 
                  variant={getStepStatus(index) === 'current' ? 'default' : 
                          getStepStatus(index) === 'completed' ? 'secondary' : 'outline'}
                  className="text-xs"
                >
                  {step.label}
                </Badge>
              </div>
            </div>
            
            {index < steps.length - 1 && (
              <div className="flex-1 mx-2">
                <div className={`h-px w-full ${
                  index < currentStepIndex 
                    ? 'bg-green-600' 
                    : 'bg-muted-foreground/20'
                }`} />
              </div>
            )}
          </div>
        ))}
      </div>
      
      {/* Progress percentage for current step */}
      {(importStep.step === 'processing' || importStep.step === 'submitting') && (
        <div className="mt-3">
          <div className="bg-muted rounded-full h-2">
            <div 
              className="bg-primary h-2 rounded-full transition-all duration-300"
              style={{ width: `${importStep.progress}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1 text-center">
            {importStep.progress}% complete
          </p>
        </div>
      )}
    </div>
  );
};

export default ImportProgress;
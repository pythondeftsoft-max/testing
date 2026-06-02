import React from 'react';
import { Stepper } from '@/components/ui/stepper';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface ClickableStep {
  label: string;
  count: number;
  onClick: () => void;
}

interface ClickableStepperProps {
  currentStep: number;
  steps: ClickableStep[];
  className?: string;
}

export const ClickableStepper: React.FC<ClickableStepperProps> = ({ 
  currentStep, 
  steps, 
  className 
}) => {
  return (
    <div className={cn("relative pt-10", className)}>
      <Stepper 
        currentStep={currentStep} 
        steps={steps.map(s => s.label)} 
      />
      
      {/* Clickable overlay with counts */}
      <div className="absolute inset-0 flex items-start justify-between pt-0">
        {steps.map((step, index) => (
          <React.Fragment key={index}>
            <button
              onClick={step.onClick}
              className="flex flex-col items-center gap-1 hover:opacity-80 transition-opacity cursor-pointer group"
              style={{ width: index === steps.length - 1 ? 'auto' : `${100 / steps.length}%` }}
            >
              <Badge 
                variant={
                  index < currentStep ? 'default' : 
                  index === currentStep ? 'secondary' : 
                  'outline'
                }
                className="text-sm px-2 py-1 group-hover:scale-110 transition-transform"
              >
                {step.count}
              </Badge>
            </button>
            {index < steps.length - 1 && <div style={{ flex: 1 }} />}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};


import React from 'react';
import { cn } from '@/lib/utils';
import { CheckCircle, Circle, Clock } from 'lucide-react';

interface ProgressStep {
  id: string;
  label: string;
  status: 'completed' | 'current' | 'pending';
}

interface ProgressTrackerProps {
  steps: ProgressStep[];
  orientation?: 'horizontal' | 'vertical';
  size?: 'sm' | 'md';
  className?: string;
}

export const ProgressTracker = ({ 
  steps, 
  orientation = 'horizontal', 
  size = 'md',
  className 
}: ProgressTrackerProps) => {
  const isHorizontal = orientation === 'horizontal';
  const stepIconSize = size === 'sm' ? 'h-4 w-4' : 'h-5 w-5';
  const stepTextSize = size === 'sm' ? 'text-xs' : 'text-sm';

  const getStepIcon = (status: ProgressStep['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className={cn(stepIconSize, 'text-green-600')} />;
      case 'current':
        return <Clock className={cn(stepIconSize, 'text-primary')} />;
      case 'pending':
        return <Circle className={cn(stepIconSize, 'text-muted-foreground')} />;
    }
  };

  const getStepColor = (status: ProgressStep['status']) => {
    switch (status) {
      case 'completed':
        return 'text-green-600';
      case 'current':
        return 'text-primary';
      case 'pending':
        return 'text-muted-foreground';
    }
  };

  return (
    <div 
      className={cn(
        'flex items-center',
        isHorizontal ? 'flex-row space-x-4' : 'flex-col space-y-3',
        className
      )}
    >
      {steps.map((step, index) => (
        <div
          key={step.id}
          className={cn(
            'flex items-center',
            isHorizontal ? 'flex-row' : 'flex-col'
          )}
        >
          <div className="flex items-center space-x-2">
            {getStepIcon(step.status)}
            <span className={cn(stepTextSize, 'font-medium', getStepColor(step.status))}>
              {step.label}
            </span>
          </div>
          
          {index < steps.length - 1 && (
            <div
              className={cn(
                'bg-border',
                isHorizontal 
                  ? 'w-8 h-px ml-2' 
                  : 'h-4 w-px mt-1'
              )}
            />
          )}
        </div>
      ))}
    </div>
  );
};

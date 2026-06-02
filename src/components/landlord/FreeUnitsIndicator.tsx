import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Gift, ArrowUp } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FreeUnitsIndicatorProps {
  currentProperties: number;
  freeLimit: number;
  onUpgrade: () => void;
}

export const FreeUnitsIndicator = ({ currentProperties, freeLimit, onUpgrade }: FreeUnitsIndicatorProps) => {
  const percentage = (currentProperties / freeLimit) * 100;
  const remaining = freeLimit - currentProperties;
  
  if (currentProperties >= freeLimit) {
    return (
      <Alert variant="destructive" className="mb-6">
        <AlertDescription className="flex items-center justify-between">
          <div>
            <strong>Free management units used!</strong>
            <p className="text-sm mt-1">You're managing {currentProperties} of {freeLimit} free properties. Upgrade to continue managing more.</p>
          </div>
          <Button onClick={onUpgrade} size="sm" className="shrink-0 ml-4">
            <ArrowUp className="h-4 w-4 mr-2" />
            Upgrade Now
          </Button>
        </AlertDescription>
      </Alert>
    );
  }
  
  if (remaining <= 3) {
    return (
      <Alert className="mb-6 bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
        <Gift className="h-4 w-4 text-blue-600 dark:text-blue-400" />
        <AlertDescription>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-medium text-blue-900 dark:text-blue-100">Free Management Units</span>
              <span className="text-sm text-blue-700 dark:text-blue-300">{currentProperties} of {freeLimit} used</span>
            </div>
            <Progress value={percentage} className="h-2" />
            <p className="text-xs text-blue-700 dark:text-blue-300">
              Only {remaining} free units remaining. Upgrade to Basic ($1.16/unit) or Pro ($2/unit) for unlimited management.
            </p>
          </div>
        </AlertDescription>
      </Alert>
    );
  }
  
  return null;
};

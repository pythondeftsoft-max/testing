import { Check, X } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface AutopayIndicatorProps {
  enabled: boolean;
}

export const AutopayIndicator = ({ enabled }: AutopayIndicatorProps) => {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-2">
            {enabled ? (
              <>
                <Check className="w-4 h-4 text-green-600" />
                <span className="text-sm text-green-600">Enabled</span>
              </>
            ) : (
              <>
                <X className="w-4 h-4 text-red-600" />
                <span className="text-sm text-red-600">Disabled</span>
              </>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>{enabled ? 'Automatic payments are active' : 'User pays manually'}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

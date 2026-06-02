import { Building, FileText, Loader2 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface UsageMetricsProps {
  role: string;
  propertyCount?: number;
  applicationCount?: number;
  isLoading: boolean;
}

export const UsageMetrics = ({ role, propertyCount, applicationCount, isLoading }: UsageMetricsProps) => {
  if (isLoading) {
    return (
      <div className="flex items-center gap-2">
        <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
        <span className="text-sm text-gray-500">Loading...</span>
      </div>
    );
  }

  if (role === 'landlord' && propertyCount !== undefined) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-2">
              <Building className="w-4 h-4 text-blue-600" />
              <span className="text-sm">{propertyCount} {propertyCount === 1 ? 'property' : 'properties'}</span>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>Total properties managed</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  if (role === 'tenant' && applicationCount !== undefined) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-purple-600" />
              <span className="text-sm">{applicationCount} {applicationCount === 1 ? 'application' : 'applications'}</span>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>Total applications submitted</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return <span className="text-sm text-gray-400">No data</span>;
};

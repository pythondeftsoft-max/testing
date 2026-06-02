import { Badge } from '@/components/ui/badge';
import { CheckCircle2, AlertCircle, XCircle } from 'lucide-react';

interface LinkValidationBadgeProps {
  status: 'valid' | 'missing' | 'unknown';
  route?: string;
}

export const LinkValidationBadge = ({ status, route }: LinkValidationBadgeProps) => {
  if (status === 'valid') {
    return (
      <Badge variant="outline" className="gap-1 bg-green-500/10 text-green-700 border-green-500/20">
        <CheckCircle2 className="h-3 w-3" />
        Valid Link
      </Badge>
    );
  }

  if (status === 'missing') {
    return (
      <Badge variant="outline" className="gap-1 bg-red-500/10 text-red-700 border-red-500/20">
        <XCircle className="h-3 w-3" />
        No Link
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className="gap-1 bg-yellow-500/10 text-yellow-700 border-yellow-500/20">
      <AlertCircle className="h-3 w-3" />
      Unknown
    </Badge>
  );
};

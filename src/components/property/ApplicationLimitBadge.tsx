import React from 'react';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ApplicationLimitBadgeProps {
  currentCount: number;
  maxAllowed?: number;
  className?: string;
}

export const ApplicationLimitBadge: React.FC<ApplicationLimitBadgeProps> = ({
  currentCount,
  maxAllowed = 6,
  className,
}) => {
  const percentage = (currentCount / maxAllowed) * 100;
  
  const getVariant = () => {
    if (currentCount >= maxAllowed) return 'destructive';
    if (currentCount >= maxAllowed - 1) return 'warning';
    return 'default';
  };

  const getIcon = () => {
    if (currentCount >= maxAllowed) return <AlertCircle className="h-3 w-3" />;
    if (currentCount >= maxAllowed - 1) return <AlertTriangle className="h-3 w-3" />;
    return <CheckCircle className="h-3 w-3" />;
  };

  const getText = () => {
    if (currentCount >= maxAllowed) return 'FULL';
    return `${currentCount}/${maxAllowed}`;
  };

  return (
    <Badge 
      variant={getVariant() as any} 
      className={cn("flex items-center gap-1", className)}
    >
      {getIcon()}
      <span>{getText()}</span>
    </Badge>
  );
};
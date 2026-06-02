
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { CheckCircle, Clock, XCircle, AlertCircle } from 'lucide-react';

interface StatusIndicatorProps {
  status: 'pending' | 'approved' | 'rejected' | 'current' | 'priority' | 'denied';
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  className?: string;
}

export const StatusIndicator = ({ 
  status, 
  size = 'md', 
  showIcon = true,
  className 
}: StatusIndicatorProps) => {
  const statusConfig = {
    pending: {
      label: 'Pending',
      variant: 'secondary' as const,
      icon: Clock,
      className: 'bg-yellow-100 text-yellow-800 border-yellow-300'
    },
    approved: {
      label: 'Approved',
      variant: 'default' as const,
      icon: CheckCircle,
      className: 'bg-green-100 text-green-800 border-green-300'
    },
    rejected: {
      label: 'Rejected',
      variant: 'destructive' as const,
      icon: XCircle,
      className: 'bg-red-100 text-red-800 border-red-300'
    },
    denied: {
      label: 'Denied',
      variant: 'destructive' as const,
      icon: XCircle,
      className: 'bg-red-100 text-red-800 border-red-300'
    },
    current: {
      label: 'Current Tenant',
      variant: 'default' as const,
      icon: CheckCircle,
      className: 'bg-primary/10 text-primary border-primary/30'
    },
    priority: {
      label: 'Priority',
      variant: 'default' as const,
      icon: AlertCircle,
      className: 'bg-accent text-accent-foreground border-accent/50'
    }
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-0.5',
    lg: 'text-base px-3 py-1'
  };

  return (
    <Badge 
      variant={config.variant}
      className={cn(
        'inline-flex items-center gap-1.5 font-medium',
        config.className,
        sizeClasses[size],
        className
      )}
    >
      {showIcon && <Icon className="h-3 w-3" />}
      {config.label}
    </Badge>
  );
};

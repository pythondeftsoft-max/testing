
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface ComputedStatusBadgeProps {
  computedStatus: string;
  className?: string;
}

export const ComputedStatusBadge = ({ computedStatus, className }: ComputedStatusBadgeProps) => {
  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'Occupied / Listed':
        return 'default'; // Blue
      case 'Occupied':
        return 'success'; // Green
      case 'Available':
        return 'warning'; // Orange
      case 'Vacant':
        return 'secondary'; // Gray
      default:
        return 'secondary';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Occupied / Listed':
        return '🏠📋'; // House + listing
      case 'Occupied':
        return '🏠'; // House
      case 'Available':
        return '📋'; // Listing/available
      case 'Vacant':
        return '🔒'; // Locked/vacant
      default:
        return '';
    }
  };

  return (
    <Badge 
      variant={getStatusVariant(computedStatus)} 
      className={cn("text-xs font-medium px-2 py-0.5 text-[10px]", className)}
    >
      <span className="mr-1 text-[10px]">{getStatusIcon(computedStatus)}</span>
      {computedStatus}
    </Badge>
  );
};

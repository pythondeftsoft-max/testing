import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Crown } from 'lucide-react';

interface PrimaryApplicantBadgeProps {
  tenantName?: string;
  className?: string;
}

export const PrimaryApplicantBadge: React.FC<PrimaryApplicantBadgeProps> = ({ 
  tenantName,
  className 
}) => {
  return (
    <Badge 
      variant="default" 
      className={`flex items-center gap-1 ${className}`}
    >
      <Crown className="h-3 w-3" />
      {tenantName ? `Primary: ${tenantName}` : 'Has Primary Applicant'}
    </Badge>
  );
};

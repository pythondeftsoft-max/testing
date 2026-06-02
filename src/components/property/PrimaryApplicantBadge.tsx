import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Crown } from 'lucide-react';

interface PrimaryApplicantBadgeProps {
  className?: string;
  showIcon?: boolean;
}

export const PrimaryApplicantBadge: React.FC<PrimaryApplicantBadgeProps> = ({ 
  className,
  showIcon = true 
}) => {
  return (
    <Badge className={`bg-openkey-gold text-white flex items-center gap-1 ${className || ''}`}>
      {showIcon && <Crown className="h-3 w-3" />}
      Primary Applicant
    </Badge>
  );
};

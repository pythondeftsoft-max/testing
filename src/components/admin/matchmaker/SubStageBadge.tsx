import React from 'react';
import { Badge } from '@/components/ui/badge';
import { 
  Send, 
  Eye, 
  Star
} from 'lucide-react';

// Push status stages (used in property_pushes.status)
// Shows active pipeline stages: push_sent → landlord_review → primary_applicant
// Note: 'interested' removed as it immediately transitions to 'landlord_review'
export const PUSH_STATUS_STAGES = {
  push_sent: { 
    label: 'Sent to Tenant', 
    icon: Send, 
    className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800' 
  },
  landlord_review: { 
    label: 'Landlord Review', 
    icon: Eye, 
    className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800' 
  },
  primary_applicant: { 
    label: 'Primary Applicant', 
    icon: Star, 
    className: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border-purple-200 dark:border-purple-800' 
  },
} as const;

export type PushStatusStage = keyof typeof PUSH_STATUS_STAGES;

interface PushStatusBadgeProps {
  status: string | null;
  size?: 'sm' | 'default';
}

export const PushStatusBadge: React.FC<PushStatusBadgeProps> = ({ 
  status, 
  size = 'sm'
}) => {
  if (!status) return null;

  const stageConfig = PUSH_STATUS_STAGES[status as PushStatusStage];

  if (!stageConfig) return null;

  const Icon = stageConfig.icon;
  const iconSize = size === 'sm' ? 'h-3 w-3' : 'h-4 w-4';
  const textSize = size === 'sm' ? 'text-[10px]' : 'text-xs';

  return (
    <Badge 
      variant="outline" 
      className={`${stageConfig.className} ${textSize} font-medium gap-1 py-0.5 px-1.5`}
    >
      <Icon className={iconSize} />
      {stageConfig.label}
    </Badge>
  );
};

// Legacy exports for backwards compatibility (keeping old structure in case it's referenced)
export const PROPERTY_SUB_STAGES = PUSH_STATUS_STAGES;
export const TENANT_SUB_STAGES = PUSH_STATUS_STAGES;
export type PropertySubStage = PushStatusStage;
export type TenantSubStage = PushStatusStage;

// Alias for the old component name
export const SubStageBadge = PushStatusBadge;

export default PushStatusBadge;

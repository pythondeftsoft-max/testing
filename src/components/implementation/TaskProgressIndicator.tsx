import React from 'react';
import { Badge } from '@/components/ui/badge';
import { ProgressDynamic } from '@/components/ui/progress-dynamic';

interface TaskProgressIndicatorProps {
  completedCount: number;
  totalCount: number;
}

export const TaskProgressIndicator: React.FC<TaskProgressIndicatorProps> = ({
  completedCount,
  totalCount,
}) => {
  if (totalCount === 0) return null;

  const percentage = Math.round((completedCount / totalCount) * 100);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Progress</span>
        <Badge variant="secondary" className="text-xs">
          {completedCount}/{totalCount} steps ({percentage}%)
        </Badge>
      </div>
      <ProgressDynamic value={percentage} className="h-2" />
    </div>
  );
};

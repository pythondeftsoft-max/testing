import React from 'react';
import { Card, CardContent } from '@/components/ui/card';

interface WorkerPerformanceKPICardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  subtitle?: string;
}

export const WorkerPerformanceKPICard: React.FC<WorkerPerformanceKPICardProps> = ({
  title,
  value,
  icon,
  subtitle,
}) => {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
            {subtitle && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            )}
          </div>
          <div className="p-2 bg-accent rounded-lg">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

import React from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface AgencyPageHeaderProps {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  actions?: React.ReactNode;
  breadcrumbs?: React.ReactNode;
  className?: string;
}

/**
 * Standardized page header for all agency portal modules.
 * Provides consistent typography, spacing, and action-button alignment.
 */
export const AgencyPageHeader: React.FC<AgencyPageHeaderProps> = ({
  title,
  subtitle,
  icon: Icon,
  actions,
  breadcrumbs,
  className,
}) => {
  return (
    <div className={cn('mb-6', className)}>
      {breadcrumbs && (
        <div className="mb-2 text-xs text-muted-foreground">{breadcrumbs}</div>
      )}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          {Icon && (
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Icon className="h-5 w-5 text-primary" />
            </div>
          )}
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight leading-tight truncate">
              {title}
            </h1>
            {subtitle && (
              <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
            )}
          </div>
        </div>
        {actions && (
          <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
};

export default AgencyPageHeader;

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  primaryAction?: {
    label: string;
    onClick?: () => void;
    href?: string;
  };
  secondaryAction?: {
    label: string;
    onClick?: () => void;
    href?: string;
  };
  className?: string;
  /** Render without an outer Card wrapper (for use inside an existing Card) */
  bare?: boolean;
}

const EmptyStateInner: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  primaryAction,
  secondaryAction,
}) => (
  <div className="flex flex-col items-center justify-center text-center px-6 py-12">
    <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center mb-4">
      <Icon className="h-7 w-7 text-primary" />
    </div>
    <h3 className="text-base font-semibold mb-1">{title}</h3>
    {description && (
      <p className="text-sm text-muted-foreground max-w-md mb-5">{description}</p>
    )}
    {(primaryAction || secondaryAction) && (
      <div className="flex flex-wrap gap-2 justify-center">
        {primaryAction && (
          primaryAction.href ? (
            <Button asChild size="sm">
              <a href={primaryAction.href}>{primaryAction.label}</a>
            </Button>
          ) : (
            <Button size="sm" onClick={primaryAction.onClick}>
              {primaryAction.label}
            </Button>
          )
        )}
        {secondaryAction && (
          secondaryAction.href ? (
            <Button asChild size="sm" variant="outline">
              <a href={secondaryAction.href}>{secondaryAction.label}</a>
            </Button>
          ) : (
            <Button size="sm" variant="outline" onClick={secondaryAction.onClick}>
              {secondaryAction.label}
            </Button>
          )
        )}
      </div>
    )}
  </div>
);

export const EmptyState: React.FC<EmptyStateProps> = (props) => {
  if (props.bare) {
    return (
      <div className={cn(props.className)}>
        <EmptyStateInner {...props} />
      </div>
    );
  }
  return (
    <Card className={cn(props.className)}>
      <CardContent className="p-0">
        <EmptyStateInner {...props} />
      </CardContent>
    </Card>
  );
};

export default EmptyState;

import React from 'react';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import { cn } from '@/lib/utils';

/**
 * Lightweight inner-tab primitives used by hub wrappers.
 * Visually distinct from the main TabsList (which is now hidden in groups):
 * a thin underline row, no card chrome — feels like a sub-section header,
 * not a duplicate sidebar.
 */
export const HubTabs = TabsPrimitive.Root;

export const HubTabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      'inline-flex items-center gap-1 border-b border-border w-full overflow-x-auto',
      className,
    )}
    {...props}
  />
));
HubTabsList.displayName = 'HubTabsList';

export const HubTabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      'inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-muted-foreground border-b-2 border-transparent -mb-px',
      'hover:text-foreground transition-colors',
      'data-[state=active]:text-primary data-[state=active]:border-primary',
      className,
    )}
    {...props}
  />
));
HubTabsTrigger.displayName = 'HubTabsTrigger';

export const HubTabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content ref={ref} className={cn('mt-4 focus-visible:outline-none', className)} {...props} />
));
HubTabsContent.displayName = 'HubTabsContent';

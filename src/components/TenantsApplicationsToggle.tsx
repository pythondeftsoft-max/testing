import React from 'react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

interface TenantsApplicationsToggleProps {
  activeView: 'applications' | 'current-tenants';
  onViewChange: (view: 'applications' | 'current-tenants') => void;
}

const TenantsApplicationsToggle = ({ activeView, onViewChange }: TenantsApplicationsToggleProps) => {
  return (
    <div className="mb-6">
      <Tabs value={activeView} onValueChange={onViewChange}>
        <TabsList className={cn(
          "grid w-full grid-cols-2 max-w-md",
          "bg-card",
          "rounded-lg p-1 h-11"
        )}>
          <TabsTrigger 
            value="applications"
            className={cn(
              "data-[state=active]:bg-primary data-[state=active]:text-primary-foreground",
              "data-[state=active]:shadow-sm transition-all duration-200",
              "hover:bg-primary/8 font-medium"
            )}
          >
            Applications
          </TabsTrigger>
          <TabsTrigger 
            value="current-tenants"
            className={cn(
              "data-[state=active]:bg-primary data-[state=active]:text-primary-foreground",
              "data-[state=active]:shadow-sm transition-all duration-200",
              "hover:bg-primary/8 font-medium"
            )}
          >
            Current Tenants
          </TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  );
};

export default TenantsApplicationsToggle;
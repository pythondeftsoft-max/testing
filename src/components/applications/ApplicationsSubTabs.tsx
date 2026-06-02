
import React from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import ApplicationDetailsModal from './ApplicationDetailsModal';
import { Dialog } from '@/components/ui/dialog';

interface ApplicationsSubTabsProps {
  applications: any[];
  onApplicationSelect: (application: any) => void;
  formatDate: (dateString: string) => string;
  getStatusBadge: (status: string, priorityPayment: boolean) => React.ReactNode;
}

const ApplicationsSubTabs = ({ 
  applications, 
  onApplicationSelect, 
  formatDate, 
  getStatusBadge 
}: ApplicationsSubTabsProps) => {
  const [selectedApplication, setSelectedApplication] = React.useState<any>(null);
  const [activeView, setActiveView] = React.useState<'applications' | 'current-tenants' | 'background-check'>('applications');

  const handleApplicationSelect = (application: any) => {
    setSelectedApplication(application);
    onApplicationSelect(application);
  };

  return (
    <div className="space-y-4">
      <Tabs value={activeView} onValueChange={(value) => setActiveView(value as any)}>
        <TabsList className="command-tabs grid w-full grid-cols-3 max-w-2xl">
          <TabsTrigger 
            value="applications"
            className="command-tab-trigger"
          >
            Applications
          </TabsTrigger>
          <TabsTrigger 
            value="current-tenants"
            className="command-tab-trigger"
          >
            Current Tenants
          </TabsTrigger>
          <TabsTrigger 
            value="background-check"
            className="command-tab-trigger"
          >
            Background Check
          </TabsTrigger>
        </TabsList>

        <TabsContent value="applications">
          <ApplicationsTable 
            applications={applications}
            onApplicationSelect={handleApplicationSelect}
            formatDate={formatDate}
            getStatusBadge={getStatusBadge}
          />
        </TabsContent>

        <TabsContent value="current-tenants">
          <div className="text-center py-8 text-muted-foreground">
            <p>Current tenants view will be implemented here</p>
          </div>
        </TabsContent>

        <TabsContent value="background-check">
          <div className="text-center py-8 text-muted-foreground">
            <p>Background check view will be implemented here</p>
          </div>
        </TabsContent>
      </Tabs>

      {selectedApplication && (
        <Dialog open={!!selectedApplication} onOpenChange={() => setSelectedApplication(null)}>
          <ApplicationDetailsModal application={selectedApplication} />
        </Dialog>
      )}
    </div>
  );
};

// Import the existing ApplicationsTable component
import ApplicationsTable from './ApplicationsTable';

export default ApplicationsSubTabs;

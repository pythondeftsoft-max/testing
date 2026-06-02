import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowRightLeft, Upload, Plane } from 'lucide-react';
import AgencyPorting from './AgencyPorting';
import AgencyDataImport from './AgencyDataImport';
import AgencyPortability from './AgencyPortability';

interface AgencyOperationsProps {
  agencyId: string;
  agencySlug?: string;
  role: string;
}

/**
 * Back Office — admin-only "plumbing" tools that don't fit a daily-work group.
 * Phase K trim: Staff moved → Team › People (managing seats *is* team management).
 * Remaining: mobility transfers + one-time data imports.
 */
const AgencyOperations: React.FC<AgencyOperationsProps> = ({ agencyId, role }) => {
  const isAdmin = role === 'agency_admin';
  const [tab, setTab] = useState('porting');

  if (!isAdmin) {
    return (
      <div className="text-sm text-muted-foreground italic p-4">
        Back office tools are available to agency admins only.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-foreground">Back Office</h2>
      <p className="text-sm text-muted-foreground">
        Admin-only plumbing: mobility transfers and one-time data imports. Staff management has moved to <strong>Team › People</strong>.
      </p>
      <Tabs value={tab} onValueChange={setTab} className="w-full space-y-4">
        <TabsList className="h-auto gap-1 flex-wrap bg-transparent p-0 justify-start border-b w-full rounded-none">
          <TabsTrigger value="porting" className="h-8 px-2.5 data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
            <ArrowRightLeft className="w-3.5 h-3.5 mr-1" /><span className="text-xs">Porting</span>
          </TabsTrigger>
          <TabsTrigger value="portability" className="h-8 px-2.5 data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
            <Plane className="w-3.5 h-3.5 mr-1" /><span className="text-xs">Portability</span>
          </TabsTrigger>
          <TabsTrigger value="import" className="h-8 px-2.5 data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
            <Upload className="w-3.5 h-3.5 mr-1" /><span className="text-xs">Data Import</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="porting"><AgencyPorting agencyId={agencyId} /></TabsContent>
        <TabsContent value="portability"><AgencyPortability agencyId={agencyId} /></TabsContent>
        <TabsContent value="import"><AgencyDataImport agencyId={agencyId} /></TabsContent>
      </Tabs>
    </div>
  );
};

export default AgencyOperations;

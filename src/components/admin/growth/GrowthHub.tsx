import React, { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { RefreshCw, Upload } from 'lucide-react';
import { TenantRevivalPanel } from './TenantRevivalPanel';
import { LeadImportPanel } from './LeadImportPanel';
import { LeadProspectsTable } from './LeadProspectsTable';

export const GrowthHub = () => {
  const [activeSubTab, setActiveSubTab] = useState('revival');

  return (
    <Tabs value={activeSubTab} onValueChange={setActiveSubTab}>
      <TabsList className="grid w-full grid-cols-3 mb-6">
        <TabsTrigger value="revival">
          <RefreshCw className="h-4 w-4 mr-2" />
          Account Revival
        </TabsTrigger>
        <TabsTrigger value="import">
          <Upload className="h-4 w-4 mr-2" />
          Lead Import
        </TabsTrigger>
        <TabsTrigger value="prospects">
          <RefreshCw className="h-4 w-4 mr-2" />
          Lead Prospects
        </TabsTrigger>
      </TabsList>

      <TabsContent value="revival">
        <TenantRevivalPanel />
      </TabsContent>

      <TabsContent value="import">
        <LeadImportPanel />
      </TabsContent>

      <TabsContent value="prospects">
        <LeadProspectsTable />
      </TabsContent>
    </Tabs>
  );
};

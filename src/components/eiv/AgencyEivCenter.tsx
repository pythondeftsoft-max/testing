import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertTriangle, Upload } from 'lucide-react';
import EivImportWizard from './EivImportWizard';
import EivDiscrepancyQueue from './EivDiscrepancyQueue';

interface Props {
  agencyId: string;
}

const AgencyEivCenter: React.FC<Props> = ({ agencyId }) => {
  return (
    <Tabs defaultValue="queue" className="space-y-4">
      <TabsList>
        <TabsTrigger value="queue"><AlertTriangle className="w-3.5 h-3.5 mr-1" /> Discrepancies</TabsTrigger>
        <TabsTrigger value="import"><Upload className="w-3.5 h-3.5 mr-1" /> Import EIV</TabsTrigger>
      </TabsList>
      <TabsContent value="queue">
        <EivDiscrepancyQueue agencyId={agencyId} />
      </TabsContent>
      <TabsContent value="import">
        <EivImportWizard agencyId={agencyId} />
      </TabsContent>
    </Tabs>
  );
};

export default AgencyEivCenter;

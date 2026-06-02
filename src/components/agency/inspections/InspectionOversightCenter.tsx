import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Activity, Users, Building } from 'lucide-react';
import { useInspectionOversight } from '@/hooks/useInspectionOversight';
import InspectionProgramHealth from './InspectionProgramHealth';
import InspectorRosterTable from './InspectorRosterTable';
import UnitInspectionHistoryTable from './UnitInspectionHistoryTable';

interface Props {
  agencyId: string;
}

const InspectionOversightCenter: React.FC<Props> = ({ agencyId }) => {
  const { roster, health, loading } = useInspectionOversight(agencyId);

  return (
    <Tabs defaultValue="health" className="space-y-4">
      <TabsList>
        <TabsTrigger value="health"><Activity className="h-3.5 w-3.5 mr-1" /> Program Health</TabsTrigger>
        <TabsTrigger value="roster"><Users className="h-3.5 w-3.5 mr-1" /> Inspector Roster</TabsTrigger>
        <TabsTrigger value="units"><Building className="h-3.5 w-3.5 mr-1" /> Unit History</TabsTrigger>
      </TabsList>
      <TabsContent value="health">
        <InspectionProgramHealth health={health} loading={loading} />
      </TabsContent>
      <TabsContent value="roster">
        <InspectorRosterTable roster={roster} loading={loading} agencyId={agencyId} />
      </TabsContent>
      <TabsContent value="units">
        <UnitInspectionHistoryTable agencyId={agencyId} />
      </TabsContent>
    </Tabs>
  );
};

export default InspectionOversightCenter;

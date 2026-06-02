import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CalendarDays, ListChecks, AlertTriangle, TrendingUp } from 'lucide-react';
import { useInspectorMyWork } from '@/hooks/useInspectorMyWork';
import InspectorMyDay from './InspectorMyDay';
import InspectorMyInspections from './InspectorMyInspections';
import InspectorReinspectionQueue from './InspectorReinspectionQueue';
import InspectorPerformance from './InspectorPerformance';

interface Props {
  agencyId: string;
  staffId: string;
  onUpdate: (id: string, updates: Record<string, unknown>) => void;
}

const InspectorDesktopShell: React.FC<Props> = ({ agencyId, staffId, onUpdate }) => {
  const { inspections, loading, performance, refetch } = useInspectorMyWork(agencyId, staffId);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  const handleUpdate = (id: string, updates: Record<string, unknown>) => {
    onUpdate(id, updates);
    setTimeout(refetch, 400);
  };

  return (
    <Tabs defaultValue="my-day" className="space-y-4">
      <TabsList className="h-auto gap-1">
        <TabsTrigger value="my-day"><CalendarDays className="w-3.5 h-3.5 mr-1" /> My Day</TabsTrigger>
        <TabsTrigger value="all"><ListChecks className="w-3.5 h-3.5 mr-1" /> My Inspections</TabsTrigger>
        <TabsTrigger value="reinspections"><AlertTriangle className="w-3.5 h-3.5 mr-1" /> Reinspections</TabsTrigger>
        <TabsTrigger value="performance"><TrendingUp className="w-3.5 h-3.5 mr-1" /> Performance</TabsTrigger>
      </TabsList>

      <TabsContent value="my-day">
        <InspectorMyDay inspections={inspections} onUpdate={handleUpdate} />
      </TabsContent>
      <TabsContent value="all">
        <InspectorMyInspections inspections={inspections} onRefresh={refetch} />
      </TabsContent>
      <TabsContent value="reinspections">
        <InspectorReinspectionQueue inspections={inspections} />
      </TabsContent>
      <TabsContent value="performance">
        <InspectorPerformance performance={performance} />
      </TabsContent>
    </Tabs>
  );
};

export default InspectorDesktopShell;

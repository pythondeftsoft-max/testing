import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart3, Shield, FileOutput, TrendingUp } from 'lucide-react';
import VMSUtilizationReport from './VMSUtilizationReport';
import SEMAPScorecard from './SEMAPScorecard';
import HUD50058Export from './HUD50058Export';
import GeneralAnalytics from './GeneralAnalytics';

interface AgencyReportHubProps {
  agencyId: string;
  agencyName?: string;
  canEdit?: boolean;
}

const AgencyReportHub: React.FC<AgencyReportHubProps> = ({ agencyId, agencyName = 'Agency', canEdit = false }) => {
  const [activeReport, setActiveReport] = useState('vms');

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground">HUD Reports & Analytics</h2>
        <p className="text-sm text-muted-foreground">Enterprise-grade reporting for HUD compliance and operations</p>
      </div>

      <Tabs value={activeReport} onValueChange={setActiveReport}>
        <TabsList>
          <TabsTrigger value="vms"><TrendingUp className="w-4 h-4 mr-1" /> VMS Utilization</TabsTrigger>
          <TabsTrigger value="semap"><Shield className="w-4 h-4 mr-1" /> SEMAP Scorecard</TabsTrigger>
          <TabsTrigger value="50058"><FileOutput className="w-4 h-4 mr-1" /> HUD 50058</TabsTrigger>
          <TabsTrigger value="analytics"><BarChart3 className="w-4 h-4 mr-1" /> General Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="vms">
          <VMSUtilizationReport agencyId={agencyId} />
        </TabsContent>
        <TabsContent value="semap">
          <SEMAPScorecard agencyId={agencyId} agencyName={agencyName} canEdit={canEdit} />
        </TabsContent>
        <TabsContent value="50058">
          <HUD50058Export agencyId={agencyId} />
        </TabsContent>
        <TabsContent value="analytics">
          <GeneralAnalytics agencyId={agencyId} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AgencyReportHub;

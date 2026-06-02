import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { BarChart3, Trophy, UserCheck, DollarSign, Wallet } from 'lucide-react';
import { MatchmakerLeaderboard } from './MatchmakerLeaderboard';
import { AdminMatchmakerStats } from '../AdminMatchmakerStats';
import { WorkerPayoutsTable } from './WorkerPayoutsTable';
import PlacementFeesTable from '../PlacementFeesTable';
import PlacementFeesMetrics from '../PlacementFeesMetrics';
import PlacementFeeEditor from '../PlacementFeeEditor';
import { AllMatchesTable } from './AllMatchesTable';

export const AnalyticsHub = () => {
  const [activeSubTab, setActiveSubTab] = useState('matches');
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5" />
          Analytics & Reports
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeSubTab} onValueChange={setActiveSubTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="matches" className="flex items-center gap-2">
              <UserCheck className="w-4 h-4" />
              Matches
            </TabsTrigger>
            <TabsTrigger value="placement-fees" className="flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Placement Fees
            </TabsTrigger>
            <TabsTrigger value="worker-payouts" className="flex items-center gap-2">
              <Wallet className="w-4 h-4" />
              Worker Payouts
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="matches" className="mt-6">
            <AllMatchesTable />
          </TabsContent>
          
          <TabsContent value="placement-fees" className="mt-6">
            <div className="space-y-6">
              <PlacementFeeEditor />
              <PlacementFeesMetrics />
              <PlacementFeesTable />
            </div>
          </TabsContent>
          
          <TabsContent value="worker-payouts" className="mt-6">
            <WorkerPayoutsTable />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Trophy, Settings, Activity, MessageSquare } from 'lucide-react';
import { WorkerPerformancePage } from './WorkerPerformancePage';
import { PointsConfigurationPage } from './PointsConfigurationPage';
import { ActivityTrackerPage } from './ActivityTrackerPage';
import { SmsPerformanceTab } from './SmsPerformanceTab';

export const WorkerPerformanceHub: React.FC = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="w-5 h-5" />
          Worker Performance & Pipeline Metrics
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Track worker actions, stage transitions, and configure performance scoring
        </p>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="performance" className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="performance" className="flex items-center gap-2">
              <Trophy className="w-4 h-4" />
              Performance
            </TabsTrigger>
            <TabsTrigger value="activity-tracker" className="flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Activity
            </TabsTrigger>
            <TabsTrigger value="sms-metrics" className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              SMS Metrics
            </TabsTrigger>
            <TabsTrigger value="configuration" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Config
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="performance" className="mt-0">
            <WorkerPerformancePage />
          </TabsContent>
          
          <TabsContent value="activity-tracker" className="mt-0">
            <ActivityTrackerPage />
          </TabsContent>
          
          <TabsContent value="sms-metrics" className="mt-0">
            <SmsPerformanceTab />
          </TabsContent>
          
          <TabsContent value="configuration" className="mt-0">
            <PointsConfigurationPage />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

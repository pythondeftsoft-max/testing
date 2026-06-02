import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users2, Search, Shield, Activity, Zap } from 'lucide-react';
import PortfolioAccessManager from './PortfolioAccessManager';
import PortfolioPermissionsDrillDown from './PortfolioPermissionsDrillDown';
import PortfolioAuditLogs from './PortfolioAuditLogs';
import PortfolioSimulationTools from './PortfolioSimulationTools';

const AdminPortfolioManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState('access-management');

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users2 className="w-5 h-5" />
            Portfolio Management & Access Control
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Comprehensive portfolio access management, permissions, and audit tools
          </p>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="access-management" className="flex items-center gap-2">
                <Users2 className="w-4 h-4" />
                Access Management
              </TabsTrigger>
              <TabsTrigger value="permissions" className="flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Permissions
              </TabsTrigger>
              <TabsTrigger value="audit-logs" className="flex items-center gap-2">
                <Activity className="w-4 h-4" />
                Audit & Logs
              </TabsTrigger>
              <TabsTrigger value="simulation" className="flex items-center gap-2">
                <Zap className="w-4 h-4" />
                Simulation Tools
              </TabsTrigger>
            </TabsList>

            <TabsContent value="access-management" className="space-y-6">
              <PortfolioAccessManager />
            </TabsContent>

            <TabsContent value="permissions" className="space-y-6">
              <PortfolioPermissionsDrillDown />
            </TabsContent>

            <TabsContent value="audit-logs" className="space-y-6">
              <PortfolioAuditLogs />
            </TabsContent>

            <TabsContent value="simulation" className="space-y-6">
              <PortfolioSimulationTools />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminPortfolioManagement;
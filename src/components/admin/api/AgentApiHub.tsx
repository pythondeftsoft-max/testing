import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Code2, Key, Activity, BookOpen } from 'lucide-react';
import { ApiUsageOverview } from './ApiUsageOverview';
import { ApiKeysManager } from './ApiKeysManager';
import { ApiActivityLogs } from './ApiActivityLogs';
import { ApiDocumentation } from './ApiDocumentation';

export const AgentApiHub: React.FC = () => {
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Code2 className="w-5 h-5" />
            API Management
          </CardTitle>
          <CardDescription>
            Create and manage API keys, monitor usage, and view documentation for the Agent Matchmaker API
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4 gap-1">
              <TabsTrigger value="overview" className="flex items-center gap-2">
                <Activity className="w-4 h-4" />
                <span className="hidden sm:inline">Overview</span>
              </TabsTrigger>
              <TabsTrigger value="keys" className="flex items-center gap-2">
                <Key className="w-4 h-4" />
                <span className="hidden sm:inline">API Keys</span>
              </TabsTrigger>
              <TabsTrigger value="logs" className="flex items-center gap-2">
                <Activity className="w-4 h-4" />
                <span className="hidden sm:inline">Activity Logs</span>
              </TabsTrigger>
              <TabsTrigger value="docs" className="flex items-center gap-2">
                <BookOpen className="w-4 h-4" />
                <span className="hidden sm:inline">Documentation</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-6">
              <ApiUsageOverview />
            </TabsContent>

            <TabsContent value="keys" className="mt-6">
              <ApiKeysManager />
            </TabsContent>

            <TabsContent value="logs" className="mt-6">
              <ApiActivityLogs />
            </TabsContent>

            <TabsContent value="docs" className="mt-6">
              <ApiDocumentation />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

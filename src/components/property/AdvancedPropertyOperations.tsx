import React, { useState } from 'react';
import { CardEnhanced, CardEnhancedContent, CardEnhancedHeader, CardEnhancedTitle } from '@/components/enhanced/CardEnhanced';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Building, Settings, TrendingUp, Users } from 'lucide-react';
import SmartMaintenanceDashboard from '@/components/maintenance/SmartMaintenanceDashboard';
import EnhancedTenantManagement from '@/components/tenant/EnhancedTenantManagement';
import FinancialAutomationDashboard from '@/components/financial/FinancialAutomationDashboard';
import { useRealtimeProperties } from '@/hooks/useRealtimeProperties';
import { useRealtimeAdvancedOperations } from '@/hooks/useRealtimeAdvancedOperations';

interface AdvancedPropertyOperationsProps {
  userId: string;
  portfolioId?: string;
}

const AdvancedPropertyOperations = ({ userId, portfolioId }: AdvancedPropertyOperationsProps) => {
  const [activeTab, setActiveTab] = useState('maintenance');
  
  // Enable real-time updates
  useRealtimeProperties(userId);
  useRealtimeAdvancedOperations(portfolioId);

  return (
    <div className="space-y-6">
      <CardEnhanced variant="command" hover={true} animate={true}>
        <CardEnhancedHeader>
          <CardEnhancedTitle className="flex items-center gap-2" gradient>
            <Building className="h-5 w-5 text-primary" />
            Advanced Property Management & Operations
          </CardEnhancedTitle>
        </CardEnhancedHeader>
        <CardEnhancedContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="command-tabs grid w-full grid-cols-3">
              <TabsTrigger value="maintenance" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Smart Maintenance
              </TabsTrigger>
              <TabsTrigger value="tenants" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Tenant Management
              </TabsTrigger>
              <TabsTrigger value="financial" className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Financial Automation
              </TabsTrigger>
            </TabsList>

            <TabsContent value="maintenance" className="mt-6">
              <SmartMaintenanceDashboard userId={userId} portfolioId={portfolioId} />
            </TabsContent>

            <TabsContent value="tenants" className="mt-6">
              <EnhancedTenantManagement userId={userId} portfolioId={portfolioId} />
            </TabsContent>

            <TabsContent value="financial" className="mt-6">
              <FinancialAutomationDashboard userId={userId} portfolioId={portfolioId} />
            </TabsContent>
          </Tabs>
        </CardEnhancedContent>
      </CardEnhanced>
    </div>
  );
};

export default AdvancedPropertyOperations;
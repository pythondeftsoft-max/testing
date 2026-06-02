
import React, { useState } from 'react';
import { CardEnhanced, CardEnhancedContent, CardEnhancedHeader, CardEnhancedTitle } from '@/components/enhanced/CardEnhanced';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Settings, Users, Calendar, Wrench, Clock, RefreshCw, CheckCircle, DollarSign } from 'lucide-react';
import { MetricDisplay } from '@/components/ui/metric-display';
import MaintenanceVendorManagement from './MaintenanceVendorManagement';
import MaintenanceAppointmentScheduler from './MaintenanceAppointmentScheduler';

import MaintenanceRequestsTable from './MaintenanceRequestsTable';
import AddMaintenanceRequestModal from './AddMaintenanceRequestModal';
import VendorPaymentAnalytics from './VendorPaymentAnalytics';
import { useMaintenanceDashboard } from '@/hooks/useMaintenanceDashboard';

interface MaintenanceManagementDashboardProps {
  userId: string;
  portfolioId?: string;
}

const MaintenanceManagementDashboard = ({ userId, portfolioId }: MaintenanceManagementDashboardProps) => {
  const [activeTab, setActiveTab] = useState('requests');
  const { metrics, isLoading } = useMaintenanceDashboard(portfolioId);

  return (
    <div className="space-y-6 animate-fade-in-up">
      <CardEnhanced variant="elevated" hover={true} className="card-hover-gold">
        <CardEnhancedHeader>
          <CardEnhancedTitle className="flex items-center gap-2" gradient>
            <Settings className="h-5 w-5 text-primary" />
            Maintenance Management
            <Badge variant="outline" className="ml-2 border-openkey-gold/20 text-openkey-gold">
              Enhanced System
            </Badge>
          </CardEnhancedTitle>
        </CardEnhancedHeader>
        <CardEnhancedContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6" data-tour="maintenance-metrics">
            <CardEnhanced variant="elevated" hover className="card-hover-gold p-4 transform hover:scale-105 transition-all duration-200">
              <MetricDisplay
                label="Total Requests"
                value={metrics?.total_requests || 0}
                isLoading={isLoading}
                icon={<Wrench className="h-4 w-4 text-primary" />}
                valueClassName="text-primary"
              />
            </CardEnhanced>

            <CardEnhanced variant="elevated" hover className="card-hover-gold p-4 transform hover:scale-105 transition-all duration-200">
              <MetricDisplay
                label="Pending"
                value={metrics?.pending_requests || 0}
                isLoading={isLoading}
                icon={<Clock className="h-4 w-4 text-warning" />}
                valueClassName="text-warning"
              />
            </CardEnhanced>

            <CardEnhanced variant="elevated" hover className="card-hover-gold p-4 transform hover:scale-105 transition-all duration-200">
              <MetricDisplay
                label="In Progress"
                value={metrics?.in_progress_requests || 0}
                isLoading={isLoading}
                icon={<RefreshCw className="h-4 w-4 text-info animate-pulse" />}
                valueClassName="text-info"
              />
            </CardEnhanced>

            <CardEnhanced variant="elevated" hover className="card-hover-gold p-4 transform hover:scale-105 transition-all duration-200">
              <MetricDisplay
                label="Completed"
                value={metrics?.completed_requests || 0}
                isLoading={isLoading}
                icon={<CheckCircle className="h-4 w-4 text-success" />}
                valueClassName="text-success"
              />
            </CardEnhanced>
          </div>
        </CardEnhancedContent>
      </CardEnhanced>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="overflow-x-auto">
        <TabsList className="flex w-max md:w-full md:grid md:grid-cols-4" data-tour="maintenance-tabs">
          <TabsTrigger 
            value="requests" 
            className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground hover:bg-primary/10 hover:text-primary transition-all duration-200 transform hover:scale-105"
          >
            <Wrench className="h-4 w-4" />
            Requests
          </TabsTrigger>
          <TabsTrigger 
            value="vendors" 
            className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground hover:bg-primary/10 hover:text-primary transition-all duration-200 transform hover:scale-105"
          >
            <Users className="h-4 w-4" />
            Vendors
          </TabsTrigger>
          <TabsTrigger 
            value="payments" 
            className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground hover:bg-primary/10 hover:text-primary transition-all duration-200 transform hover:scale-105"
          >
            <DollarSign className="h-4 w-4" />
            Vendor Payments
          </TabsTrigger>
          <TabsTrigger 
            value="appointments" 
            className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground hover:bg-primary/10 hover:text-primary transition-all duration-200 transform hover:scale-105"
          >
            <Calendar className="h-4 w-4" />
            Appointments
          </TabsTrigger>
        </TabsList>
        </div>

        {activeTab === 'requests' && (
          <div className="flex justify-end mt-4 mb-2">
            <AddMaintenanceRequestModal 
              userId={userId} 
              portfolioId={portfolioId}
              onRequestCreated={() => {}}
            />
          </div>
        )}

        <TabsContent value="requests" className="space-y-4">
          <MaintenanceRequestsTable userId={userId} portfolioId={portfolioId} />
        </TabsContent>

        <TabsContent value="vendors" className="space-y-4">
          <MaintenanceVendorManagement userId={userId} portfolioId={portfolioId} />
        </TabsContent>

        <TabsContent value="payments" className="space-y-4">
          <VendorPaymentAnalytics userId={userId} portfolioId={portfolioId} />
        </TabsContent>

        <TabsContent value="appointments" className="space-y-4">
          <MaintenanceAppointmentScheduler userId={userId} portfolioId={portfolioId} />
        </TabsContent>

      </Tabs>
    </div>
  );
};

export default MaintenanceManagementDashboard;

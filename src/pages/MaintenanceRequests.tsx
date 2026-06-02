import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Settings, Calendar, User, Wrench, DollarSign } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import MaintenanceRequestsTable from '@/components/MaintenanceRequestsTable';
import VendorTabsContainer from '@/components/VendorTabsContainer';
import MaintenanceAppointmentScheduler from '@/components/MaintenanceAppointmentScheduler';
import VendorPaymentAnalytics from '@/components/VendorPaymentAnalytics';


const MaintenanceRequests = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Get portfolio ID and maintenance tab from URL params
  const searchParams = new URLSearchParams(window.location.search);
  const portfolioId = searchParams.get('portfolioId') || undefined;
  const maintenanceTab = searchParams.get('maintenanceTab') || 'requests';
  const openPaymentModal = searchParams.get('openPaymentModal') === '1';

  if (!user) {
    return <div>Please log in to view maintenance requests.</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-6">
            <div className="flex items-center space-x-4">
              <Button 
                variant="ghost" 
                onClick={() => navigate(-1)}
                className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="flex items-center gap-3">
                <Wrench className="h-6 w-6 text-openkey-blue" />
                <h1 className="text-3xl font-bold text-foreground">Maintenance Management</h1>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Metrics placeholder for tour target */}
        <div data-tour="maintenance-metrics" className="mb-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-card p-4 rounded-lg shadow-sm border">
              <p className="text-sm text-muted-foreground">Total Requests</p>
              <p className="text-2xl font-bold text-primary">--</p>
            </div>
            <div className="bg-card p-4 rounded-lg shadow-sm border">
              <p className="text-sm text-muted-foreground">Pending</p>
              <p className="text-2xl font-bold text-warning">--</p>
            </div>
            <div className="bg-card p-4 rounded-lg shadow-sm border">
              <p className="text-sm text-muted-foreground">In Progress</p>
              <p className="text-2xl font-bold text-info">--</p>
            </div>
            <div className="bg-card p-4 rounded-lg shadow-sm border">
              <p className="text-sm text-muted-foreground">Completed</p>
              <p className="text-2xl font-bold text-success">--</p>
            </div>
          </div>
        </div>
        
        <Tabs defaultValue={maintenanceTab} className="space-y-6">
          <div className="overflow-x-auto">
          <TabsList className="command-tabs flex w-max md:w-full md:grid md:grid-cols-4" data-tour="maintenance-tabs">
            <TabsTrigger 
              value="requests" 
              className="command-tab-trigger flex items-center gap-2"
            >
              <Settings className="h-4 w-4" />
              Requests
            </TabsTrigger>
            <TabsTrigger 
              value="vendors" 
              className="command-tab-trigger flex items-center gap-2"
            >
              <User className="h-4 w-4" />
              Vendors
            </TabsTrigger>
            <TabsTrigger 
              value="payments" 
              className="command-tab-trigger flex items-center gap-2"
            >
              <DollarSign className="h-4 w-4" />
              Vendor Payments
            </TabsTrigger>
            <TabsTrigger 
              value="appointments" 
              className="command-tab-trigger flex items-center gap-2"
            >
              <Calendar className="h-4 w-4" />
              Appointments
            </TabsTrigger>
          </TabsList>
          </div>

          <TabsContent value="requests" className="space-y-6">
            <MaintenanceRequestsTable userId={user.id} portfolioId={portfolioId} />
          </TabsContent>

          <TabsContent value="vendors" className="space-y-6">
            <VendorTabsContainer userId={user.id} portfolioId={portfolioId} />
          </TabsContent>

          <TabsContent value="payments" className="space-y-6">
            <VendorPaymentAnalytics userId={user.id} portfolioId={portfolioId} />
          </TabsContent>

          <TabsContent value="appointments" className="space-y-6">
            <MaintenanceAppointmentScheduler userId={user.id} portfolioId={portfolioId} />
          </TabsContent>

        </Tabs>
      </main>
    </div>
  );
};

export default MaintenanceRequests;

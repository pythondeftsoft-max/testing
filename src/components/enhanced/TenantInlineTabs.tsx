
import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { DialogTitle } from '@/components/ui/dialog';
import { 
  User,
  TrendingUp,
  MessageCircle,
  Wrench,
  History,
  Home,
  FileText,
  Loader2
} from 'lucide-react';
import { useEnhancedTenantProfile } from '@/hooks/useEnhancedTenantProfile';
import { TenantOverviewTab } from '@/components/enhanced/TenantOverviewTab';
import { TenantCommunicationsTab } from '@/components/enhanced/TenantCommunicationsTab';
import { TenantMaintenanceTab } from '@/components/enhanced/TenantMaintenanceTab';
import { TenantHistoryTab } from '@/components/enhanced/TenantHistoryTab';

interface TenantInlineTabsProps {
  tenantId: string;
  defaultTab?: 'overview' | 'communications' | 'maintenance' | 'history' | 'property' | 'documents';
}

export const TenantInlineTabs = ({ tenantId, defaultTab = 'overview' }: TenantInlineTabsProps) => {
  const { tenantData, loading, error } = useEnhancedTenantProfile(tenantId || '');

  const getRiskBadgeColor = (score: number) => {
    if (score <= 30) return 'bg-green-100 text-green-800 border-green-300';
    if (score <= 60) return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    return 'bg-red-100 text-red-800 border-red-300';
  };

  const getRiskLabel = (score: number) => {
    if (score <= 30) return 'Low Risk';
    if (score <= 60) return 'Medium Risk';
    return 'High Risk';
  };

  if (!tenantId) return null;

  if (loading) {
    return (
      <div className="border rounded-lg p-6 bg-card">
        <div className="flex items-center justify-center py-8">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <span className="text-sm text-muted-foreground">Loading tenant data...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error || !tenantData) {
    return (
      <div className="border rounded-lg p-6 bg-card">
        <div className="text-center py-8">
          <div className="flex flex-col items-center gap-3">
            <User className="h-10 w-10 text-muted-foreground/50" />
            <div>
              <h3 className="text-base font-medium text-foreground mb-1">Unable to load tenant</h3>
              <p className="text-sm text-destructive">Error: {error || 'Unknown error occurred'}</p>
              <p className="text-xs text-muted-foreground mt-1">Please retry or contact support.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const unreadMessages = tenantData.communications.filter(c => !c.readAt).length;
  const openMaintenanceRequests = tenantData.maintenanceRequests.filter(r => r.status !== 'completed').length;

  return (
    <div className="border rounded-lg p-4 md:p-6 bg-card">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <User className="h-5 w-5 text-primary" />
          <DialogTitle className="text-base md:text-lg">
            {tenantData.firstName} {tenantData.lastName}
          </DialogTitle>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={getRiskBadgeColor(tenantData.analytics.riskScore || 50)}>
            {getRiskLabel(tenantData.analytics.riskScore || 50)}
          </Badge>
          {tenantData.currentProperty && (
            <Badge variant="outline" className="text-blue-600 border-blue-300">
              Current Tenant
            </Badge>
          )}
        </div>
      </div>
      {tenantData.currentProperty && (
        <div className="text-xs md:text-sm text-muted-foreground flex items-center gap-1 mt-1">
          <Home className="h-4 w-4" />
          {tenantData.currentProperty.address}
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue={defaultTab} className="mt-4">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            <span className="hidden sm:inline">Overview</span>
          </TabsTrigger>
          <TabsTrigger value="communications" className="flex items-center gap-2">
            <MessageCircle className="h-4 w-4" />
            <span className="hidden sm:inline">Communications</span>
            {unreadMessages > 0 && (
              <Badge variant="secondary" className="ml-1 text-[10px]">
                {unreadMessages}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="maintenance" className="flex items-center gap-2">
            <Wrench className="h-4 w-4" />
            <span className="hidden sm:inline">Maintenance</span>
            {openMaintenanceRequests > 0 && (
              <Badge variant="secondary" className="ml-1 text-[10px]">
                {openMaintenanceRequests}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            <span className="hidden sm:inline">History</span>
          </TabsTrigger>
          <TabsTrigger value="property" className="flex items-center gap-2">
            <Home className="h-4 w-4" />
            <span className="hidden sm:inline">Property</span>
          </TabsTrigger>
          <TabsTrigger value="documents" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Documents</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <TenantOverviewTab tenantData={tenantData} />
        </TabsContent>

        <TabsContent value="communications" className="mt-4">
          <TenantCommunicationsTab tenantData={tenantData} />
        </TabsContent>

        <TabsContent value="maintenance" className="mt-4">
          <TenantMaintenanceTab tenantData={tenantData} />
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <TenantHistoryTab tenantData={tenantData} />
        </TabsContent>

        <TabsContent value="property" className="mt-4">
          {tenantData.currentProperty ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <h3 className="text-sm md:text-base font-semibold">Property Information</h3>
                <div className="space-y-1 text-sm">
                  <div><span className="font-medium">Address:</span> {tenantData.currentProperty.address}</div>
                  <div><span className="font-medium">Type:</span> {tenantData.currentProperty.propertyType}</div>
                  <div><span className="font-medium">Bedrooms:</span> {tenantData.currentProperty.bedrooms}</div>
                  <div><span className="font-medium">Bathrooms:</span> {tenantData.currentProperty.bathrooms}</div>
                  <div><span className="font-medium">Monthly Rent:</span> ${tenantData.currentProperty.monthlyRent?.toLocaleString()}</div>
                </div>
              </div>
              <div className="space-y-3">
                <h3 className="text-sm md:text-base font-semibold">Lease Information</h3>
                <div className="space-y-1 text-sm">
                  {tenantData.currentProperty.leaseStartDate ? (
                    <div><span className="font-medium">Start Date:</span> {new Date(tenantData.currentProperty.leaseStartDate).toLocaleDateString()}</div>
                  ) : (
                    <div><span className="font-medium">Start Date:</span> <span className="text-muted-foreground">Not specified</span></div>
                  )}
                  {tenantData.currentProperty.leaseEndDate ? (
                    <div><span className="font-medium">End Date:</span> {new Date(tenantData.currentProperty.leaseEndDate).toLocaleDateString()}</div>
                  ) : (
                    <div><span className="font-medium">End Date:</span> <span className="text-muted-foreground">Not specified</span></div>
                  )}
                  {tenantData.currentProperty.unitNumber && (
                    <div><span className="font-medium">Unit:</span> {tenantData.currentProperty.unitNumber}</div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Home className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <h3 className="text-base font-medium mb-1">No current property</h3>
              <p className="text-sm">This tenant doesn't have current property information available.</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="documents" className="mt-4">
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <h3 className="text-base font-medium mb-1">Document Management</h3>
            <p className="text-sm">Document management features will be available in a future update.</p>
            <p className="text-xs text-muted-foreground mt-2">This will include lease agreements, application documents, and more.</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default TenantInlineTabs;


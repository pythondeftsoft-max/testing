
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { 
  User, 
  MessageCircle, 
  Wrench, 
  History, 
  FileText, 
  Home,
  TrendingUp,
  Loader2,
  Edit3,
  Eye
} from 'lucide-react';
import { useEnhancedTenantProfile } from '@/hooks/useEnhancedTenantProfile';
import { TenantOverviewTab } from '@/components/enhanced/TenantOverviewTab';
import { TenantCommunicationsTab } from '@/components/enhanced/TenantCommunicationsTab';
import { TenantMaintenanceTab } from '@/components/enhanced/TenantMaintenanceTab';
import { TenantHistoryTab } from '@/components/enhanced/TenantHistoryTab';
import { TenantProfileDetailsTab } from '@/components/enhanced/TenantProfileDetailsTab';
import { AdminTenantProfileEditor } from './AdminTenantProfileEditor';
import { useTenantProfile } from '@/hooks/useTenantProfile';
import { useAdminCheck } from '@/hooks/useAdminCheck';

interface EnhancedTenantProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  tenantId: string | null;
}

export const EnhancedTenantProfileModal = ({ 
  isOpen, 
  onClose, 
  tenantId 
}: EnhancedTenantProfileModalProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const { tenantData: enhancedData, loading: enhancedLoading, error: enhancedError } = useEnhancedTenantProfile(tenantId || '');
  const { tenantData: profileData, loading: profileLoading, error: profileError, refetch } = useTenantProfile(tenantId || '');
  const { data: isAdmin } = useAdminCheck();

  if (!tenantId) return null;

  // Use enhanced data for display, profile data for editing
  const loading = enhancedLoading || profileLoading;
  const error = enhancedError || profileError;
  const tenantData = enhancedData || (profileData ? {
    id: profileData.id,
    firstName: profileData.firstName,
    lastName: profileData.lastName,
    email: profileData.email || '',
    phone: profileData.phone || '',
    currentProperty: null,
    communications: [],
    maintenanceRequests: [],
    housingHistory: [],
    paymentHistory: [],
    analytics: { 
      riskScore: 50,
      maintenanceRequestCount: 0
    }
  } : null);

  const handleSaved = () => {
    refetch();
    setIsEditing(false);
  };

  if (loading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-center py-12">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="text-sm text-gray-600">Loading tenant profile...</span>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (error || !tenantData) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <div className="text-center py-12">
            <div className="flex flex-col items-center gap-4">
              <User className="h-12 w-12 text-gray-300" />
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Unable to load tenant profile</h3>
                <p className="text-red-600">Error: {error || 'Unknown error occurred'}</p>
                <p className="text-sm text-gray-500 mt-2">Please try again or contact support if the issue persists.</p>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const getRiskBadgeColor = (score: number = 50) => {
    if (score <= 30) return 'bg-green-100 text-green-800 border-green-300';
    if (score <= 60) return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    return 'bg-red-100 text-red-800 border-red-300';
  };

  const getRiskLabel = (score: number = 50) => {
    if (score <= 30) return 'Low Risk';
    if (score <= 60) return 'Medium Risk';
    return 'High Risk';
  };

  const unreadMessages = tenantData.communications?.filter(c => !c.readAt).length || 0;
  const openMaintenanceRequests = tenantData.maintenanceRequests?.filter(r => r.status !== 'completed').length || 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-start gap-4 pr-20">
            <DialogTitle className="flex items-center gap-2 text-xl">
              <User className="h-6 w-6 text-primary" />
              {tenantData.firstName} {tenantData.lastName}
            </DialogTitle>
            <div className="flex items-center gap-2">
              {isAdmin && (
                <div className="flex items-center space-x-2">
                  <Switch
                    id="edit-mode"
                    checked={isEditing}
                    onCheckedChange={setIsEditing}
                  />
                  <Label htmlFor="edit-mode" className="flex items-center gap-1">
                    {isEditing ? <Edit3 className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    {isEditing ? 'Edit Mode' : 'View Mode'}
                  </Label>
                </div>
              )}
              <Badge className={getRiskBadgeColor(tenantData.analytics?.riskScore)}>
                {getRiskLabel(tenantData.analytics?.riskScore)}
              </Badge>
              {tenantData.currentProperty && (
                <Badge variant="outline" className="text-blue-600 border-blue-300">
                  Current Tenant
                </Badge>
              )}
            </div>
          </div>
          {tenantData.currentProperty && (
            <div className="text-sm text-gray-600 flex items-center gap-1">
              <Home className="h-4 w-4" />
              {tenantData.currentProperty.address}
            </div>
          )}
        </DialogHeader>

        {isEditing && profileData ? (
          <AdminTenantProfileEditor
            tenantData={profileData}
            onSaved={handleSaved}
          />
        ) : (
          <Tabs defaultValue="overview" className="mt-6">
            <TabsList className="grid w-full grid-cols-7">
              <TabsTrigger value="overview" className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                <span className="hidden sm:inline">Overview</span>
              </TabsTrigger>
              <TabsTrigger value="communications" className="flex items-center gap-2">
                <MessageCircle className="h-4 w-4" />
                <span className="hidden sm:inline">Communications</span>
                {unreadMessages > 0 && (
                  <Badge variant="secondary" className="ml-1 text-xs">
                    {unreadMessages}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="maintenance" className="flex items-center gap-2">
                <Wrench className="h-4 w-4" />
                <span className="hidden sm:inline">Maintenance</span>
                {openMaintenanceRequests > 0 && (
                  <Badge variant="secondary" className="ml-1 text-xs">
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
              <TabsTrigger value="profile" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                <span className="hidden sm:inline">Profile</span>
              </TabsTrigger>
              <TabsTrigger value="documents" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                <span className="hidden sm:inline">Documents</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-6">
              <TenantOverviewTab tenantData={tenantData} />
            </TabsContent>

            <TabsContent value="communications" className="mt-6">
              <TenantCommunicationsTab tenantData={tenantData} />
            </TabsContent>

            <TabsContent value="maintenance" className="mt-6">
              <TenantMaintenanceTab tenantData={tenantData} />
            </TabsContent>

            <TabsContent value="history" className="mt-6">
              <TenantHistoryTab tenantData={tenantData} />
            </TabsContent>

            <TabsContent value="profile" className="mt-6">
              <TenantProfileDetailsTab tenantData={tenantData} />
            </TabsContent>

            <TabsContent value="property" className="mt-6">
              {tenantData.currentProperty ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Property Information</h3>
                    <div className="space-y-2">
                      <div><span className="font-medium">Address:</span> {tenantData.currentProperty.address}</div>
                      <div><span className="font-medium">Type:</span> {tenantData.currentProperty.propertyType}</div>
                      <div><span className="font-medium">Bedrooms:</span> {tenantData.currentProperty.bedrooms}</div>
                      <div><span className="font-medium">Bathrooms:</span> {tenantData.currentProperty.bathrooms}</div>
                      <div><span className="font-medium">Monthly Rent:</span> ${tenantData.currentProperty.monthlyRent?.toLocaleString()}</div>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Lease Information</h3>
                    <div className="space-y-2">
                      {tenantData.currentProperty.leaseStartDate ? (
                        <div><span className="font-medium">Start Date:</span> {new Date(tenantData.currentProperty.leaseStartDate).toLocaleDateString()}</div>
                      ) : (
                        <div><span className="font-medium">Start Date:</span> <span className="text-gray-500">Not specified</span></div>
                      )}
                      {tenantData.currentProperty.leaseEndDate ? (
                        <div><span className="font-medium">End Date:</span> {new Date(tenantData.currentProperty.leaseEndDate).toLocaleDateString()}</div>
                      ) : (
                        <div><span className="font-medium">End Date:</span> <span className="text-gray-500">Not specified</span></div>
                      )}
                      {tenantData.currentProperty.unitNumber && (
                        <div><span className="font-medium">Unit:</span> {tenantData.currentProperty.unitNumber}</div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <Home className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <h3 className="text-lg font-medium mb-2">No current property</h3>
                  <p className="text-sm">This tenant doesn't have current property information available.</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="documents" className="mt-6">
              <div className="text-center py-12 text-gray-500">
                <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-medium mb-2">Document Management</h3>
                <p className="text-sm">Document management features will be available in a future update.</p>
                <p className="text-xs text-gray-400 mt-2">This will include lease agreements, application documents, and more.</p>
              </div>
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
};

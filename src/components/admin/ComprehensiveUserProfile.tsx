import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { 
  User, 
  Mail, 
  Phone, 
  Calendar, 
  Building, 
  UserMinus, 
  RotateCcw,
  Activity,
  FileText,
  Home,
  DollarSign,
  Shield,
  Upload,
  Download,
  Edit3
} from 'lucide-react';
import { cleanupAuthState, storeImpersonationData, getRedirectUrlForUserType } from '@/utils/impersonationUtils';
import { useToast } from '@/hooks/use-toast';
import { useAdminCheck } from '@/hooks/useAdminCheck';
import { useTenantProfile } from '@/hooks/useTenantProfile';
import { AdminTenantProfileEditor } from './AdminTenantProfileEditor';

interface UserData {
  id: string;
  first_name: string;
  last_name: string;
  user_type: string;
  phone: string;
  created_at: string;
  email: string;
  last_sign_in_at?: string;
  properties_count?: number;
  status: string;
  company_name?: string;
}

interface TenantProfile {
  voucher_holder: boolean;
  voucher_amount: number;
  housing_authority: string;
  monthly_income: string | number;
  credit_score: number;
  preferred_locations: string[];
  max_rent: number;
  has_pets: boolean;
  has_felonies: boolean;
  has_eviction: boolean;
  is_plus_subscriber: boolean;
  message_credits: number;
  bedrooms_approved: string[];
  accessibility_details: string;
  employment_status: string;
}

interface Document {
  id: string;
  document_type: string;
  file_name: string;
  file_path: string;
  created_at: string;
  file_size: number;
}

interface PropertyApplication {
  id: string;
  status: string;
  created_at: string;
  property: {
    address: string;
    monthly_rent: number;
  };
}

interface ComprehensiveUserProfileProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserData | null;
}

const ComprehensiveUserProfile = ({ isOpen, onClose, user }: ComprehensiveUserProfileProps) => {
  const [tenantProfile, setTenantProfile] = useState<TenantProfile | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [applications, setApplications] = useState<PropertyApplication[]>([]);
  const [loading, setLoading] = useState(false);
  const [impersonating, setImpersonating] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const { toast } = useToast();
  const { data: isAdmin } = useAdminCheck();
  const { tenantData, loading: tenantLoading, refetch: refetchTenantData } = useTenantProfile(user?.id || '');

  useEffect(() => {
    if (user && isOpen) {
      fetchUserDetails();
    }
  }, [user, isOpen]);

  const fetchUserDetails = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Fetch tenant profile if user is a tenant
      if (user.user_type === 'tenant') {
        const { data: profile } = await supabase
          .from('tenant_profiles')
          .select('*')
          .eq('user_id', user.id)
          .single();
        
        setTenantProfile(profile);

        // Fetch tenant documents
        const { data: docs } = await supabase
          .from('tenant_documents')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
        
        setDocuments(docs || []);

        // Fetch property applications
        const { data: apps } = await supabase
          .from('property_applications')
          .select(`
            id,
            status,
            created_at,
            property_id
          `)
          .eq('tenant_id', user.id)
          .order('created_at', { ascending: false });

        // Fetch property details separately to avoid relationship conflicts
        if (apps && apps.length > 0) {
          const propertyIds = apps.map(app => app.property_id);
          const { data: properties } = await supabase
            .from('properties')
            .select('id, address, monthly_rent')
            .in('id', propertyIds);

          setApplications(apps.map(app => {
            const property = properties?.find(p => p.id === app.property_id);
            return {
              id: app.id,
              status: app.status,
              created_at: app.created_at,
              property: {
                address: property?.address || 'Unknown',
                monthly_rent: property?.monthly_rent || 0
              }
            };
          }));
        } else {
          setApplications([]);
        }
      }
    } catch (error) {
      console.error('Error fetching user details:', error);
      toast({
        title: "Error",
        description: "Failed to load user details",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const downloadDocument = async (doc: Document) => {
    try {
      const { data, error } = await supabase.storage
        .from('tenant-documents')
        .download(doc.file_path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.file_name;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading document:', error);
      toast({
        title: "Error",
        description: "Failed to download document",
        variant: "destructive"
      });
    }
  };

  const handleImpersonateUser = async () => {
    if (!user || user.user_type === 'admin') {
      toast({
        title: "Error",
        description: "Cannot impersonate admin users",
        variant: "destructive"
      });
      return;
    }

    // Confirmation dialog
    const confirmed = confirm(
      `Are you sure you want to impersonate ${user.first_name} ${user.last_name}? ` +
      `You will be logged in as this user and can perform actions on their behalf. ` +
      `Make sure to log out when finished to return to your admin account.`
    );

    if (!confirmed) return;

    setImpersonating(true);
    
    try {
      // Get current admin session
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      if (!currentSession) {
        throw new Error('No active admin session found');
      }

      // Store impersonation data
      storeImpersonationData(currentSession, user);

      toast({
        title: "Impersonation Started", 
        description: `You are now impersonating ${user.first_name} ${user.last_name}. Redirecting...`,
      });

      // Redirect to dashboard with impersonation data - the dashboard will handle the simulated session
      setTimeout(() => {
        const redirectUrl = getRedirectUrlForUserType(user.user_type);
        window.location.href = redirectUrl;
      }, 1000);

    } catch (error) {
      console.error('Error during impersonation:', error);
      setImpersonating(false);
      
      // Clean up failed impersonation attempt
      localStorage.removeItem('admin_session_backup');
      localStorage.removeItem('impersonation_mode');
      localStorage.removeItem('impersonated_user');
      
      toast({
        title: "Impersonation Failed",
        description: "Unable to impersonate user. Please try again.",
        variant: "destructive"
      });
    }
  };

  if (!user) return null;

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'tenant': return 'bg-blue-100 text-blue-800';
      case 'landlord': return 'bg-green-100 text-green-800';
      case 'individual_owner': return 'bg-green-100 text-green-800';
      case 'property_manager': return 'bg-purple-100 text-purple-800';
      case 'admin': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'invited': return 'bg-blue-100 text-blue-800';
      case 'suspended': return 'bg-red-100 text-red-800';
      case 'deactivated': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-[800px] sm:max-w-[800px] overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Comprehensive User Profile
            </SheetTitle>
            {isAdmin && user?.user_type === 'tenant' && (
              <div className="flex items-center gap-2">
                <Label htmlFor="edit-mode" className="text-sm">Edit Mode</Label>
                <Switch 
                  id="edit-mode"
                  checked={editMode} 
                  onCheckedChange={setEditMode}
                />
                <Edit3 className="h-4 w-4 text-muted-foreground" />
              </div>
            )}
          </div>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Edit Mode - Admin Tenant Profile Editor */}
          {editMode && isAdmin && user?.user_type === 'tenant' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Edit3 className="h-5 w-5" />
                  Admin Editing Controls
                </CardTitle>
                <CardDescription>
                  Make changes to tenant profile, subscription, and settings
                </CardDescription>
              </CardHeader>
              <CardContent>
                {tenantLoading ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Loading tenant data...
                  </div>
                ) : tenantData ? (
                  <AdminTenantProfileEditor 
                    tenantData={tenantData}
                    onSaved={() => {
                      refetchTenantData();
                      fetchUserDetails();
                    }}
                  />
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No tenant data available
                  </div>
                )}
              </CardContent>
            </Card>
          )}
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center">
                  <User className="w-8 h-8 text-gray-500" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">{user.first_name} {user.last_name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge className={getRoleColor(user.user_type)} variant="secondary">
                      {user.user_type === 'individual_owner' ? 'Individual Owner' : 
                       user.user_type === 'property_manager' ? 'Property Manager' :
                       user.user_type.charAt(0).toUpperCase() + user.user_type.slice(1)}
                    </Badge>
                    <Badge className={getStatusColor(user.status)} variant="secondary">
                      {user.status}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-gray-500" />
                  <div>
                    <p className="text-sm font-medium">Email</p>
                    <p className="text-sm text-gray-600">{user.email}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-gray-500" />
                  <div>
                    <p className="text-sm font-medium">Phone</p>
                    <p className="text-sm text-gray-600">{user.phone || 'Not provided'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <div>
                    <p className="text-sm font-medium">Joined Date</p>
                    <p className="text-sm text-gray-600">{new Date(user.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <Activity className="h-4 w-4 text-gray-500" />
                  <div>
                    <p className="text-sm font-medium">Last Login</p>
                    <p className="text-sm text-gray-600">
                      {user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleDateString() : 'Never'}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tenant-Specific Information */}
          {user.user_type === 'tenant' && tenantProfile && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Home className="h-5 w-5" />
                    Housing Information
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-gray-700">Voucher Status</p>
                      <p className="text-sm text-gray-600">
                        {tenantProfile.voucher_holder ? 'Has Voucher' : 'No Voucher'}
                      </p>
                    </div>
                    {tenantProfile.voucher_holder && (
                      <>
                        <div>
                          <p className="text-sm font-medium text-gray-700">Voucher Amount</p>
                          <p className="text-sm text-gray-600">
                            {formatCurrency(tenantProfile.voucher_amount || 0)}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-700">Housing Authority</p>
                          <p className="text-sm text-gray-600">
                            {tenantProfile.housing_authority || 'Not specified'}
                          </p>
                        </div>
                      </>
                    )}
                    <div>
                      <p className="text-sm font-medium text-gray-700">Yearly Income</p>
                      <p className="text-sm text-gray-600">
                        {tenantProfile.monthly_income ? (typeof tenantProfile.monthly_income === 'number' ? formatCurrency(tenantProfile.monthly_income) : tenantProfile.monthly_income) : 'Not provided'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">Max Rent</p>
                      <p className="text-sm text-gray-600">
                        {tenantProfile.max_rent ? formatCurrency(tenantProfile.max_rent) : 'Not specified'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">Credit Score</p>
                      <p className="text-sm text-gray-600">
                        {tenantProfile.credit_score || 'Not provided'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">Employment Status</p>
                      <p className="text-sm text-gray-600">
                        {tenantProfile.employment_status || 'Not specified'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Background & Preferences
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-gray-700">Has Pets</p>
                      <p className="text-sm text-gray-600">{tenantProfile.has_pets ? 'Yes' : 'No'}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">Criminal History</p>
                      <p className="text-sm text-gray-600">{tenantProfile.has_felonies ? 'Yes' : 'No'}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">Eviction History</p>
                      <p className="text-sm text-gray-600">{tenantProfile.has_eviction ? 'Yes' : 'No'}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">Plus Subscriber</p>
                      <p className="text-sm text-gray-600">{tenantProfile.is_plus_subscriber ? 'Yes' : 'No'}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">Message Credits</p>
                      <p className="text-sm text-gray-600">{tenantProfile.message_credits}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">Approved Bedrooms</p>
                      <p className="text-sm text-gray-600">
                        {tenantProfile.bedrooms_approved?.join(', ') || 'Not specified'}
                      </p>
                    </div>
                  </div>
                  {tenantProfile.preferred_locations && tenantProfile.preferred_locations.length > 0 && (
                    <div className="mt-4">
                      <p className="text-sm font-medium text-gray-700 mb-2">Preferred Locations</p>
                      <div className="flex flex-wrap gap-2">
                        {tenantProfile.preferred_locations.map((location, index) => (
                          <Badge key={index} variant="outline">{location}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Uploaded Documents */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Uploaded Documents ({documents.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {documents.length > 0 ? (
                    <div className="space-y-3">
                      {documents.map((doc) => (
                        <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <FileText className="h-4 w-4 text-gray-500" />
                            <div>
                              <p className="text-sm font-medium">{doc.file_name}</p>
                              <p className="text-xs text-gray-500">
                                {doc.document_type} • {formatFileSize(doc.file_size)} • {new Date(doc.created_at).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => downloadDocument(doc)}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">No documents uploaded</p>
                  )}
                </CardContent>
              </Card>

              {/* Property Applications */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building className="h-5 w-5" />
                    Property Applications ({applications.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {applications.length > 0 ? (
                    <div className="space-y-3">
                      {applications.map((app) => (
                        <div key={app.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <p className="text-sm font-medium">{app.property.address}</p>
                            <p className="text-xs text-gray-500">
                              {formatCurrency(app.property.monthly_rent)}/month • Applied {new Date(app.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <Badge variant="outline" className={
                            app.status === 'approved' ? 'bg-green-100 text-green-800' :
                            app.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }>
                            {app.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">No property applications</p>
                  )}
                </CardContent>
              </Card>
            </>
          )}

          {/* Admin Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Admin Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-2">
                <Button variant="outline" className="justify-start">
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reset Password
                </Button>
                
                <Button variant="outline" className="justify-start">
                  <UserMinus className="h-4 w-4 mr-2" />
                  {user.status === 'suspended' ? 'Reactivate User' : 'Suspend User'}
                </Button>
                
                <Button 
                  variant="outline" 
                  className="justify-start"
                  onClick={handleImpersonateUser}
                  disabled={impersonating || user.user_type === 'admin'}
                >
                  {impersonating ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-2"></div>
                      Impersonating...
                    </>
                  ) : (
                    <>
                      <User className="h-4 w-4 mr-2" />
                      Impersonate User
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default ComprehensiveUserProfile;
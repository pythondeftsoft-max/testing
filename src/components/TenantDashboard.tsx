
import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LogOut, Crown } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import TenantProfileForm from './TenantProfileForm';
import PropertySearch from '@/pages/PropertySearch';
import ApplicationTracker from './ApplicationTracker';
import TenantMessages from './TenantMessages';
import SubscriptionManager from './SubscriptionManager';
import { useSubscription } from '@/hooks/useSubscription';
import SavedPropertiesList from './SavedPropertiesList';
import TenantPaymentsTab from './TenantPaymentsTab';
import { ActiveGrantIndicator } from '@/components/ActiveGrantIndicator';
import TenantMaintenanceRequests from './TenantMaintenanceRequests';
import ApplicationQuotaDisplay from '@/components/ApplicationQuotaDisplay';

const TenantDashboard = ({ user, profile }: any) => {
  const [tenantProfile, setTenantProfile] = useState(null);
  const [applications, setApplications] = useState([]);
  const [applicationCount, setApplicationCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const defaultTab = searchParams.get('tab') || 'dashboard';
  const [activeTab, setActiveTab] = useState(defaultTab);
  
  // Get subscription status
  const { hasActiveSubscription, applicationLimits } = useSubscription(user.id, 'tenant');

  // Mock data for testing
  const getMockApplications = () => [
    {
      id: 'mock-1',
      tenant_id: user.id,
      property_id: 'mock-prop-1',
      status: 'pending',
      priority_payment_made: true,
      created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      properties: {
        id: 'mock-prop-1',
        address: '123 Main St, Austin, TX 78701',
        monthly_rent: 2400,
        bedrooms: 2,
        bathrooms: 2
      }
    },
    {
      id: 'mock-2',
      tenant_id: user.id,
      property_id: 'mock-prop-2',
      status: 'approved',
      priority_payment_made: false,
      created_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
      properties: {
        id: 'mock-prop-2',
        address: '456 Oak Avenue, San Francisco, CA 94102',
        monthly_rent: 3500,
        bedrooms: 3,
        bathrooms: 2
      }
    },
    {
      id: 'mock-3',
      tenant_id: user.id,
      property_id: 'mock-prop-3',
      status: 'rejected',
      priority_payment_made: false,
      created_at: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString(),
      properties: {
        id: 'mock-prop-3',
        address: '789 Elm Street, Brooklyn, NY 11201',
        monthly_rent: 2800,
        bedrooms: 1,
        bathrooms: 1
      }
    },
    {
      id: 'mock-4',
      tenant_id: user.id,
      property_id: 'mock-prop-4',
      status: 'under_review',
      priority_payment_made: true,
      created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      properties: {
        id: 'mock-prop-4',
        address: '321 Pine Road, Seattle, WA 98101',
        monthly_rent: 2200,
        bedrooms: 2,
        bathrooms: 1
      }
    },
    {
      id: 'mock-5',
      tenant_id: user.id,
      property_id: 'mock-prop-5',
      status: 'pending',
      priority_payment_made: false,
      created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
      properties: {
        id: 'mock-prop-5',
        address: '555 Maple Lane, Denver, CO 80202',
        monthly_rent: 1800,
        bedrooms: 2,
        bathrooms: 2
      }
    },
    {
      id: 'mock-6',
      tenant_id: user.id,
      property_id: 'mock-prop-6',
      status: 'approved',
      priority_payment_made: true,
      created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      properties: {
        id: 'mock-prop-6',
        address: '777 Beach Blvd, Miami, FL 33139',
        monthly_rent: 3200,
        bedrooms: 3,
        bathrooms: 3
      }
    },
    {
      id: 'mock-7',
      tenant_id: user.id,
      property_id: 'mock-prop-7',
      status: 'pending',
      priority_payment_made: false,
      created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      properties: {
        id: 'mock-prop-7',
        address: '999 River Street, Portland, OR 97201',
        monthly_rent: 2100,
        bedrooms: 2,
        bathrooms: 1
      }
    },
    {
      id: 'mock-8',
      tenant_id: user.id,
      property_id: 'mock-prop-8',
      status: 'under_review',
      priority_payment_made: false,
      created_at: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
      properties: {
        id: 'mock-prop-8',
        address: '444 Highland Ave, Boston, MA 02115',
        monthly_rent: 2900,
        bedrooms: 2,
        bathrooms: 2
      }
    },
    {
      id: 'mock-9',
      tenant_id: user.id,
      property_id: 'mock-prop-9',
      status: 'rejected',
      priority_payment_made: true,
      created_at: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
      properties: {
        id: 'mock-prop-9',
        address: '222 Valley Drive, Phoenix, AZ 85001',
        monthly_rent: 1600,
        bedrooms: 1,
        bathrooms: 1
      }
    },
    {
      id: 'mock-10',
      tenant_id: user.id,
      property_id: 'mock-prop-10',
      status: 'pending',
      priority_payment_made: true,
      created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      properties: {
        id: 'mock-prop-10',
        address: '888 Park Place, Chicago, IL 60614',
        monthly_rent: 2600,
        bedrooms: 3,
        bathrooms: 2
      }
    },
    {
      id: 'mock-11',
      tenant_id: user.id,
      property_id: 'mock-prop-11',
      status: 'approved',
      priority_payment_made: false,
      created_at: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
      properties: {
        id: 'mock-prop-11',
        address: '111 Lake Shore, Nashville, TN 37201',
        monthly_rent: 1900,
        bedrooms: 2,
        bathrooms: 1
      }
    },
    {
      id: 'mock-12',
      tenant_id: user.id,
      property_id: 'mock-prop-12',
      status: 'under_review',
      priority_payment_made: true,
      created_at: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
      properties: {
        id: 'mock-prop-12',
        address: '666 Mountain View, Salt Lake City, UT 84101',
        monthly_rent: 2000,
        bedrooms: 2,
        bathrooms: 2
      }
    }
  ];

  // Sync active tab with URL parameter
  useEffect(() => {
    const tabFromUrl = searchParams.get('tab') || 'dashboard';
    console.log('URL tab parameter changed to:', tabFromUrl);
    setActiveTab(tabFromUrl);
  }, [searchParams]);

  useEffect(() => {
    fetchTenantData();
    
    // Set up real-time subscription for property applications
    const channel = supabase
      .channel('property_applications_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'property_applications',
          filter: `tenant_id=eq.${user.id}`
        },
        () => {
          // Refresh applications when a new one is added
          fetchTenantData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user.id]);

  const fetchTenantData = async () => {
    try {
      // Fetch tenant profile
      const { data: profileData, error: profileError } = await supabase
        .from('tenant_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (profileError && profileError.code !== 'PGRST116') {
        console.error('Error fetching tenant profile:', profileError);
      } else {
        setTenantProfile(profileData);
      }

      // Fetch applications
      const { data: appData, error: appError } = await supabase
        .from('property_applications')
        .select(`
          *,
          properties!fk_property_applications_property_id (
            id,
            address,
            monthly_rent,
            bedrooms,
            bathrooms,
            description,
            zipcode
          )
        `)
        .eq('tenant_id', user.id)
        .order('created_at', { ascending: false });

      if (appError) {
        console.error('Error fetching applications:', appError);
      }

      // Always add mock data for testing (even if there's a database error)
      const mockData = getMockApplications();
      const combinedData = [...(appData || []), ...mockData];
      setApplications(combinedData);
      setApplicationCount(combinedData.length);
    } catch (error) {
      console.error('Error fetching tenant data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const handleProfileUpdate = () => {
    fetchTenantData();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card shadow border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center gap-4">
              <div>
                <h1 className="text-3xl font-bold text-foreground">Tenant Dashboard</h1>
                <p className="text-muted-foreground">
                  Welcome back, {profile.first_name} {profile.last_name}
                </p>
              </div>
              <ActiveGrantIndicator />
              {hasActiveSubscription && (
                <div className="flex items-center gap-2 px-3 py-1 bg-gradient-to-r from-yellow-400 to-orange-500 text-white rounded-full text-sm font-medium">
                  <Crown className="w-4 h-4" />
                  Tenant Pro
                </div>
              )}
            </div>
            <Button onClick={handleSignOut} variant="outline">
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-9">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="applications">Applied Homes</TabsTrigger>
            <TabsTrigger value="saved">Saved Homes</TabsTrigger>
            <TabsTrigger value="messages">Messages</TabsTrigger>
            <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
            <TabsTrigger value="market">Market</TabsTrigger>
            <TabsTrigger value="payments">Payments</TabsTrigger>
            <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
            <TabsTrigger value="profile">Profile</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            <ApplicationTracker applications={applications} />
          </TabsContent>

          <TabsContent value="applications" className="space-y-6">
            <ApplicationQuotaDisplay userId={user.id} />
            <ApplicationTracker applications={applications} />
          </TabsContent>

          <TabsContent value="saved" className="space-y-6">
            <SavedPropertiesList />
          </TabsContent>

          <TabsContent value="messages" className="space-y-6">
            <TenantMessages 
              userId={user.id}
              applications={applications}
            />
          </TabsContent>

          <TabsContent value="maintenance" className="space-y-6">
            <TenantMaintenanceRequests userId={user.id} />
          </TabsContent>

          <TabsContent value="market" className="space-y-6">
            <PropertySearch />
          </TabsContent>

          <TabsContent value="payments" className="space-y-6">
            <TenantPaymentsTab />
          </TabsContent>

          <TabsContent value="subscriptions" className="space-y-6">
            <SubscriptionManager 
              userId={user.id}
              userType="tenant"
            />
          </TabsContent>

          <TabsContent value="profile" className="space-y-6">
            <TenantProfileForm 
              profile={tenantProfile}
              onProfileUpdate={handleProfileUpdate}
            />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default TenantDashboard;

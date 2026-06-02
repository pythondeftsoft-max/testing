
import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { featureFlags } from '@/config/featureFlags';
import SubscriptionManager from '@/components/SubscriptionManager';
import { PaymentMethodsTab } from '@/components/PaymentMethodsTab';
import { AllocationWorkspace } from '@/components/checkbook/AllocationWorkspace';
import { Bell, MessageSquare, User as UserIcon, Settings, Users, LogOut, CreditCard, Send, ArrowLeft, Building2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useNotificationCount } from '@/hooks/useNotificationCount';
import { useUnreadMessageCount } from '@/hooks/useUnreadMessageCount';
import { useUserPortfolios } from '@/hooks/useUserPortfolios';
import PortfolioSelectorDropdown from '@/components/PortfolioSelectorDropdown';
import { CardEnhanced, CardEnhancedContent, CardEnhancedHeader, CardEnhancedTitle } from '@/components/enhanced/CardEnhanced';
const PaymentSettings = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPortfolio, setSelectedPortfolio] = useState<string>(
    searchParams.get('portfolioId') || 'everything'
  );
  const [entrySource, setEntrySource] = useState<string | null>(null);
  const [defaultTab, setDefaultTab] = useState<string>('methods');

  const { unreadCount: notificationCount } = useNotificationCount();
  const { unreadCount: unreadMessageCount } = useUnreadMessageCount();
  const { portfolios } = useUserPortfolios(user?.id || '');
  
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setUser(user);
          
          const { data: profileData } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();
            
          setProfile(profileData);
        } else {
          navigate('/auth');
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
        navigate('/auth');
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [navigate]);

  // SEO: set page title and description
  useEffect(() => {
    document.title = 'Payment Settings | OpenKey';
    const meta = document.querySelector('meta[name="description"]');
    if (meta) {
      meta.setAttribute('content', 'Manage payment processing and subscriptions in OpenKey.');
    }
  }, []);

  // Capture entry source and default tab from navigation state or URL params
  useEffect(() => {
    if (location.state?.from) {
      setEntrySource(location.state.from);
    }
    
    // Check for tab parameter in URL
    const tabParam = searchParams.get('tab');
    const subtabParam = searchParams.get('subtab');
    
    if (tabParam) {
      setDefaultTab(tabParam);
      
      // Handle subtab for payment settings
      if (tabParam === 'payment' && subtabParam) {
        // Will be handled by the nested Tabs component
      }
    }
  }, [location.state, searchParams]);

  // Sync selected portfolio with URL parameter if present
  useEffect(() => {
    const portfolioIdFromUrl = searchParams.get('portfolioId');
    
    if (portfolioIdFromUrl && selectedPortfolio !== portfolioIdFromUrl) {
      const portfolioExists = portfolios.some(p => p.id === portfolioIdFromUrl);
      if (portfolioExists) {
        setSelectedPortfolio(portfolioIdFromUrl);
      }
    }
  }, [portfolios, searchParams]);

  const handlePortfolioSelect = (portfolioId: string) => {
    setSelectedPortfolio(portfolioId);
    // Update URL without navigating away
    const newParams = new URLSearchParams(searchParams);
    if (portfolioId === 'everything') {
      newParams.delete('portfolioId');
    } else {
      newParams.set('portfolioId', portfolioId);
    }
    setSearchParams(newParams);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading payment settings...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Please log in to access payment settings.</p>
          <Button onClick={() => navigate('/auth')} className="mt-4">
            Go to Login
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/95 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4 relative">
            {/* LEFT SECTION - Branding */}
            <div className="flex items-center space-x-4">
              <button 
                onClick={() => navigate('/')}
                className="text-2xl font-bold text-gradient-blue-gold hover:opacity-80 transition-opacity cursor-pointer"
              >
                OpenKey
              </button>
            </div>

            {/* CENTER SECTION - Portfolio Selector */}
            <div className="absolute left-1/2 transform -translate-x-1/2">
              <div className="bg-card/80 border border-border/50 rounded-xl px-6 py-3 backdrop-blur-sm shadow-sm hover:shadow-md transition-all duration-200">
                {user && (
                  <PortfolioSelectorDropdown
                    selectedPortfolio={selectedPortfolio}
                    onPortfolioChange={handlePortfolioSelect}
                    userId={user.id}
                    disableInternalNavigation={true}
                  />
                )}
              </div>
            </div>

            {/* RIGHT SECTION - Action Buttons */}
            <div className="flex items-center space-x-3">
              {/* Notifications */}
              <Button 
                variant="outline" 
                size="icon"
                className="border-openkey-blue/20 text-openkey-blue bg-card rounded-lg relative transition-all duration-200 hover:bg-openkey-blue hover:text-white"
                onClick={() => navigate('/landlord-notifications')}
                aria-label="Notifications"
              >
                <Bell className="w-4 h-4" />
                {notificationCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center min-w-[20px]">
                    {notificationCount > 9 ? '9+' : notificationCount}
                  </span>
                )}
              </Button>

              {/* Messages */}
              <Button 
                variant="outline" 
                size="icon"
                className={`border rounded-lg relative transition-all duration-200 ${
                  unreadMessageCount > 0
                    ? 'bg-red-50 border-red-300 text-red-600 hover:bg-red-500 hover:text-white'
                    : 'border-openkey-blue/20 text-openkey-blue hover:bg-openkey-blue hover:text-white'
                }`}
                onClick={() =>
                   profile?.user_type === 'landlord'
                     ? navigate('/dashboard?portfolioId=everything', { state: { activeTab: 'Messages' } })
                     : navigate('/messages')
                }
                aria-label="Messages"
              >
                <MessageSquare className="w-4 h-4" />
                {unreadMessageCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center min-w-[20px]">
                    {unreadMessageCount > 9 ? '9+' : unreadMessageCount}
                  </span>
                )}
              </Button>

              {/* User Profile Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="icon"
                    className="border-openkey-blue/20 text-openkey-blue rounded-lg bg-card hover:bg-openkey-blue hover:text-white transition-all duration-200"
                    aria-label="User menu"
                  >
                    <UserIcon className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="z-50 w-48 bg-card border border-border shadow-lg">
                  <DropdownMenuItem 
                    onClick={() => navigate('/dashboard?portfolioId=everything', { state: { activeTab: 'Profile' } })}
                    className="cursor-pointer hover:bg-openkey-blue/5 hover:text-openkey-blue"
                  >
                    <UserIcon className="w-4 h-4 mr-2" />
                    View Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => navigate('/payment-settings')}
                    className="cursor-pointer hover:bg-openkey-blue/5 hover:text-openkey-blue"
                  >
                    <Settings className="w-4 h-4 mr-2" />
                    Payment Settings
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => navigate(`/user-roles?portfolioId=${selectedPortfolio}`)}
                    className="cursor-pointer hover:bg-openkey-blue/5 hover:text-openkey-blue"
                  >
                    <Users className="w-4 h-4 mr-2" />
                    User/Roles
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => navigate('/section-8')}
                    className="cursor-pointer hover:bg-openkey-blue/5 hover:text-openkey-blue"
                  >
                    <Building2 className="w-4 h-4 mr-2" />
                    Section 8
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Sign Out */}
              <Button 
                variant="outline" 
                size="icon"
                onClick={handleSignOut}
                className="hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all duration-200"
                aria-label="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>
      
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <CardEnhanced variant="premium" className="mb-6">
            <CardEnhancedHeader className="border-b border-openkey-blue/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Button
                    onClick={() => {
                      if (entrySource === 'portfolio-select') {
                        navigate('/dashboard');
                      } else {
                        navigate(`/dashboard?portfolioId=${selectedPortfolio}`, { 
                          state: { activeTab: 'Dashboard' } 
                        });
                      }
                    }}
                    variant="outline"
                    size="sm"
                    className="border-openkey-blue/20 text-openkey-blue hover:bg-openkey-blue hover:text-white"
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Dashboard
                  </Button>
                  <div>
                    <CardEnhancedTitle gradient className="text-2xl">
                      Payment & Subscriptions
                    </CardEnhancedTitle>
                    <p className="text-muted-foreground mt-1">Manage your payment processing and subscription settings</p>
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-gradient-blue-gold shadow-lg">
                  <Settings className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardEnhancedHeader>
          </CardEnhanced>
        </div>
        
        <Tabs defaultValue={defaultTab} className="space-y-6">
          <TabsList className={`grid w-full ${
            profile?.user_type === 'landlord' 
              ? (featureFlags.landlordSubscriptionUiEnabled ? 'grid-cols-3' : 'grid-cols-2')
              : (profile?.user_type === 'tenant' || featureFlags.landlordSubscriptionUiEnabled ? 'grid-cols-2' : 'grid-cols-1')
          }`}>
            <TabsTrigger value="methods" className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Payment Methods
            </TabsTrigger>
            {profile?.user_type === 'landlord' && (
              <TabsTrigger value="send-payments" className="flex items-center gap-2">
                <Send className="h-4 w-4" />
                Send Payments
              </TabsTrigger>
            )}
            {(profile?.user_type === 'tenant' || featureFlags.landlordSubscriptionUiEnabled) && (
              <TabsTrigger value="subscriptions" className="flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Subscriptions
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="methods" className="space-y-6">
            <PaymentMethodsTab 
              userId={user.id}
              userType={profile?.user_type || 'landlord'}
              selectedPortfolio={selectedPortfolio}
            />
          </TabsContent>

          {profile?.user_type === 'landlord' && (
            <TabsContent value="send-payments" className="space-y-6">
              <AllocationWorkspace 
                userId={user.id}
                portfolioId={selectedPortfolio !== 'everything' ? selectedPortfolio : undefined}
              />
            </TabsContent>
          )}

          {(profile?.user_type === 'tenant' || featureFlags.landlordSubscriptionUiEnabled) && (
            <TabsContent value="subscriptions" className="space-y-6">
              <SubscriptionManager 
                userId={user.id} 
                userType={profile?.user_type || 'landlord'} 
              />
            </TabsContent>
          )}
        </Tabs>
      </main>
    </div>
  );
};

export default PaymentSettings;

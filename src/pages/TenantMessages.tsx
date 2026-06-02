import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Bell, Crown, LogOut, MessageSquare, User } from 'lucide-react';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import TenantMessages from '@/components/TenantMessages';
import NotificationCenter from '@/components/notifications/NotificationCenter';
import WhiteLabelBranding from '@/components/WhiteLabelBranding';

import { useNotificationCount } from '@/hooks/useNotificationCount';
import { useUnreadMessageCount } from '@/hooks/useUnreadMessageCount';
import { useSubscription } from '@/hooks/useSubscription';

const TenantMessagesPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [userId, setUserId] = useState<string | null>(null);
  const [applications, setApplications] = useState<any[]>([]);
  const selectedApplicationId = location.state?.selectedApplicationId;
  const activeTab = searchParams.get('tab') || 'messages';
  
  const { unreadCount } = useNotificationCount();
  const { unreadCount: unreadMessageCount } = useUnreadMessageCount();
  const { hasActiveSubscription } = useSubscription(userId, 'tenant');

  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        await fetchApplications(user.id);
      }
    };
    getCurrentUser();
  }, []);

  const fetchApplications = async (userId: string) => {
    try {
      console.log('🔍 [TenantMessagesPage] ========== FETCH APPLICATIONS START ==========');
      console.log('🔍 [TenantMessagesPage] Fetching applications for user:', userId);
      
      // Query marketplace_applications, property_applications, AND property_pushes
      const [marketplaceResult, propertyResult, pushResult] = await Promise.all([
        supabase
          .from('marketplace_applications')
          .select(`
            *,
            properties (
              id,
              address,
              street_address,
              city,
              state,
              zipcode,
              monthly_rent,
              desired_rent,
              bedrooms,
              bathrooms,
              photos,
              amenities,
              property_manager_id,
              owner_id
            )
          `)
          .eq('user_id', userId)
          .order('created_at', { ascending: false }),
        
        supabase
          .from('property_applications')
          .select(`
            *,
            properties:property_id (
              id,
              address,
              street_address,
              city,
              state,
              zipcode,
              monthly_rent,
              desired_rent,
              bedrooms,
              bathrooms,
              photos,
              amenities,
              property_manager_id,
              owner_id
            )
          `)
          .eq('tenant_id', userId)
          .order('created_at', { ascending: false }),
        
        supabase
          .from('property_pushes')
          .select(`
            *,
            properties:property_id (
              id,
              address,
              street_address,
              city,
              state,
              zipcode,
              monthly_rent,
              desired_rent,
              bedrooms,
              bathrooms,
              photos,
              amenities,
              property_manager_id,
              owner_id
            )
          `)
          .eq('tenant_id', userId)
          .order('created_at', { ascending: false })
      ]);

      if (marketplaceResult.error) {
        console.error('[TenantMessages] Error fetching marketplace applications:', marketplaceResult.error);
      }
      if (propertyResult.error) {
        console.error('[TenantMessages] Error fetching property applications:', propertyResult.error);
      }
      if (pushResult.error) {
        console.error('[TenantMessages] Error fetching property pushes:', pushResult.error);
      }

      // Combine all application types and mark their source
      const marketplaceApps = (marketplaceResult.data || []).map(app => ({
        ...app,
        _source: 'marketplace' as const
      }));
      
      const propertyApps = (propertyResult.data || []).map(app => ({
        ...app,
        _source: 'property' as const
      }));

      const pushApps = (pushResult.data || []).map(app => ({
        ...app,
        _source: 'push' as const
      }));

      console.log('🔍 [TenantMessagesPage] Raw query results:');
      console.log('🔍 [TenantMessagesPage] - Marketplace apps:', marketplaceApps.length, marketplaceApps.map(a => ({ id: a.id, status: a.status, property_id: a.property_id })));
      console.log('🔍 [TenantMessagesPage] - Property apps:', propertyApps.length, propertyApps.map(a => ({ id: a.id, status: a.status, property_id: a.property_id })));
      console.log('🔍 [TenantMessagesPage] - Push apps:', pushApps.length, pushApps.map(a => ({ id: a.id, status: a.status, property_id: a.property_id })));

      // Deduplicate by property_id for DISPLAY - prefer ACTIVE marketplace apps if both exist
      // Terminal statuses should NOT contribute messages to new conversations
      const TERMINAL_MARKETPLACE_STATUSES = ['withdrawn', 'rejected', 'cancelled', 'denied'];
      const TERMINAL_PROPERTY_APP_STATUSES = ['withdrawn', 'rejected', 'cancelled', 'denied'];
      const TERMINAL_PUSH_STATUSES = ['denied', 'expired', 'declined'];
      
      const seenPropertyIds = new Set<string>();
      const combinedApps: any[] = [];
      
      // Add marketplace apps first - only ACTIVE ones should claim the property slot
      for (const app of marketplaceApps) {
        const propertyId = app.property_id || app.properties?.id;
        const isActive = !TERMINAL_MARKETPLACE_STATUSES.includes(app.status);
        
        if (propertyId && isActive && !seenPropertyIds.has(propertyId)) {
          // Active marketplace app - claim the property slot
          seenPropertyIds.add(propertyId);
          combinedApps.push({ ...app, _isLinked: false });
        } else if (!propertyId) {
          combinedApps.push({ ...app, _isLinked: false });
        }
        // Terminal marketplace apps are not added and don't claim slots
      }
      
      // Add property apps - only ACTIVE ones that don't have a terminal parent marketplace app
      for (const app of propertyApps) {
        const propertyId = app.property_id || app.properties?.id;
        const ownStatusActive = !TERMINAL_PROPERTY_APP_STATUSES.includes(app.status);
        
        // Also check if linked marketplace_application has terminal status
        let parentMarketplaceTerminal = false;
        if (app.marketplace_application_id) {
          const linkedMarketplace = marketplaceApps.find(ma => ma.id === app.marketplace_application_id);
          if (linkedMarketplace && TERMINAL_MARKETPLACE_STATUSES.includes(linkedMarketplace.status)) {
            parentMarketplaceTerminal = true;
            console.log('🔍 [TenantMessagesPage] Excluding property app with terminal marketplace parent:', app.id, 'parent status:', linkedMarketplace.status);
          }
        }
        
        const isActive = ownStatusActive && !parentMarketplaceTerminal;
        
        if (propertyId && isActive && !seenPropertyIds.has(propertyId)) {
          // Active property app, no active marketplace app - show as conversation card
          seenPropertyIds.add(propertyId);
          combinedApps.push({ ...app, _isLinked: false });
        } else if (propertyId && isActive && seenPropertyIds.has(propertyId)) {
          // There's an active marketplace app AND this is active - link for messages
          combinedApps.push({ ...app, _isLinked: true });
        }
        // Terminal property apps (own status OR parent terminal) are NOT added
      }

      // Add push apps - only ACTIVE ones that don't have another active app
      for (const app of pushApps) {
        const propertyId = app.property_id || app.properties?.id;
        const isActive = !TERMINAL_PUSH_STATUSES.includes(app.status);
        
        if (propertyId && isActive && !seenPropertyIds.has(propertyId)) {
          // Active push, no other active app - show as conversation card
          seenPropertyIds.add(propertyId);
          combinedApps.push({ ...app, _isLinked: false });
        } else if (propertyId && isActive && seenPropertyIds.has(propertyId)) {
          // There's already an active app AND this push is active - link for messages
          combinedApps.push({ ...app, _isLinked: true });
        }
        // Terminal pushes are NOT added - they don't get linked to new conversations
      }

      console.log('🔍 [TenantMessagesPage] ========== COMBINED APPS RESULT ==========');
      console.log('🔍 [TenantMessagesPage] Combined applications:', combinedApps.length);
      console.log('🔍 [TenantMessagesPage] Combined apps breakdown:', combinedApps.map(a => ({
        id: a.id,
        source: a._source,
        isLinked: a._isLinked,
        status: a.status,
        property_id: a.property_id || a.properties?.id
      })));
      console.log('🔍 [TenantMessagesPage] ========== FETCH APPLICATIONS END ==========');
      setApplications(combinedApps);
    } catch (error) {
      console.error('[TenantMessages] Exception fetching applications:', error);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const handleBack = () => {
    const fromPage = location.state?.from;
    const dashboardTab = location.state?.dashboardTab;
    
    if (fromPage === 'dashboard' && dashboardTab) {
      // Return to specific dashboard tab
      navigate(`/dashboard?tab=${encodeURIComponent(dashboardTab)}`);
    } else if (fromPage === 'profile') {
      // Return to profile page
      navigate('/tenant-profile');
    } else {
      // Default to dashboard home
      navigate('/dashboard');
    }
  };

  if (!userId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Top Navigation Bar */}
      <header className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            {/* Logo */}
            <div className="flex items-center gap-4">
              <button 
                onClick={() => navigate('/')}
                className="cursor-pointer"
              >
                <WhiteLabelBranding 
                  fallbackText="OpenKey" 
                  showCompanyName={false}
                  className="text-2xl font-bold text-openkey-blue"
                />
              </button>
              {hasActiveSubscription && (
                <div className="flex items-center gap-2 px-3 py-1 bg-gradient-to-r from-yellow-400 to-orange-500 text-white rounded-full text-sm font-medium">
                  <Crown className="w-4 h-4" />
                  Tenant Pro
                </div>
              )}
            </div>
            
            {/* Header Icons */}
            <div className="flex items-center space-x-3">
              <ThemeToggle />
              <Button 
                onClick={() => navigate('/messages?tab=notifications', {
                  state: { from: 'messages' }
                })}
                variant="outline" 
                size="icon"
                className="border-openkey-blue/20 text-openkey-blue bg-card hover:bg-openkey-blue hover:text-white transition-all duration-200 rounded-lg relative"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-4 h-4 rounded-full flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Button>
              
              <Button 
                onClick={() => navigate('/messages', {
                  state: { from: 'messages' }
                })}
                variant="outline" 
                size="icon"
                className={`rounded-lg relative transition-all duration-200 ${
                  unreadMessageCount > 0 
                    ? "border-red-500/20 text-red-600 dark:text-red-400 bg-red-500/10 hover:bg-red-500 hover:text-white" 
                    : "border-openkey-blue/20 text-openkey-blue bg-card hover:bg-openkey-blue hover:text-white"
                }`}
                aria-label="Messages"
              >
                <MessageSquare className="w-4 h-4" />
                {unreadMessageCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-4 h-4 rounded-full flex items-center justify-center">
                    {unreadMessageCount > 9 ? '9+' : unreadMessageCount}
                  </span>
                )}
              </Button>
              
              <Button 
                onClick={() => navigate('/tenant-profile', {
                  state: { from: 'messages' }
                })}
                variant="outline" 
                size="icon"
                className="border-openkey-blue/20 text-openkey-blue bg-card hover:bg-openkey-blue hover:text-white transition-all duration-200 rounded-lg"
              >
                <User className="w-4 h-4" />
              </Button>
              
              <Button 
                onClick={handleSignOut} 
                variant="outline" 
                className="border-red-500/20 text-red-600 dark:text-red-400 bg-card hover:bg-red-500 hover:text-white transition-all duration-200 rounded-lg"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Notifications Page Header */}
      {activeTab === 'notifications' && (
        <div className="bg-gradient-to-br from-background via-background/90 to-muted/20 border-b border-border">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button
                  onClick={handleBack}
                  variant="ghost"
                  size="sm"
                  className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </Button>
                <div>
                  <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
                    <Bell className="w-8 h-8 text-primary" />
                    Notifications
                    {unreadCount > 0 && (
                      <span className="bg-destructive text-destructive-foreground text-sm px-2 py-1 rounded-full font-medium">
                        {unreadCount} unread
                      </span>
                    )}
                  </h1>
                  <p className="text-muted-foreground mt-1">
                    Stay updated with important notifications and alerts
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'messages' && (
          <section className="bg-card/50 backdrop-blur-sm border-b border-border mb-8 -mx-4 sm:-mx-6 lg:-mx-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
              <div className="flex items-center gap-3">
                <Button 
                  onClick={handleBack}
                  variant="outline" 
                  size="icon"
                  className="border-openkey-blue/20 text-openkey-blue bg-background hover:bg-openkey-blue hover:text-white transition-all duration-200 rounded-lg"
                >
                  <ArrowLeft className="w-4 h-4" />
                </Button>
                <div>
                  <h1 className="text-2xl font-bold text-openkey-blue">Messages</h1>
                  <p className="text-muted-foreground">Communicate with landlords about your applications</p>
                </div>
              </div>
            </div>
          </section>
        )}
        
        {activeTab === 'notifications' ? (
          <NotificationCenter userId={userId} showHeader={false} />
        ) : (
          <TenantMessages 
            userId={userId}
            applications={applications}
            initialSelectedApplicationId={selectedApplicationId}
          />
        )}
      </main>
    </div>
  );
};

export default TenantMessagesPage;

import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Bell, Crown, LogOut, MessageSquare, User } from 'lucide-react';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import TenantProfile from '@/components/TenantProfile';
import WhiteLabelBranding from '@/components/WhiteLabelBranding';
import { PrivacyQuickLinks } from '@/components/privacy/PrivacyQuickLinks';

import { useNotificationCount } from '@/hooks/useNotificationCount';
import { useUnreadMessageCount } from '@/hooks/useUnreadMessageCount';
import { useSubscription } from '@/hooks/useSubscription';

const TenantProfilePage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [userId, setUserId] = useState<string | null>(null);
  const { tenantId } = useParams<{ tenantId?: string }>();
  
  const { unreadCount } = useNotificationCount();
  const { unreadCount: unreadMessageCount } = useUnreadMessageCount();
  const { hasActiveSubscription } = useSubscription(userId, 'tenant');

  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
      }
    };
    getCurrentUser();
  }, []);

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
      <header className="border-b border-border bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            {/* Logo */}
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/')}
                className="cursor-pointer"
              >
                <WhiteLabelBranding className="text-2xl font-bold text-gradient-blue hover:opacity-80 transition-opacity" />
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
                  state: { from: 'profile' }
                })}
                variant="outline" 
                size="icon"
                className="border-primary/20 text-primary bg-background hover:bg-primary hover:text-primary-foreground transition-all duration-200 rounded-lg relative"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-xs w-4 h-4 rounded-full flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Button>
              
              <Button 
                onClick={() => navigate('/messages', {
                  state: { from: 'profile' }
                })}
                variant="outline" 
                size="icon"
                className={`rounded-lg relative transition-all duration-200 ${
                  unreadMessageCount > 0 
                    ? "border-destructive/20 text-destructive bg-destructive/5 hover:bg-destructive hover:text-destructive-foreground" 
                    : "border-primary/20 text-primary bg-background hover:bg-primary hover:text-primary-foreground"
                }`}
                aria-label="Messages"
              >
                <MessageSquare className="w-4 h-4" />
                {unreadMessageCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-xs w-4 h-4 rounded-full flex items-center justify-center">
                    {unreadMessageCount > 9 ? '9+' : unreadMessageCount}
                  </span>
                )}
              </Button>
              
              <Button 
                variant="outline" 
                size="icon"
                className="border-primary/20 text-primary bg-background hover:bg-primary hover:text-primary-foreground transition-all duration-200 rounded-lg"
              >
                <User className="w-4 h-4" />
              </Button>
              
              <Button 
                onClick={handleSignOut} 
                variant="outline" 
                className="border-destructive/20 text-destructive bg-background hover:bg-destructive hover:text-destructive-foreground transition-all duration-200 rounded-lg"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Page Header */}
      <section className="bg-card/50 backdrop-blur-sm border-b border-border">
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
              <h1 className="text-2xl font-bold text-openkey-blue">Profile Information</h1>
              <p className="text-muted-foreground">Manage your account details</p>
            </div>
          </div>
        </div>
      </section>

      {/* Profile Content */}
      <TenantProfile tenantId={tenantId || userId} canEdit={true} />

      {/* Privacy & Data Self-Service */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <PrivacyQuickLinks />
      </div>
    </div>
  );
};

export default TenantProfilePage;

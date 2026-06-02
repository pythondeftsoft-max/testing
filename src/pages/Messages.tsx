
import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ArrowLeft, AlertCircle, Calendar, Settings, FileText, Bell, MessageSquare, User, LogOut, Crown, User as UserIcon, Users, Building2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useUnreadMessageCount } from '@/hooks/useUnreadMessageCount';
import { useNotificationCount } from '@/hooks/useNotificationCount';
import LandlordMessages from '@/components/LandlordMessages';
import PortfolioSelectorDropdown from '@/components/PortfolioSelectorDropdown';
import NotificationCenter from '@/components/notifications/NotificationCenter';

const Messages = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [userType, setUserType] = useState<string | null>(null);
  const [hasActiveSubscription, setHasActiveSubscription] = useState(false);
  const [selectedPortfolio, setSelectedPortfolio] = useState<string>('everything');
  const [profile, setProfile] = useState<any>(null);
  const { unreadCount: unreadMessageCount } = useUnreadMessageCount();
  const { unreadCount: notificationUnreadCount } = useNotificationCount();
  
  // Get application ID from query parameters
  const applicationId = searchParams.get('application');
  
  

  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        const { data: profile } = await supabase
          .from('profiles')
          .select('user_type')
          .eq('id', user.id)
          .single();
        setUserType(profile?.user_type || null);
        setProfile(profile);
        const { data: subscription } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('user_id', user.id)
          .eq('role', 'tenant')
          .eq('status', 'active')
          .single();
        setHasActiveSubscription(!!subscription);
      }
    };
    getCurrentUser();
    setLoading(false);
  }, [applicationId]);

  // Redirect landlords to dashboard Messages tab for consistent layout
  useEffect(() => {
    if (userType === 'landlord') {
      navigate('/dashboard', { state: { activeTab: 'Messages', applicationId } });
    }
  }, [userType, applicationId, navigate]);
  
  // Determine if we should show LandlordMessages component
  const shouldShowLandlordMessages = () => {
    return userType === 'landlord';
  };


  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }
  
  // For landlords, we redirect above; render nothing here to avoid layout mismatch
  if (shouldShowLandlordMessages() && userId) {
    return null;
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const handlePortfolioSelect = (portfolioId: string) => {
    setSelectedPortfolio(portfolioId);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-openkey-blue/[0.02]">
      {/* Header with enhanced OpenKey Navigation */}
      <header className="border-b border-border bg-card/95 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4 relative">
            <div className="flex items-center space-x-4">
              <button 
                onClick={() => navigate('/')}
                className="text-2xl font-bold text-gradient-blue-gold hover:opacity-80 transition-opacity cursor-pointer"
              >
                OpenKey
              </button>
            </div>
            
            {/* Center Section - Portfolio Management (Absolutely centered) */}
            {userId && (
              <div className="absolute left-1/2 transform -translate-x-1/2">
                <div className="bg-card/80 border border-border/50 rounded-xl px-6 py-3 backdrop-blur-sm shadow-sm hover:shadow-md transition-all duration-200">
                  <PortfolioSelectorDropdown
                    selectedPortfolio={selectedPortfolio}
                    onPortfolioChange={handlePortfolioSelect}
                    userId={userId}
                  />
                </div>
              </div>
            )}
            
            <div className="flex items-center space-x-3">
              <Button 
                variant="outline" 
                size="icon"
                className={`border-border rounded-lg relative transition-all duration-200 ${
                  notificationUnreadCount > 0 
                    ? 'bg-red-500/10 text-red-500 dark:text-red-400 border-red-500/30 hover:bg-red-500/20 shadow-sm' 
                    : 'bg-card text-muted-foreground hover:bg-openkey-blue/5 hover:text-openkey-blue hover:border-openkey-blue/20'
                }`}
                onClick={() => navigate('/messages?tab=notifications')}
              >
                <Bell className="w-4 h-4" />
                {notificationUnreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center min-w-[20px]">
                    {notificationUnreadCount > 9 ? '9+' : notificationUnreadCount}
                  </span>
                )}
              </Button>
              <Button 
                variant="outline" 
                size="icon"
                className={`border-border rounded-lg relative transition-all duration-200 ${
                  unreadMessageCount > 0 
                    ? 'bg-red-500/10 text-red-500 dark:text-red-400 border-red-500/30 hover:bg-red-500/20 shadow-sm' 
                    : 'bg-card text-muted-foreground hover:bg-openkey-gold/5 hover:text-openkey-gold hover:border-openkey-gold/20'
                }`}
                onClick={() => {
                   if (profile?.user_type === 'landlord') {
                     navigate('/dashboard?portfolioId=everything', { state: { activeTab: 'Messages' } });
                   } else {
                     navigate('/messages');
                   }
                }}
              >
                <MessageSquare className="w-4 h-4" />
                {unreadMessageCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center min-w-[20px]">
                    {unreadMessageCount > 9 ? '9+' : unreadMessageCount}
                  </span>
                )}
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="icon"
                    className="border-border rounded-lg bg-card text-muted-foreground hover:bg-openkey-blue/5 hover:text-openkey-blue hover:border-openkey-blue/20 transition-all duration-200"
                  >
                    <UserIcon className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 bg-card border border-border shadow-lg">
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
                </DropdownMenuContent>
              </DropdownMenu>
              <Button 
                variant="outline" 
                size="icon"
                onClick={handleSignOut}
                className="hover:bg-red-500/10 hover:text-red-500 dark:hover:text-red-400 hover:border-red-500/30 transition-all duration-200"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>


      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {userId && <NotificationCenter userId={userId} showHeader={true} />}
      </main>
    </div>
  );
};

export default Messages;

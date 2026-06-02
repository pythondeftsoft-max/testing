import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { Bell, MessageSquare, ArrowLeft, Crown, LogOut, Settings, Users } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { User as UserIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useNotificationCount } from '@/hooks/useNotificationCount';
import { useLandlordUnreadMessageCount } from '@/hooks/useLandlordUnreadMessageCount';
import { useSubscription } from '@/hooks/useSubscription';
import { useToast } from '@/hooks/use-toast';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import LandlordMessages from '@/components/LandlordMessages';
import PortfolioSelectorDropdown from '@/components/PortfolioSelectorDropdown';
import LandlordNotificationsContent from '@/components/landlord/LandlordNotificationsContent';

const LandlordInbox = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const { toast } = useToast();
  
  const [userId, setUserId] = useState<string | null>(null);
  const portfolioId = searchParams.get('portfolioId') || 'everything';
  const initialTab = searchParams.get('tab') || 'notifications';
  const [activeTab, setActiveTab] = useState(initialTab);
  
  const { unreadCount: notificationCount } = useNotificationCount();
  const { unreadCount: messageCount } = useLandlordUnreadMessageCount();
  const { hasActiveSubscription } = useSubscription(userId || '', 'landlord');

  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
      } else {
        navigate('/auth');
      }
    };
    getCurrentUser();
  }, [navigate]);

  // Update URL when tab changes
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    const newParams = new URLSearchParams(searchParams);
    newParams.set('tab', value);
    setSearchParams(newParams, { replace: true });
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      navigate('/');
    } catch (error) {
      console.error('Error signing out:', error);
      toast({
        title: "Error signing out",
        description: "Please try again",
        variant: "destructive"
      });
    }
  };

  const handleBack = () => {
    navigate(`/dashboard?portfolioId=${portfolioId}`);
  };

  if (!userId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/95 backdrop-blur-sm sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center py-3 sm:py-4 min-h-[60px] sm:min-h-[72px]">
            {/* Left Section - Back + Brand */}
            <div className="flex items-center gap-2 sm:gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleBack}
                className="h-9 w-9 sm:h-10 sm:w-10"
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <button 
                onClick={() => navigate('/')}
                className="text-xl sm:text-2xl font-bold text-gradient-blue-gold hover:opacity-80 transition-opacity cursor-pointer"
              >
                OpenKey
              </button>
            </div>

            {/* Center Section - Portfolio (Desktop only) */}
            <div className="hidden lg:flex flex-1 justify-center px-4">
              <div className="bg-card/80 border border-border/50 rounded-xl px-4 py-2 backdrop-blur-sm shadow-sm">
                <PortfolioSelectorDropdown
                  selectedPortfolio={portfolioId}
                  onPortfolioChange={(newPortfolioId) => {
                    const newParams = new URLSearchParams(searchParams);
                    newParams.set('portfolioId', newPortfolioId);
                    setSearchParams(newParams);
                  }}
                  userId={userId}
                  showBackButton={false}
                />
              </div>
            </div>

            {/* Right Section - Actions */}
            <div className="ml-auto flex items-center gap-1 sm:gap-2">
              {hasActiveSubscription && (
                <div className="hidden sm:flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-amber-500 to-yellow-500 text-white rounded-lg text-sm font-semibold shadow-sm">
                  <Crown className="w-4 h-4" />
                  <span className="hidden lg:inline">Landlord Pro</span>
                </div>
              )}

              <div className="flex items-center space-x-1 sm:space-x-3">
                <ThemeToggle className="hidden sm:flex" />

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="inline-flex items-center justify-center h-9 w-9 sm:h-10 sm:w-10 rounded-lg border border-openkey-blue/20 text-openkey-blue bg-card hover:bg-openkey-blue hover:text-white transition-all duration-200">
                      <UserIcon className="w-4 h-4" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48 bg-card border border-border shadow-lg z-50">
                    <DropdownMenuItem 
                      onClick={() => navigate(`/dashboard?portfolioId=${portfolioId}`, { state: { activeTab: 'Profile' } })}
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
                      onClick={() => navigate(`/user-roles?portfolioId=${portfolioId}`)}
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
                  className="h-9 w-9 sm:h-10 sm:w-10 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all duration-200"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Portfolio Selector */}
      <div className="lg:hidden px-4 py-3 border-b border-border/50 bg-card/50">
        <PortfolioSelectorDropdown
          selectedPortfolio={portfolioId}
          onPortfolioChange={(newPortfolioId) => {
            const newParams = new URLSearchParams(searchParams);
            newParams.set('portfolioId', newPortfolioId);
            setSearchParams(newParams);
          }}
          userId={userId}
          showBackButton={false}
        />
      </div>

      {/* Main Content with Tabs */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="w-full max-w-md mx-auto mb-6">
            <TabsTrigger value="notifications" className="flex-1 gap-2">
              <Bell className="w-4 h-4" />
              <span className="hidden sm:inline">Notifications</span>
              {notificationCount > 0 && (
                <Badge variant="destructive" className="ml-1 h-5 min-w-[20px] text-xs">
                  {notificationCount > 9 ? '9+' : notificationCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="messages" className="flex-1 gap-2">
              <MessageSquare className="w-4 h-4" />
              <span className="hidden sm:inline">Messages</span>
              {messageCount > 0 && (
                <Badge variant="destructive" className="ml-1 h-5 min-w-[20px] text-xs">
                  {messageCount > 9 ? '9+' : messageCount}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="notifications" className="mt-0">
            <LandlordNotificationsContent 
              userId={userId} 
              portfolioId={portfolioId}
            />
          </TabsContent>

          <TabsContent value="messages" className="mt-0">
            <LandlordMessages
              userId={userId}
              onBack={() => handleTabChange('notifications')}
            />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default LandlordInbox;

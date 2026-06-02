import React from 'react';
import { useNavigate } from 'react-router-dom';
import { User as UserIcon, LogOut, Settings, Users, Crown, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import PortfolioSelectorDropdown from './PortfolioSelectorDropdown';
import { ActiveGrantIndicator } from '@/components/ActiveGrantIndicator';
import { CombinedInboxButton } from '@/components/CombinedInboxButton';
import { useSubscription } from '@/hooks/useSubscription';

import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface DashboardHeaderProps {
  userId: string;
  currentPortfolio: string;
  onPortfolioChange?: (portfolioId: string) => void;
}

export function DashboardHeader({ userId, currentPortfolio, onPortfolioChange }: DashboardHeaderProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { hasActiveSubscription } = useSubscription(userId, 'landlord');
  
  

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

  const handlePortfolioChange = (portfolioId: string) => {
    if (onPortfolioChange) {
      onPortfolioChange(portfolioId);
    } else {
      // Default behavior: navigate to dashboard with portfolio
      if (portfolioId === 'everything') {
        navigate('/dashboard');
      } else {
        navigate(`/dashboard?portfolioId=${portfolioId}`);
      }
    }
  };

  return (
    <header className="border-b border-border bg-card/95 backdrop-blur-sm sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative flex items-center py-4 min-h-[72px]">
          {/* Left Section - Brand */}
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate('/')}
              className="text-2xl font-bold text-gradient-blue-gold hover:opacity-80 transition-opacity cursor-pointer"
            >
              OpenKey
            </button>
          </div>

          {/* Center Section - Portfolio Management (Absolutely centered) */}
          <div className="absolute left-1/2 transform -translate-x-1/2">
            <div className="bg-card/80 border border-border/50 rounded-xl px-6 py-3 backdrop-blur-sm shadow-sm hover:shadow-md transition-all duration-200">
              <PortfolioSelectorDropdown
                selectedPortfolio={currentPortfolio}
                onPortfolioChange={handlePortfolioChange}
                userId={userId}
                showBackButton={true}
              />
            </div>
          </div>
          
          {/* Right Section - Action Buttons */}
          <div className="ml-auto flex items-center gap-2">
            {/* Pro Badge */}
            {hasActiveSubscription && (
              <div className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-amber-500 to-yellow-500 text-white rounded-lg text-sm font-semibold shadow-sm">
                <Crown className="w-4 h-4" />
                <span className="hidden lg:inline">Landlord Pro</span>
              </div>
            )}

            {/* Individual Navigation Buttons */}
            <div className="flex items-center space-x-3">
              <ActiveGrantIndicator />
              
              {/* Combined Inbox Button (Notifications + Messages) */}
              <CombinedInboxButton portfolioId={currentPortfolio} />

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button 
                    className="inline-flex items-center justify-center h-10 w-10 rounded-lg border border-openkey-blue/20 text-openkey-blue bg-card hover:bg-openkey-blue hover:text-white transition-all duration-200"
                  >
                    <UserIcon className="w-4 h-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 bg-card border border-border shadow-lg z-50">
                  <DropdownMenuItem 
                    onClick={() => navigate(`/dashboard?portfolioId=${currentPortfolio}`, { state: { activeTab: 'Profile', from: 'portfolio-dashboard', portfolioId: currentPortfolio } })}
                    className="cursor-pointer hover:bg-openkey-blue/5 hover:text-openkey-blue"
                  >
                    <UserIcon className="w-4 h-4 mr-2" />
                    View Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => navigate('/payment-settings', { state: { from: 'portfolio-dashboard', portfolioId: currentPortfolio } })}
                    className="cursor-pointer hover:bg-openkey-blue/5 hover:text-openkey-blue"
                  >
                    <Settings className="w-4 h-4 mr-2" />
                    Payment Settings
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => navigate(`/user-roles?portfolioId=${currentPortfolio}`, { state: { from: 'portfolio-dashboard', portfolioId: currentPortfolio } })}
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

              <Button 
                variant="outline" 
                size="icon"
                onClick={handleSignOut}
                className="hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all duration-200"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

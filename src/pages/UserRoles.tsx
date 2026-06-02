
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Settings, Users, Shield, Crown, Building2, LogIn, LogOut, UserCheck, Cog, ArrowLeft, RefreshCcw, AlertTriangle, Bell, MessageSquare, User as UserIcon, CreditCard, CheckCircle, XCircle, ChevronDown } from 'lucide-react';

import { AccountRoleManager } from '@/components/account/AccountRoleManager';
import { AccountPermissionsManager } from '@/components/permissions/AccountPermissionsManager';
import RbacLogs from '@/pages/admin/RbacLogs';
import { RoleSelector } from '@/components/permissions/RoleSelector';
import { PermissionsGrid } from '@/components/permissions/PermissionsGrid';
import { PortfolioAccessControl } from '@/components/portfolio/PortfolioAccessControl';
import { PortfolioPermissionsManager } from '@/components/portfolio/PortfolioPermissionsManager';
import { PortfolioOverview } from '@/components/portfolio/PortfolioOverview';
import { useAccountRoles, AccountRoleType } from '@/hooks/useAccountRoles';
import { useAuth } from '@/hooks/useAuth';
import { useNotificationCount } from '@/hooks/useNotificationCount';
import { useUnreadMessageCount } from '@/hooks/useUnreadMessageCount';
import { useNavigate, useSearchParams } from 'react-router-dom';
import ErrorBoundary from '@/components/ErrorBoundary';
import PortfolioSelectorDropdown from '@/components/PortfolioSelectorDropdown';
import { CardEnhanced, CardEnhancedHeader, CardEnhancedTitle, CardEnhancedContent } from '@/components/enhanced/CardEnhanced';

const UserRoles: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, loading: authLoading, signOut } = useAuth();
  
  const { 
    highestAccountRole, 
    isAccountOwner, 
    loading: rolesLoading, 
    rolesDetermined,
    hasErrors, 
    lastError, 
    refreshRoles,
    accountPermissions
  } = useAccountRoles();
  
  // Header navigation hooks
  const { unreadCount } = useNotificationCount();
  const { unreadCount: unreadMessageCount } = useUnreadMessageCount();
  
  
  const [selectedRole, setSelectedRole] = useState<AccountRoleType | undefined>();
  const [isEditingPermissions, setIsEditingPermissions] = useState(false);
  const [activeTab, setActiveTab] = useState('account');
  const [activeAccountSubTab, setActiveAccountSubTab] = useState('users');
  const [activePortfolioSubTab, setActivePortfolioSubTab] = useState('overview');
  const [selectedPortfolio, setSelectedPortfolio] = useState<string>('everything');
  const [isAccessSectionOpen, setIsAccessSectionOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  // Handle URL query parameters for tab navigation
  React.useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'logs' || tabParam === 'account' || tabParam === 'portfolio') {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  // PHASE 1 FIX: Smart loading logic - show loading until roles are determined
  const shouldShowLoading = authLoading || !rolesDetermined || isSigningOut;

  // DEBUG: Log component state every render
  console.group('🏠 UserRoles Component Debug');
  console.log('👤 Auth State:', { 
    user: user ? { id: user.id, email: user.email } : null, 
    authLoading 
  });
  console.log('🔐 Roles State:', { 
    highestAccountRole, 
    isAccountOwner, 
    rolesLoading
  });
  console.log('⏱️ Loading State:', {
    authLoading,
    rolesLoading,
    shouldShowLoading
  });
  console.log('🎯 Access Decision Logic:', {
    hasUser: !!user,
    isOwner: isAccountOwner,
    rolesDetermined,
    willShowLoading: shouldShowLoading,
    willShowAuthRequired: !user && !shouldShowLoading,
    willShowMainContent: !shouldShowLoading && user && isAccountOwner,
    willShowAccessRestricted: !shouldShowLoading && user && !isAccountOwner
  });
  console.groupEnd();

  const handleRoleSelect = (role: AccountRoleType) => {
    setSelectedRole(role);
    setIsEditingPermissions(false);
  };

  const handleEditPermissions = (role: AccountRoleType) => {
    setSelectedRole(role);
    setIsEditingPermissions(true);
  };

  const handlePermissionsSave = () => {
    setIsEditingPermissions(false);
  };

  const handleBack = () => {
    const portfolioId = searchParams.get('portfolioId');
    if (portfolioId && portfolioId !== 'everything') {
      navigate(`/dashboard?portfolioId=${portfolioId}`);
    } else {
      navigate('/dashboard');
    }
  };

  const handleSignOut = async () => {
    setIsSigningOut(true);
    await signOut();
    navigate('/');
  };

  if (shouldShowLoading) {
    console.log('🔄 UserRoles: Showing loading state');
    return (
      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur-sm">
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
              <div className="absolute left-1/2 transform -translate-x-1/2">
                <div className="bg-card/80 border border-border/50 rounded-xl px-6 py-3 backdrop-blur-sm shadow-sm hover:shadow-md transition-all duration-200">
                  <PortfolioSelectorDropdown
                    selectedPortfolio={selectedPortfolio}
                    onPortfolioChange={(portfolioId) => navigate(`/dashboard?portfolioId=${portfolioId}`)}
                    userId={user?.id || ''}
                  />
                </div>
              </div>

              <div className="flex items-center space-x-3">
                {/* Notifications Button */}
                <Button 
                  variant="outline" 
                  size="icon"
                  className="border-openkey-blue/20 text-openkey-blue bg-card rounded-lg relative transition-all duration-200 hover:bg-openkey-blue hover:text-white"
                  onClick={() => navigate('/landlord-notifications')}
                >
                  <Bell className="w-4 h-4" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center min-w-[20px]">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </Button>
                
                {/* Messages Button */}
                <Button 
                  variant="outline" 
                  size="icon"
                  className={`border rounded-lg relative transition-all duration-200 ${
                    unreadMessageCount > 0
                      ? 'bg-red-50 border-red-300 text-red-600 hover:bg-red-500 hover:text-white'
                      : 'border-openkey-blue/20 text-openkey-blue hover:bg-openkey-blue hover:text-white'
                  }`}
                   onClick={() => navigate('/dashboard?portfolioId=everything', { state: { activeTab: 'Messages' } })}
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
                    >
                      <UserIcon className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="z-50 w-48 bg-card border border-border shadow-lg">
                    <DropdownMenuItem 
                     onClick={() => {
                       const portfolioId = searchParams.get('portfolioId') || 'everything';
                       navigate(`/dashboard?portfolioId=${portfolioId}`, { state: { activeTab: 'Profile' } });
                     }}
                      className="cursor-pointer hover:bg-openkey-blue/5 hover:text-openkey-blue"
                    >
                      <UserIcon className="w-4 h-4 mr-2" />
                      View Profile
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => navigate('/payment-settings')}
                      className="cursor-pointer hover:bg-openkey-blue/5 hover:text-openkey-blue"
                    >
                      <CreditCard className="w-4 h-4 mr-2" />
                      Payment Settings
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => navigate('/user-roles')}
                      className="cursor-pointer hover:bg-openkey-blue/5 hover:text-openkey-blue"
                    >
                      <Shield className="w-4 h-4 mr-2" />
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
                
                {/* Sign Out Button */}
                <Button 
                  variant="outline" 
                  size="icon"
                  className="hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all duration-200"
                  onClick={handleSignOut}
                >
                  <LogOut className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </header>

        {/* Loading Content with Progress */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center space-y-6">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <div className="space-y-2">
                <p className="text-lg font-medium">Loading User Roles</p>
                <div className="space-y-1 text-sm text-muted-foreground">
                  <div className="flex items-center justify-center gap-2">
                    <div className={authLoading ? "animate-pulse" : ""}>
                      {authLoading ? "⏳" : "✅"} Authentication
                    </div>
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    <div className={rolesLoading ? "animate-pulse" : ""}>
                      {rolesLoading ? "⏳" : "✅"} Role Data
                    </div>
                  </div>
                </div>
              </div>
              {hasErrors && (
                <div className="mt-4 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <div className="flex items-center justify-center gap-2 text-destructive">
                    <AlertTriangle className="w-4 h-4" />
                    <span className="text-sm font-medium">Loading Error</span>
                  </div>
                  <p className="text-xs text-destructive/80 mt-1">{lastError}</p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={refreshRoles}
                    className="mt-2"
                  >
                    <RefreshCcw className="w-3 h-3 mr-1" />
                    Retry
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    console.log('🔄 UserRoles: Showing auth required - no user');
    return (
      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur-sm">
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
              <div className="absolute left-1/2 transform -translate-x-1/2">
                <div className="bg-card/80 border border-border/50 rounded-xl px-6 py-3 backdrop-blur-sm shadow-sm hover:shadow-md transition-all duration-200 opacity-50">
                  <span className="text-sm text-muted-foreground">Authentication Required</span>
                </div>
              </div>

              {/* Right side - Auth buttons */}
              <div className="flex space-x-4">
                <Button variant="outline" onClick={() => navigate('/auth?mode=login')}>
                  Login
                </Button>
                <Button onClick={() => navigate('/auth?mode=signup')}>
                  Sign Up
                </Button>
              </div>
            </div>
          </div>
        </header>

        {/* Auth Required Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <LogIn className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Authentication Required</h3>
              <p className="text-muted-foreground mb-4">
                Please log in to access user roles and permissions management.
              </p>
              <Button onClick={() => navigate('/auth')}>
                Go to Login
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // CRITICAL DEBUG: Check for owner access
  console.log('🔍 CRITICAL ACCESS CHECK:', {
    isAccountOwner,
    highestAccountRole,
    userExists: !!user,
    rolesLoading,
    authLoading,
    typeOfIsAccountOwner: typeof isAccountOwner,
    isAccountOwnerStrictlyFalse: isAccountOwner === false,
    isAccountOwnerUndefined: isAccountOwner === undefined,
    isAccountOwnerNull: isAccountOwner === null
  });

  if (!isAccountOwner) {
    console.log('🚫 UserRoles: User does not have owner access');
    console.log('🚫 Access Decision:', { isAccountOwner, highestAccountRole });
    return (
      <div className="min-h-screen bg-background">
        {/* Header */}
         <header className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur-sm">
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
              <div className="absolute left-1/2 transform -translate-x-1/2">
                <div className="bg-card/80 border border-border/50 rounded-xl px-6 py-3 backdrop-blur-sm shadow-sm hover:shadow-md transition-all duration-200 opacity-50">
                  <span className="text-sm text-muted-foreground">Access Restricted</span>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <Button 
                  variant="outline" 
                  size="icon"
                  className="border-border rounded-lg bg-card text-muted-foreground hover:bg-red-50 hover:text-red-600 hover:border-red-300 transition-all duration-200"
                  onClick={handleSignOut}
                >
                  <LogIn className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </header>

        {/* Access Restricted Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <Shield className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Access Restricted</h3>
              <p className="text-muted-foreground mb-4">
                You need account owner permissions to access user role management.
              </p>
              <div className="mt-4 p-4 bg-muted rounded-lg text-sm">
                <p>DEBUG: isAccountOwner={String(isAccountOwner)}, role={highestAccountRole || 'null'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  console.log('✅ UserRoles: Showing main content - user has owner access');

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur-sm">
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
            <div className="absolute left-1/2 transform -translate-x-1/2">
              <div className="bg-card/80 border border-border/50 rounded-xl px-6 py-3 backdrop-blur-sm shadow-sm hover:shadow-md transition-all duration-200">
                <PortfolioSelectorDropdown
                  selectedPortfolio={selectedPortfolio}
                  onPortfolioChange={(portfolioId) => navigate(`/dashboard?portfolioId=${portfolioId}`)}
                  userId={user.id}
                />
              </div>
            </div>

            <div className="flex items-center space-x-3">
              {/* Notifications Button */}
              <Button 
                variant="outline" 
                size="icon"
                className="border-openkey-blue/20 text-openkey-blue bg-card rounded-lg relative transition-all duration-200 hover:bg-openkey-blue hover:text-white"
                onClick={() => navigate('/landlord-notifications')}
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center min-w-[20px]">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Button>
              
              {/* Messages Button */}
              <Button 
                variant="outline" 
                size="icon"
                className={`border rounded-lg relative transition-all duration-200 ${
                  unreadMessageCount > 0 
                    ? 'bg-red-50 border-red-300 text-red-600 hover:bg-red-500 hover:text-white'
                    : 'border-openkey-blue/20 text-openkey-blue hover:bg-openkey-blue hover:text-white'
                }`}
                onClick={() => navigate('/dashboard?portfolioId=everything', { state: { activeTab: 'Messages' } })}
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
                  >
                    <UserIcon className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="z-50 w-48 bg-card border border-border shadow-lg">
                  <DropdownMenuItem 
                    onClick={() => {
                      const portfolioId = searchParams.get('portfolioId') || 'everything';
                      navigate(`/dashboard?portfolioId=${portfolioId}`, { state: { activeTab: 'Profile' } });
                    }}
                    className="cursor-pointer hover:bg-openkey-blue/5 hover:text-openkey-blue"
                  >
                    <UserIcon className="w-4 h-4 mr-2" />
                    View Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => navigate('/payment-settings')}
                    className="cursor-pointer hover:bg-openkey-blue/5 hover:text-openkey-blue"
                  >
                    <CreditCard className="w-4 h-4 mr-2" />
                    Payment Settings
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => navigate('/user-roles')}
                    className="cursor-pointer hover:bg-openkey-blue/5 hover:text-openkey-blue"
                  >
                    <Shield className="w-4 h-4 mr-2" />
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

              {/* Sign Out Button */}
              <Button 
                variant="outline" 
                size="icon"
                className="hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all duration-200"
                onClick={handleSignOut}
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="space-y-6">
            <h1 className="sr-only">User Roles & Permissions</h1>
            <CardEnhanced variant="premium" className="overflow-hidden">
              <CardEnhancedHeader className="pb-4">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="flex items-center space-x-4">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={handleBack}
                      className="border-openkey-blue/20 text-openkey-blue hover:bg-openkey-blue hover:text-white"
                    >
                      <ArrowLeft className="w-4 h-4 mr-1" />
                      Back
                    </Button>
                    <div>
                      <CardEnhancedTitle gradient className="text-2xl md:text-3xl">User Roles & Permissions</CardEnhancedTitle>
                      <p className="text-muted-foreground mt-1">Manage user access and permissions across your organization</p>
                    </div>
                  </div>
                  <div className="flex items-center flex-wrap gap-2">
                    <Badge className="bg-openkey-blue text-white">
                      Your Role: {highestAccountRole === 'owner' ? 'Owner' : 
                                 highestAccountRole === 'admin_partner' ? 'Admin Partner' : 
                                 highestAccountRole === 'support_assistant' ? 'Support Assistant' :
                                 'Loading...'}
                    </Badge>
                    {(hasErrors || lastError) && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={refreshRoles}
                        className="text-xs"
                      >
                        <RefreshCcw className="w-3 h-3 mr-1" />
                        Refresh
                      </Button>
                    )}
                  </div>
                </div>
              </CardEnhancedHeader>
            </CardEnhanced>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="-mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 bg-background/80 border-b border-border/40 py-2">
              <TabsList className="grid w-full grid-cols-3 h-14 bg-card/80 border-2 border-border/30 p-1.5 mb-4 shadow-lg rounded-xl">
                <TabsTrigger 
                  value="account" 
                  className="flex items-center gap-3 text-base font-semibold py-3 px-6 data-[state=active]:bg-openkey-blue data-[state=active]:text-white data-[state=active]:shadow-lg hover:bg-openkey-blue/10 hover:text-openkey-blue transition-all duration-300"
                >
                  <Shield className="w-5 h-5" />
                  Account Level
                </TabsTrigger>
                <TabsTrigger 
                  value="portfolio" 
                  className="flex items-center gap-3 text-base font-semibold py-3 px-6 data-[state=active]:bg-openkey-gold data-[state=active]:text-white data-[state=active]:shadow-lg hover:bg-openkey-gold/10 hover:text-openkey-gold transition-all duration-300"
                >
                  <Building2 className="w-5 h-5" />
                  Portfolio Level
                </TabsTrigger>
                <TabsTrigger 
                  value="logs" 
                  className="flex items-center gap-3 text-base font-semibold py-3 px-6 data-[state=active]:bg-purple-600 data-[state=active]:text-white data-[state=active]:shadow-lg hover:bg-purple-600/10 hover:text-purple-600 transition-all duration-300"
                >
                  <Shield className="w-5 h-5" />
                  RBAC Logs
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="account" className="space-y-6">
              <Tabs value={activeAccountSubTab} onValueChange={setActiveAccountSubTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2 h-10 bg-muted/50 border border-border/30 p-1 rounded-lg">
                  <TabsTrigger value="users" className="flex items-center gap-2 text-sm">
                    <Users className="w-4 h-4" />
                    Users & Invitations
                  </TabsTrigger>
                  <TabsTrigger value="permissions" className="flex items-center gap-2 text-sm">
                    <Shield className="w-4 h-4" />
                    Role Permissions
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="users" className="mt-6">
                  <CardEnhanced>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5 text-primary" />
                        Account Team Management
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <AccountRoleManager />
                    </CardContent>
                  </CardEnhanced>
                </TabsContent>

                <TabsContent value="permissions" className="mt-6">
                  <CardEnhanced>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Shield className="h-5 w-5 text-primary" />
                        Account Role Permissions
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <AccountPermissionsManager 
                        currentUserId={user.id}
                        isAccountOwner={isAccountOwner}
                      />
                    </CardContent>
                  </CardEnhanced>
                </TabsContent>
              </Tabs>
            </TabsContent>

            <TabsContent value="portfolio" className="space-y-6">
              <Tabs value={activePortfolioSubTab} onValueChange={setActivePortfolioSubTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2 h-10 bg-muted/50 border border-border/30 p-1 rounded-lg">
                  <TabsTrigger value="overview" className="flex items-center gap-2 text-sm">
                    <Building2 className="w-4 h-4" />
                    Portfolio Teams Overview
                  </TabsTrigger>
                  <TabsTrigger value="permissions" className="flex items-center gap-2 text-sm">
                    <Shield className="w-4 h-4" />
                    Role Permissions
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="mt-6">
                  <Card className="border-border shadow-sm">
                    <CardHeader className="pb-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-openkey-gold/10 rounded-lg">
                          <Building2 className="w-5 h-5 text-openkey-gold" />
                        </div>
                        <CardTitle className="text-xl text-foreground">Portfolio Teams Overview</CardTitle>
                      </div>
                      <p className="text-sm text-muted-foreground mt-2">
                        View all portfolio teams and their role distribution. To manage a specific portfolio's team, click "Manage Team".
                      </p>
                    </CardHeader>
                    <CardContent>
                      <PortfolioOverview userId={user.id} />
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="permissions" className="mt-6">
                  <Card className="border-border shadow-sm">
                    <CardHeader className="pb-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-openkey-gold/10 rounded-lg">
                          <Shield className="w-5 h-5 text-openkey-gold" />
                        </div>
                        <CardTitle className="text-xl text-foreground">Configure Portfolio Role Permissions</CardTitle>
                      </div>
                      <p className="text-sm text-muted-foreground mt-2">
                        Configure permissions for portfolio roles that apply across all portfolios.
                      </p>
                    </CardHeader>
                    <CardContent>
                      <PortfolioPermissionsManager 
                        portfolioId="everything"
                        currentUserId={user.id}
                        isAdminPartner={isAccountOwner}
                      />
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </TabsContent>

            <TabsContent value="logs" className="space-y-6">
              <Card className="border-border shadow-sm">
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-600/10 rounded-lg">
                      <Shield className="w-5 h-5 text-purple-600" />
                    </div>
                    <CardTitle className="text-xl text-foreground">RBAC Audit Logs</CardTitle>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    View and audit all role-based access control events across your account and portfolios.
                  </p>
                </CardHeader>
                <CardContent>
                  <RbacLogs />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
    </ErrorBoundary>
  );
};

export default UserRoles;


import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CardEnhanced, CardEnhancedContent, CardEnhancedHeader, CardEnhancedTitle } from '@/components/enhanced/CardEnhanced';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Users, Settings, FileText, Info, Bell, MessageSquare, User, LogOut, Pencil, Save, Loader2 } from 'lucide-react';
import PortfolioPointsDistribution from '@/components/portfolio/PortfolioPointsDistribution';
import ReportingDashboard from '@/components/reporting/ReportingDashboard';
import { PortfolioTeamManager } from '@/components/portfolio/PortfolioTeamManager';
import { usePortfolioAccess } from '@/hooks/usePortfolioAccess';

import { PointsSectionHeader } from '@/components/points/PointsSectionHeader';
import { useNotificationCount } from '@/hooks/useNotificationCount';
import { useUnreadMessageCount } from '@/hooks/useUnreadMessageCount';
import PortfolioSelectorDropdown from '@/components/PortfolioSelectorDropdown';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { useAccountRoles } from '@/hooks/useAccountRoles';
import { useUpdatePortfolio } from '@/hooks/useUpdatePortfolio';
import { toast } from '@/hooks/use-toast';

const PortfolioSettings = () => {
  const { portfolioId } = useParams<{ portfolioId: string }>();
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { unreadCount: notificationCount } = useNotificationCount();
  const { unreadCount: messageCount } = useUnreadMessageCount();
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') || 'information';
  const [activeTab, setActiveTab] = useState(initialTab);
  
  // Edit mode state
  const [isEditingInfo, setIsEditingInfo] = useState(false);
  const [editFormData, setEditFormData] = useState({
    client_name: '',
    client_email: '',
    client_phone: ''
  });
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  
  // Update mutation
  const updateMutation = useUpdatePortfolio();

  const { data: currentUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
  });

  const { data: userProfile } = useQuery({
    queryKey: ['user-profile', currentUser?.id],
    queryFn: async () => {
      if (!currentUser?.id) return null;
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentUser.id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!currentUser?.id,
  });

  const handlePortfolioChange = (newPortfolioId: string) => {
    navigate(`/portfolio/${newPortfolioId}/settings`);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  // Check if user is account owner or portfolio admin
  const { isAccountOwner } = useAccountRoles();
  
  // Check if user has admin_partner role for this specific portfolio
  const { data: userPortfolioRole } = useQuery({
    queryKey: ['user-portfolio-role', portfolioId, currentUser?.id],
    queryFn: async () => {
      if (!portfolioId || !currentUser?.id || portfolioId === 'everything') return null;
      const { data } = await supabase
        .from('portfolio_roles')
        .select('role_name')
        .eq('portfolio_id', portfolioId)
        .eq('user_id', currentUser.id)
        .eq('is_active', true)
        .maybeSingle();
      return data?.role_name;
    },
    enabled: !!portfolioId && !!currentUser?.id && portfolioId !== 'everything'
  });
  
  const isPortfolioAdmin = userPortfolioRole === 'admin_partner';
  const canEditPortfolio = isAccountOwner || isPortfolioAdmin;

  // Check portfolio access with admin_partner role requirement
  // Skip access check for "everything" portfolio as it's a system-wide view
  const { hasAccess, loading: accessLoading, isDenied } = usePortfolioAccess({
    portfolioId: portfolioId === 'everything' ? '' : (portfolioId || ''),
    userId: currentUser?.id || '',
    requiredRoles: ['admin_partner', 'editor'],
    redirectOnNoAccess: false
  });

  // For "everything" portfolio, grant access automatically
  const effectiveHasAccess = portfolioId === 'everything' ? true : hasAccess;
  const effectiveIsDenied = portfolioId === 'everything' ? false : isDenied;

  const { data: portfolio, isLoading } = useQuery({
    queryKey: ['portfolio', portfolioId],
    queryFn: async () => {
      if (!portfolioId) throw new Error('Portfolio ID is required');
      
      // Handle the special "everything" case
      if (portfolioId === 'everything') {
        return {
          id: 'everything',
          client_name: 'All Portfolios',
          client_email: null,
          client_phone: null,
          created_at: new Date().toISOString(),
          manager_id: currentUser?.id,
        };
      }
      
      const { data, error } = await supabase
        .from('portfolios')
        .select('*')
        .eq('id', portfolioId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!portfolioId,
  });
  
  // Initialize form data when portfolio loads
  useEffect(() => {
    if (portfolio && !isEditingInfo) {
      setEditFormData({
        client_name: portfolio.client_name || '',
        client_email: portfolio.client_email || '',
        client_phone: portfolio.client_phone || ''
      });
    }
  }, [portfolio, isEditingInfo]);
  
  // Form handlers
  const handleFieldChange = (field: string, value: string) => {
    setEditFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear validation error when user starts typing
    if (validationErrors[field]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };
  
  const validateForm = () => {
    const errors: Record<string, string> = {};
    
    // Client name is required
    if (!editFormData.client_name.trim()) {
      errors.client_name = 'Client name is required';
    } else if (editFormData.client_name.length > 255) {
      errors.client_name = 'Client name must be less than 255 characters';
    }
    
    // Email validation (if provided)
    if (editFormData.client_email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(editFormData.client_email)) {
        errors.client_email = 'Please enter a valid email address';
      } else if (editFormData.client_email.length > 255) {
        errors.client_email = 'Email must be less than 255 characters';
      }
    }
    
    // Phone validation (if provided)
    if (editFormData.client_phone && editFormData.client_phone.length > 50) {
      errors.client_phone = 'Phone number must be less than 50 characters';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };
  
  const isFormValid = () => {
    return editFormData.client_name.trim().length > 0;
  };
  
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast({
        title: "Validation Error",
        description: "Please fix the errors before saving",
        variant: "destructive"
      });
      return;
    }
    
    updateMutation.mutate(
      {
        id: portfolioId!,
        client_name: editFormData.client_name.trim(),
        client_email: editFormData.client_email.trim() || null,
        client_phone: editFormData.client_phone.trim() || null
      },
      {
        onSuccess: () => {
          setIsEditingInfo(false);
          toast({
            title: "Success",
            description: "Portfolio information updated successfully"
          });
        }
      }
    );
  };
  
  const handleCancel = () => {
    // Reset to original values
    if (portfolio) {
      setEditFormData({
        client_name: portfolio.client_name || '',
        client_email: portfolio.client_email || '',
        client_phone: portfolio.client_phone || ''
      });
    }
    setValidationErrors({});
    setIsEditingInfo(false);
  };

  if (isLoading || accessLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-openkey-blue/[0.02]">
        <div className="container mx-auto py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-openkey-blue mx-auto mb-4"></div>
            <div className="text-lg text-openkey-blue font-medium">Loading portfolio settings...</div>
          </div>
        </div>
      </div>
    );
  }

  if (!portfolio || !currentUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-openkey-blue/[0.02]">
        <div className="container mx-auto py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-lg text-destructive">Portfolio not found</div>
          </div>
        </div>
      </div>
    );
  }

  if (effectiveIsDenied) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-openkey-blue/[0.02]">
        <div className="container mx-auto py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-lg text-destructive">Access denied. You need admin partner or editor permissions to manage this portfolio.</div>
          </div>
        </div>
      </div>
    );
  }

  if (!effectiveHasAccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-openkey-blue/[0.02]">
        <div className="container mx-auto py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-lg text-openkey-blue">Checking permissions...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-openkey-blue/[0.02]">
      {/* Header */}
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
            <div className="absolute left-1/2 transform -translate-x-1/2">
              <div className="bg-card/80 border border-border/50 rounded-xl px-6 py-3 backdrop-blur-sm shadow-sm hover:shadow-md transition-all duration-200">
                {currentUser?.id && portfolioId && (
                  <PortfolioSelectorDropdown
                    selectedPortfolio={portfolioId}
                    onPortfolioChange={handlePortfolioChange}
                    userId={currentUser.id}
                    showBackButton={true}
                  />
                )}
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <Button 
                variant="outline" 
                size="icon"
                className={`border-border rounded-lg relative transition-all duration-200 ${
                  notificationCount > 0 
                    ? 'bg-red-50 text-red-600 border-red-300 hover:bg-red-100 shadow-sm' 
                    : 'bg-card text-muted-foreground hover:bg-openkey-blue/5 hover:text-openkey-blue hover:border-openkey-blue/20'
                }`}
                onClick={() => navigate('/landlord-notifications')}
              >
                <Bell className="w-4 h-4" />
                {notificationCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center min-w-[20px]">
                    {notificationCount > 9 ? '9+' : notificationCount}
                  </span>
                )}
              </Button>
              <Button 
                variant="outline" 
                size="icon"
                className={`border-border rounded-lg relative transition-all duration-200 ${
                  messageCount > 0 
                    ? 'bg-red-50 text-red-600 border-red-300 hover:bg-red-100 shadow-sm'
                    : 'bg-card text-muted-foreground hover:bg-openkey-gold/5 hover:text-openkey-gold hover:border-openkey-gold/20'
                }`}
                onClick={() => navigate('/dashboard?portfolioId=everything', { state: { activeTab: 'Messages' } })}
              >
                <MessageSquare className="w-4 h-4" />
                {messageCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center min-w-[20px]">
                    {messageCount > 9 ? '9+' : messageCount}
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
                    <User className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 bg-card border border-border shadow-lg">
                  <DropdownMenuItem 
                    onClick={() => navigate('/dashboard?portfolioId=everything', { state: { activeTab: 'Profile' } })}
                    className="cursor-pointer hover:bg-openkey-blue/5 hover:text-openkey-blue"
                  >
                    <User className="w-4 h-4 mr-2" />
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
                    onClick={() => navigate('/user-roles')}
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
                className="hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all duration-200"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto py-8 px-4">
        <div className="mb-8">
          <PointsSectionHeader 
            title={`Portfolio Settings`}
            description={`Manage settings for "${portfolio.client_name}"`}
          />
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="information" className="flex items-center gap-2">
              <Info className="h-4 w-4" />
              Information
            </TabsTrigger>
            <TabsTrigger value="team" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Portfolio Team
            </TabsTrigger>
            <TabsTrigger value="points" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Points Distribution
            </TabsTrigger>
            <TabsTrigger value="reports" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Reports
            </TabsTrigger>
          </TabsList>

          <TabsContent value="information" className="space-y-6">
            <CardEnhanced variant="elevated" className="card-hover">
              <CardEnhancedHeader className="flex flex-row items-center justify-between">
                <CardEnhancedTitle className="text-openkey-blue flex items-center gap-2">
                  <Info className="h-5 w-5" />
                  {portfolioId === 'everything' ? 'Aggregate Portfolio Information' : 'Portfolio Information'}
                </CardEnhancedTitle>
                {canEditPortfolio && portfolioId !== 'everything' && !isEditingInfo && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditingInfo(true)}
                    className="hover:bg-openkey-blue/5 hover:text-openkey-blue hover:border-openkey-blue"
                  >
                    <Pencil className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                )}
              </CardEnhancedHeader>
              <CardEnhancedContent>
                {portfolioId === 'everything' ? (
                  <div className="space-y-4">
                    <p className="text-muted-foreground">
                      This is an aggregate view of all your portfolios. Individual portfolio settings can be managed by selecting a specific portfolio.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-openkey-blue block">View Type</label>
                        <p className="text-sm text-foreground bg-muted px-3 py-2 rounded-md border">Aggregate (All Portfolios)</p>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-openkey-blue block">Scope</label>
                        <p className="text-sm text-foreground bg-muted px-3 py-2 rounded-md border">System-wide view</p>
                      </div>
                    </div>
                  </div>
                ) : isEditingInfo ? (
                  <form onSubmit={handleSave} className="space-y-6 border-2 border-openkey-blue/20 rounded-lg p-6 bg-openkey-blue/5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Client Name Input */}
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-openkey-blue block">
                          Client Name <span className="text-red-500">*</span>
                        </label>
                        <Input
                          value={editFormData.client_name}
                          onChange={(e) => handleFieldChange('client_name', e.target.value)}
                          className={validationErrors.client_name ? 'border-red-500' : ''}
                          placeholder="Enter client name"
                        />
                        {validationErrors.client_name && (
                          <p className="text-xs text-red-500">{validationErrors.client_name}</p>
                        )}
                      </div>

                      {/* Client Email Input */}
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-openkey-blue block">Client Email</label>
                        <Input
                          type="email"
                          value={editFormData.client_email}
                          onChange={(e) => handleFieldChange('client_email', e.target.value)}
                          className={validationErrors.client_email ? 'border-red-500' : ''}
                          placeholder="client@example.com"
                        />
                        {validationErrors.client_email && (
                          <p className="text-xs text-red-500">{validationErrors.client_email}</p>
                        )}
                      </div>

                      {/* Client Phone Input */}
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-openkey-blue block">Client Phone</label>
                        <Input
                          value={editFormData.client_phone}
                          onChange={(e) => handleFieldChange('client_phone', e.target.value)}
                          placeholder="(555) 123-4567"
                        />
                      </div>

                      {/* Created Date (Read-only in edit mode) */}
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-muted-foreground block">Created</label>
                        <p className="text-sm text-muted-foreground bg-muted/50 px-3 py-2 rounded-md border">
                          {new Date(portfolio.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex justify-end gap-3 pt-4 border-t">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleCancel}
                        disabled={updateMutation.isPending}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={updateMutation.isPending || !isFormValid()}
                        className="bg-openkey-blue text-white hover:shadow-lg hover:bg-openkey-blue/90 transition-all"
                      >
                        {updateMutation.isPending ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save className="h-4 w-4 mr-2" />
                            Save Changes
                          </>
                        )}
                      </Button>
                    </div>
                  </form>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-openkey-blue block">Client Name</label>
                      <p className="text-sm text-foreground bg-muted px-3 py-2 rounded-md border">{portfolio.client_name}</p>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-openkey-blue block">Client Email</label>
                      <p className="text-sm text-foreground bg-muted px-3 py-2 rounded-md border">{portfolio.client_email || 'Not provided'}</p>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-openkey-blue block">Client Phone</label>
                      <p className="text-sm text-foreground bg-muted px-3 py-2 rounded-md border">{portfolio.client_phone || 'Not provided'}</p>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-openkey-blue block">Created</label>
                      <p className="text-sm text-foreground bg-muted px-3 py-2 rounded-md border">
                        {new Date(portfolio.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                )}
              </CardEnhancedContent>
            </CardEnhanced>
          </TabsContent>

          <TabsContent value="team" className="space-y-6">
            <CardEnhanced variant="elevated" className="card-hover">
              <CardEnhancedContent>
                <PortfolioTeamManager
                  portfolioId={portfolioId!}
                  currentUserId={currentUser.id}
                />
              </CardEnhancedContent>
            </CardEnhanced>
          </TabsContent>

          <TabsContent value="points" className="space-y-6">
            <CardEnhanced variant="elevated" className="card-hover-gold">
              <CardEnhancedContent>
                <PortfolioPointsDistribution 
                  portfolioId={portfolioId!} 
                  currentUserId={currentUser.id} 
                />
              </CardEnhancedContent>
            </CardEnhanced>
          </TabsContent>


          <TabsContent value="reports" className="space-y-6">
            <ReportingDashboard 
              portfolioId={portfolioId}
              userId={currentUser.id}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default PortfolioSettings;

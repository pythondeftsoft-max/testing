import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { User } from '@supabase/supabase-js';
import { LogOut, Building2, Plus, Archive, Undo2, Users, Settings, Bell, MessageSquare, User as UserIcon, CreditCard, Crown, Palette, Home, MapPin, TreePine, Waves, Mountain, Sun, Coffee, Zap, Flower, Heart, Trash2, HelpCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { useNotificationCount } from '@/hooks/useNotificationCount';
import { useUnreadMessageCount } from '@/hooks/useUnreadMessageCount';
import { useAdminCheck } from '@/hooks/useAdminCheck';
import PortfolioCard from '@/components/PortfolioCard';
import EverythingCard from '@/components/EverythingCard';
import PortfolioSelectorDropdown from '@/components/PortfolioSelectorDropdown';
import { ProductTour, useTourState } from '@/components/tour';
import { usePmMode } from '@/hooks/usePmMode';
interface PortfolioSelectProps {
  user: User;
  profile: any;
}

interface Portfolio {
  id: string;
  client_name: string;
  client_email?: string;
  client_phone?: string;
  created_at: string;
  manager_id: string;
}

interface PortfolioWithRole extends Portfolio {
  user_role?: string;
}

interface DeletedPortfolio {
  id: string;
  original_portfolio_id: string;
  portfolio_data: any;
  deleted_at: string;
  purge_at: string;
  property_count: number;
}

const PortfolioSelect = ({ user, profile }: PortfolioSelectProps) => {
  const [portfolios, setPortfolios] = useState<PortfolioWithRole[]>([]);
  const [deletedPortfolios, setDeletedPortfolios] = useState<DeletedPortfolio[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPortfolio, setSelectedPortfolio] = useState<string>('everything');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  const [showTrashBin, setShowTrashBin] = useState(false);
  const [clearTrashDialogOpen, setClearTrashDialogOpen] = useState(false);
  const [portfolioToDelete, setPortfolioToDelete] = useState<Portfolio | null>(null);
  const [portfolioToRestore, setPortfolioToRestore] = useState<DeletedPortfolio | null>(null);
  const [newPortfolioName, setNewPortfolioName] = useState('');
  const [newPortfolioEmail, setNewPortfolioEmail] = useState('');
  const [newPortfolioPhone, setNewPortfolioPhone] = useState('');
  const [deleteConfirmationName, setDeleteConfirmationName] = useState('');
  const [deleteNameError, setDeleteNameError] = useState('');
  
  // Product tour state — listing-mode users get a shorter focused walkthrough
  const { pmEnabled, loading: pmLoading } = usePmMode();
  const tourVariant = pmEnabled ? 'pm' : 'listing';
  const tourState = useTourState('portfolio', pmLoading ? 'pm' : tourVariant);
  const [isCreating, setIsCreating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isClearingTrash, setIsClearingTrash] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // Header navigation hooks
  const { unreadCount } = useNotificationCount();
  const { unreadCount: unreadMessageCount } = useUnreadMessageCount();
  
  // Secure admin check via RPC
  const { data: isSystemAdmin } = useAdminCheck();

  // Portfolio icon colors and icons
  const portfolioIcons = [
    { icon: Home, color: 'from-blue-500 to-blue-600' },
    { icon: Building2, color: 'from-emerald-500 to-emerald-600' },
    { icon: MapPin, color: 'from-purple-500 to-purple-600' },
    { icon: TreePine, color: 'from-green-500 to-green-600' },
    { icon: Waves, color: 'from-cyan-500 to-cyan-600' },
    { icon: Mountain, color: 'from-slate-500 to-slate-600' },
    { icon: Sun, color: 'from-orange-500 to-orange-600' },
    { icon: Coffee, color: 'from-amber-500 to-amber-600' },
    { icon: Zap, color: 'from-violet-500 to-violet-600' },
    { icon: Flower, color: 'from-pink-500 to-pink-600' },
    { icon: Heart, color: 'from-rose-500 to-rose-600' },
  ];

  const getPortfolioIcon = (index: number) => {
    const iconData = portfolioIcons[index % portfolioIcons.length];
    return iconData;
  };

  useEffect(() => {
    fetchPortfolios();
    fetchDeletedPortfolios();
  }, [user]);

  const fetchPortfolios = async () => {
    try {
      // Secure admin check via RPC instead of profile.user_type
      if (isSystemAdmin) {
        console.log('User is system admin, fetching all portfolios');
        const { data, error } = await supabase
          .from('portfolios')
          .select('*')
          .order('created_at', { ascending: true });

        if (error) throw error;

        const portfoliosWithRoles: PortfolioWithRole[] = (data || []).map(item => ({
          id: item.id,
          client_name: item.client_name,
          client_email: item.client_email,
          client_phone: item.client_phone,
          created_at: item.created_at,
          manager_id: item.manager_id,
          user_role: 'admin' // Mark as admin access
        }));

        setPortfolios(portfoliosWithRoles);
        return; // Early return for admins
      }

      // EXISTING: Fetch portfolios where user is either manager OR has a portfolio role
      console.log('Fetching portfolios with both manager and role-based access');
      
      // First get portfolios where user is the manager
      const { data: ownedPortfolios, error: ownedError } = await supabase
        .from('portfolios')
        .select('*')
        .eq('manager_id', user.id);

      if (ownedError) throw ownedError;

      // Then get portfolios where user has a role
      const { data: rolePortfolios, error: roleError } = await supabase
        .from('portfolios')
        .select(`
          *,
          portfolio_roles!inner(
            role_name,
            is_active
          )
        `)
        .eq('portfolio_roles.user_id', user.id)
        .eq('portfolio_roles.is_active', true);

      if (roleError) throw roleError;

      // Combine and deduplicate portfolios
      const allPortfolios = [...(ownedPortfolios || [])];
      
      // Add role-based portfolios that aren't already included
      (rolePortfolios || []).forEach(rolePortfolio => {
        const existsAsOwned = allPortfolios.some(p => p.id === rolePortfolio.id);
        if (!existsAsOwned) {
          allPortfolios.push(rolePortfolio);
        }
      });

      const portfoliosWithRoles: PortfolioWithRole[] = allPortfolios.map(item => {
        // Check if user is manager
        const isManager = item.manager_id === user.id;
        // Get role from portfolio_roles if available
        const portfolioRole = (item as any).portfolio_roles?.[0];
        
        return {
          id: item.id,
          client_name: item.client_name,
          client_email: item.client_email,
          client_phone: item.client_phone,
          created_at: item.created_at,
          manager_id: item.manager_id,
          user_role: isManager ? 'portfolio_owner' : (portfolioRole?.role_name || 'viewer')
        };
      });

      setPortfolios(portfoliosWithRoles);
    } catch (error) {
      console.error('Error fetching portfolios:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch portfolios',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
  };

  const handlePortfolioSelect = (portfolioId: string) => {
    navigate(`/dashboard?portfolioId=${portfolioId}`);
  };

  const handleDropdownChange = (value: string) => {
    setSelectedPortfolio(value);
    handlePortfolioSelect(value);
  };

  const handleCreatePortfolio = async () => {
    if (!newPortfolioName.trim()) {
      toast({
        title: "Error",
        description: "Portfolio name is required",
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);
    try {
      const portfolioData = {
        client_name: newPortfolioName,
        client_email: newPortfolioEmail || null,
        client_phone: newPortfolioPhone || null,
        manager_id: user.id,
      };

      const { data: portfolio, error } = await supabase
        .from('portfolios')
        .insert(portfolioData)
        .select()
        .single();

      if (error) throw error;

      // Note: Portfolio role assignment will happen via trigger once portfolio_roles table exists
      console.log('Portfolio created, role assignment will happen via trigger when portfolio_roles table is available');

      toast({
        title: "Success",
        description: "Portfolio created successfully",
      });

      setCreateDialogOpen(false);
      setNewPortfolioName('');
      setNewPortfolioEmail('');
      setNewPortfolioPhone('');
      fetchPortfolios();
    } catch (error) {
      console.error('Error creating portfolio:', error);
      toast({
        title: "Error",
        description: "Failed to create portfolio",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeletePortfolio = async () => {
    if (!portfolioToDelete) return;

    // Validate that the confirmation name matches exactly
    if (deleteConfirmationName.trim() !== portfolioToDelete.client_name) {
      setDeleteNameError(`Please type "${portfolioToDelete.client_name}" exactly to confirm deletion`);
      return;
    }

    setIsDeleting(true);
    try {
      const { error } = await supabase.rpc('soft_delete_portfolio', {
        target_portfolio_id: portfolioToDelete.id,
        deleted_by_user_id: user.id
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Portfolio deleted successfully and moved to trash. Properties are no longer visible.",
      });

      setDeleteDialogOpen(false);
      setPortfolioToDelete(null);
      setDeleteConfirmationName('');
      setDeleteNameError('');
      fetchPortfolios();
      fetchDeletedPortfolios();
    } catch (error) {
      console.error('Error deleting portfolio:', error);
      toast({
        title: "Error",
        description: "Failed to delete portfolio",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteClick = (portfolio: Portfolio) => {
    setPortfolioToDelete(portfolio);
    setDeleteDialogOpen(true);
    setDeleteConfirmationName('');
    setDeleteNameError('');
  };

  const handleDeleteConfirmationChange = (value: string) => {
    setDeleteConfirmationName(value);
    if (deleteNameError) {
      setDeleteNameError('');
    }
  };

  const handleDeleteDialogOpenChange = (open: boolean) => {
    setDeleteDialogOpen(open);
    if (!open) {
      setDeleteConfirmationName('');
      setDeleteNameError('');
    }
  };

  const fetchDeletedPortfolios = async () => {
    try {
      const { data, error } = await supabase.rpc('get_deleted_portfolios_for_user', {
        user_id: user.id
      });

      if (error) throw error;
      setDeletedPortfolios(data || []);
    } catch (error) {
      console.error('Error fetching deleted portfolios:', error);
    }
  };

  const handleRestorePortfolio = async () => {
    if (!portfolioToRestore) return;

    setIsRestoring(true);
    try {
      const { error } = await supabase.rpc('restore_deleted_portfolio', {
        deleted_portfolio_record_id: portfolioToRestore.id,
        restored_by_user_id: user.id
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Portfolio and its properties have been restored successfully.",
      });

      setRestoreDialogOpen(false);
      setPortfolioToRestore(null);
      fetchPortfolios();
      fetchDeletedPortfolios();
    } catch (error) {
      console.error('Error restoring portfolio:', error);
      toast({
        title: "Error",
        description: "Failed to restore portfolio. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsRestoring(false);
    }
  };

  const formatTimeUntilPurge = (purgeAt: string) => {
    const purgeDate = new Date(purgeAt);
    const now = new Date();
    const diffTime = purgeDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays <= 0) return 'Expires today';
    if (diffDays === 1) return '1 day remaining';
    return `${diffDays} days remaining`;
  };

  const handleClearTrashBin = async () => {
    setIsClearingTrash(true);
    try {
      const { data, error } = await supabase.rpc('clear_trash_bin_for_user', {
        user_id: user.id
      });

      if (error) throw error;

      const clearedCount = data || 0;
      
      toast({
        title: "Success",
        description: `${clearedCount} deleted portfolio${clearedCount !== 1 ? 's' : ''} permanently removed from trash.`,
      });

      setClearTrashDialogOpen(false);
      setShowTrashBin(false);
      fetchDeletedPortfolios();
    } catch (error) {
      console.error('Error clearing trash bin:', error);
      toast({
        title: "Error",
        description: "Failed to clear trash bin. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsClearingTrash(false);
    }
  };

  const handlePortfolioSettings = (portfolioId: string) => {
    // Navigate to portfolio settings page (to be implemented)
    navigate(`/portfolio/${portfolioId}/settings`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-openkey-blue"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-openkey-blue/[0.02]">
      {/* Header with enhanced OpenKey Navigation */}
      <header className="border-b border-border bg-card/95 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex justify-between items-center py-3 sm:py-4 relative">
            <div className="flex items-center">
              <button 
                onClick={() => navigate('/')}
                className="text-xl sm:text-2xl font-bold text-gradient-blue-gold hover:opacity-80 transition-opacity cursor-pointer"
              >
                OpenKey
              </button>
            </div>
            
            {/* Center Section - Portfolio Management (Hidden on mobile, Absolutely centered on desktop) */}
            <div className="hidden md:block absolute left-1/2 transform -translate-x-1/2">
              <div className="bg-card/80 border border-border/50 rounded-xl px-6 py-3 backdrop-blur-sm shadow-sm hover:shadow-md transition-all duration-200">
                <PortfolioSelectorDropdown
                  selectedPortfolio={selectedPortfolio}
                  onPortfolioChange={handlePortfolioSelect}
                  userId={user.id}
                />
              </div>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-3">
              <Button 
                variant="outline" 
                size="icon"
                onClick={() => tourState.startTour()}
                className="border-openkey-blue/20 text-openkey-blue rounded-lg bg-card hover:bg-openkey-blue hover:text-white transition-all duration-200"
                title="Take a guided tour"
              >
                <HelpCircle className="w-4 h-4" />
              </Button>
              <Button 
                variant="outline" 
                size="icon"
                className="border-openkey-blue/20 text-openkey-blue bg-card rounded-lg relative transition-all duration-200 hover:bg-openkey-blue hover:text-white"
                onClick={() => navigate('/landlord-notifications', { state: { from: 'portfolio-select' } })}
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center min-w-[20px]">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Button>
              <Button 
                variant="outline" 
                size="icon"
                className={`border rounded-lg relative transition-all duration-200 ${
                  unreadMessageCount > 0
                    ? 'bg-red-50 border-red-300 text-red-600 hover:bg-red-500 hover:text-white'
                    : 'border-openkey-blue/20 text-openkey-blue hover:bg-openkey-blue hover:text-white'
                }`}
                onClick={() => navigate('/dashboard?portfolioId=everything', { state: { activeTab: 'Messages', from: 'portfolio-select' } })}
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
                    className="border-openkey-blue/20 text-openkey-blue rounded-lg bg-card hover:bg-openkey-blue hover:text-white transition-all duration-200"
                  >
                    <UserIcon className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 bg-card border border-border shadow-lg">
                  <DropdownMenuItem 
                    onClick={() => navigate('/dashboard?portfolioId=everything', { state: { activeTab: 'Profile', from: 'portfolio-select' } })}
                    className="cursor-pointer hover:bg-openkey-blue/5 hover:text-openkey-blue"
                  >
                    <UserIcon className="w-4 h-4 mr-2" />
                    View Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => navigate('/payment-settings', { state: { from: 'portfolio-select' } })}
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

      {/* Enhanced Portfolio Management Actions Bar */}
      <div className="bg-gradient-to-r from-openkey-blue/[0.02] via-card/50 to-openkey-gold/[0.02] border-b border-border px-4 sm:px-6 py-3 sm:py-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 max-w-7xl mx-auto">
          <div className="flex items-center space-x-2 sm:space-x-3">
            <div className="p-1.5 sm:p-2 bg-gradient-to-r from-openkey-blue/10 to-openkey-blue/5 rounded-lg ring-1 ring-openkey-blue/10">
              <Building2 className="h-4 w-4 sm:h-5 sm:w-5 text-openkey-blue" />
            </div>
            <h2 className="text-base sm:text-lg font-semibold text-foreground">Portfolio Management</h2>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowTrashBin(true)}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-1 sm:gap-2 border-border hover:bg-openkey-blue/5 hover:text-openkey-blue hover:border-openkey-blue/20 transition-all duration-200 ${
                deletedPortfolios.length > 0 
                  ? 'text-destructive hover:text-destructive hover:bg-destructive/10 hover:border-destructive/20' 
                  : 'text-muted-foreground'
              }`}
            >
              <Archive className="w-4 h-4" />
              <Badge variant={deletedPortfolios.length > 0 ? "destructive" : "secondary"} className="ml-1">
                {deletedPortfolios.length}
              </Badge>
              <span className="hidden sm:inline">Trash</span>
            </Button>
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="blue" size="sm" className="flex-1 sm:flex-none flex items-center justify-center gap-1 sm:gap-2 hover:scale-105 transition-all duration-200">
                  <Plus className="w-4 h-4" />
                  <span className="hidden sm:inline">Create Portfolio</span>
                  <span className="sm:hidden">Create</span>
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Portfolio</DialogTitle>
                  <DialogDescription>
                    Create a new portfolio to organize your properties by client or category.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="portfolioName">Portfolio Name *</Label>
                    <Input
                      id="portfolioName"
                      value={newPortfolioName}
                      onChange={(e) => setNewPortfolioName(e.target.value)}
                      placeholder="e.g., Downtown Properties, Client ABC"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="clientEmail">Client Email (Optional)</Label>
                    <Input
                      id="clientEmail"
                      type="email"
                      value={newPortfolioEmail}
                      onChange={(e) => setNewPortfolioEmail(e.target.value)}
                      placeholder="client@example.com"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="clientPhone">Client Phone (Optional)</Label>
                    <Input
                      id="clientPhone"
                      value={newPortfolioPhone}
                      onChange={(e) => setNewPortfolioPhone(e.target.value)}
                      placeholder="(555) 123-4567"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button 
                    variant="outline" 
                    onClick={() => setCreateDialogOpen(false)}
                    className="border-openkey-blue/20 text-openkey-blue hover:bg-openkey-blue hover:text-white transition-all duration-200"
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleCreatePortfolio} 
                    disabled={isCreating} 
                    variant="blue"
                    className="hover:scale-105 transition-all duration-200"
                  >
                    {isCreating && <div className="w-4 h-4 mr-2 animate-spin rounded-full border-b-2 border-white" />}
                    Create Portfolio
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      {/* Enhanced Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-12">
        <div className="text-center mb-6 sm:mb-12">
          <div className="bg-gradient-blue-gold text-white rounded-xl sm:rounded-2xl p-4 sm:p-8 mb-6 sm:mb-8 shadow-lg">
            <h2 className="text-2xl sm:text-4xl font-bold mb-2 sm:mb-4">Choose a portfolio</h2>
            <p className="text-base sm:text-xl text-white/90">
              View all properties or specific portfolios you have access to
            </p>
          </div>
        </div>

        {/* Enhanced Portfolio Dropdown - Mobile Only */}
        <div className="mb-8 max-w-md mx-auto lg:hidden">
          <Select value={selectedPortfolio} onValueChange={handleDropdownChange}>
            <SelectTrigger className="w-full h-12 text-lg border-border hover:border-openkey-blue/20 transition-colors">
              <SelectValue placeholder="Everything" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="everything">Everything</SelectItem>
              {portfolios.map((portfolio) => (
                <SelectItem key={portfolio.id} value={portfolio.id}>
                  {portfolio.client_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Enhanced Portfolio Cards Grid - 2 Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Enhanced Everything Card */}
          <EverythingCard onSelect={handlePortfolioSelect} onSettings={handlePortfolioSettings} />

          {/* Enhanced Individual Portfolio Cards */}
          {portfolios.map((portfolio, index) => {
            const iconData = getPortfolioIcon(index);
            const IconComponent = iconData.icon;
            
            return (
              <PortfolioCard
                key={portfolio.id}
                portfolio={portfolio}
                iconData={iconData}
                onSelect={handlePortfolioSelect}
                onSettings={handlePortfolioSettings}
                onDelete={handleDeleteClick}
                isFirstCard={index === 0}
              />
            );
          })}

          {/* Enhanced Empty State */}
          {portfolios.length === 0 && (
            <div className="lg:col-span-2">
              <Card className="border-dashed border-2 border-border bg-gradient-to-r from-card via-card to-openkey-blue/[0.01] hover:to-openkey-blue/[0.02] transition-all duration-300">
                <CardContent className="p-8 text-center">
                  <div className="p-3 bg-gradient-to-r from-openkey-blue/10 to-openkey-blue/5 rounded-full w-fit mx-auto mb-4 ring-1 ring-openkey-blue/10">
                    <Building2 className="h-12 w-12 text-openkey-blue" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">No portfolios yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Create your first portfolio to organize your properties by client or category. You can always view all properties using the "Everything" option.
                  </p>
                  <div className="flex gap-3 justify-center">
                    <Button onClick={() => setCreateDialogOpen(true)} variant="blue" className="hover:scale-105 transition-all duration-200">
                      <Plus className="w-4 h-4 mr-2" />
                      Create Portfolio
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => handlePortfolioSelect('everything')}
                      className="border-openkey-blue/20 text-openkey-blue hover:bg-openkey-blue hover:text-white transition-all duration-200"
                    >
                      View All Properties
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </main>

      {/* Delete Portfolio Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={handleDeleteDialogOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-600">Delete Portfolio</DialogTitle>
            <DialogDescription>
              You are about to delete <strong>"{portfolioToDelete?.client_name}"</strong>. 
              All properties in this portfolio will be soft-deleted and moved to trash. 
              This action can be undone by an admin within 30 days.
            </DialogDescription>
          </DialogHeader>
          
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 my-4">
            <div className="flex items-start gap-3">
              <div className="bg-red-100 rounded-full p-1">
                <Trash2 className="w-4 h-4 text-red-600" />
              </div>
              <div>
                <h4 className="font-medium text-red-800 mb-1">Confirmation Required</h4>
                <p className="text-sm text-red-700 mb-3">
                  To confirm deletion, please type the portfolio name exactly as shown below:
                </p>
                <div className="bg-red-100 border border-red-200 rounded px-3 py-2 mb-3">
                  <code className="text-red-800 font-medium">{portfolioToDelete?.client_name}</code>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="delete-confirmation" className="text-red-800 font-medium">
                    Type portfolio name to confirm:
                  </Label>
                  <Input
                    id="delete-confirmation"
                    type="text"
                    value={deleteConfirmationName}
                    onChange={(e) => handleDeleteConfirmationChange(e.target.value)}
                    placeholder="Type portfolio name here"
                    className={`border-red-200 focus:border-red-400 focus:ring-red-400 ${
                      deleteNameError ? 'border-red-400 bg-red-50' : ''
                    }`}
                  />
                  {deleteNameError && (
                    <p className="text-sm text-red-600 font-medium">{deleteNameError}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => handleDeleteDialogOpenChange(false)}
              className="border-openkey-blue/20 text-openkey-blue hover:bg-openkey-blue hover:text-white transition-all duration-200"
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDeletePortfolio} 
              disabled={isDeleting || deleteConfirmationName.trim() !== portfolioToDelete?.client_name}
              className="hover:scale-105 transition-all duration-200"
            >
              {isDeleting && <div className="w-4 h-4 mr-2 animate-spin rounded-full border-b-2 border-white" />}
              Delete Portfolio
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Trash Bin Dialog */}
      <Dialog open={showTrashBin} onOpenChange={setShowTrashBin}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Archive className="w-5 h-5" />
              Deleted Portfolios
            </DialogTitle>
            <DialogDescription>
              Portfolios in trash can be restored by an admin within 30 days. After that, they are permanently deleted.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {deletedPortfolios.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Archive className="w-12 h-12 mx-auto mb-4" />
                <p>Trash bin is empty</p>
              </div>
            ) : (
              deletedPortfolios.map((deletedPortfolio) => (
                <Card key={deletedPortfolio.id} className="border-red-200">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="bg-red-100 text-red-600 rounded-full w-12 h-12 flex items-center justify-center">
                          <Archive className="w-6 h-6" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-foreground">
                            {deletedPortfolio.portfolio_data.client_name}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {deletedPortfolio.property_count} properties • Deleted {new Date(deletedPortfolio.deleted_at).toLocaleDateString()}
                          </p>
                          <p className="text-xs text-red-600 font-medium">
                            {formatTimeUntilPurge(deletedPortfolio.purge_at)}
                          </p>
                        </div>
                      </div>
                      <Button 
                        variant="blue"
                        size="sm"
                        onClick={() => {
                          setPortfolioToRestore(deletedPortfolio);
                          setRestoreDialogOpen(true);
                        }}
                        className="hover:scale-105 transition-all duration-200"
                      >
                        <Undo2 className="w-4 h-4 mr-2" />
                        Restore Portfolio
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          <DialogFooter className="flex justify-between">
            <Button 
              variant="destructive" 
              onClick={() => setClearTrashDialogOpen(true)}
              disabled={deletedPortfolios.length === 0}
              className="flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Clear Trash Bin
            </Button>
            <Button variant="outline" onClick={() => setShowTrashBin(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Restore Portfolio Dialog */}
      <Dialog open={restoreDialogOpen} onOpenChange={setRestoreDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Restore Portfolio</DialogTitle>
            <DialogDescription>
              Are you sure you want to restore "{portfolioToRestore?.portfolio_data?.client_name}"? 
              This will restore both the portfolio and all {portfolioToRestore?.property_count} of its properties.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setRestoreDialogOpen(false)}
              className="border-openkey-blue/20 text-openkey-blue hover:bg-openkey-blue hover:text-white transition-all duration-200"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleRestorePortfolio} 
              disabled={isRestoring}
              variant="blue"
              className="hover:scale-105 transition-all duration-200"
            >
              {isRestoring && <div className="w-4 h-4 mr-2 animate-spin rounded-full border-b-2 border-white" />}
              Restore Portfolio
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Clear Trash Bin Confirmation Dialog */}
      <Dialog open={clearTrashDialogOpen} onOpenChange={setClearTrashDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="w-5 h-5" />
              Clear Trash Bin
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to permanently delete all {deletedPortfolios.length} portfolio{deletedPortfolios.length !== 1 ? 's' : ''} from the trash bin? 
              This action cannot be undone and will permanently remove all deleted portfolios and their associated data.
            </DialogDescription>
          </DialogHeader>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 my-4">
            <div className="flex items-start gap-3">
              <div className="bg-red-100 rounded-full p-1">
                <Trash2 className="w-4 h-4 text-red-600" />
              </div>
              <div>
                <h4 className="font-medium text-red-800 mb-1">Warning: Permanent Deletion</h4>
                <p className="text-sm text-red-700">
                  This will permanently remove all portfolios from trash and cannot be reversed. 
                  Make sure you don't need to restore any of these portfolios before proceeding.
                </p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setClearTrashDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleClearTrashBin} 
              disabled={isClearingTrash}
            >
              {isClearingTrash && <div className="w-4 h-4 mr-2 animate-spin rounded-full border-b-2 border-white" />}
              Permanently Delete All
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Product Tour */}
      <ProductTour
        page="portfolio"
        variant={tourVariant}
        isRunning={tourState.isRunning}
        currentStep={tourState.currentStep}
        onStepChange={tourState.setStep}
        onComplete={tourState.completeTour}
        onSkip={tourState.skipTour}
        onStop={tourState.stopTour}
      />
    </div>
  );
};

export default PortfolioSelect;

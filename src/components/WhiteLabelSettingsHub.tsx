import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { buildSubdomainUrl } from '@/utils/baseDomain';
import { 
  Settings, 
  Palette, 
  FileText, 
  BarChart3, 
  Navigation, 
  Shield, 
  Zap, 
  Globe,
  CheckCircle,
  AlertTriangle,
  Edit,
  Eye,
  Users,
  Search,
  Code,
  Plug
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useWhiteLabel } from '@/hooks/useWhiteLabel';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Import the new Phase 3 components
import WhiteLabelContentManager from './WhiteLabelContentManager';
import WhiteLabelAnalyticsDashboard from './WhiteLabelAnalyticsDashboard';
import WhiteLabelNavigation from './WhiteLabelNavigation';
import WhiteLabelSecurityCenter from './WhiteLabelSecurityCenter';
import WhiteLabelAPIManager from './WhiteLabelAPIManager';

// Import Phase 6 enterprise components
import { WhiteLabelTeamManagement } from './WhiteLabelTeamManagement';
import { WhiteLabelSEOManager } from './WhiteLabelSEOManager';
import { WhiteLabelAdvancedCustomizer } from './WhiteLabelAdvancedCustomizer';
import { WhiteLabelIntegrationHub } from './WhiteLabelIntegrationHub';

// Import existing components
import DynamicThemeProvider from './DynamicThemeProvider';
import WhiteLabelSettings from './WhiteLabelSettings';
import DomainManagement from './DomainManagement';
import SitePerformanceMonitor from './SitePerformanceMonitor';

interface WhiteLabelSettingsHubProps {
  configId: string;
  hasActiveSubscription: boolean;
}

const WhiteLabelSettingsHub = ({ configId, hasActiveSubscription }: WhiteLabelSettingsHubProps) => {
  const [activeTab, setActiveTab] = useState('overview');
  const { user } = useAuth();
  const { config: whiteLabelConfig, isLoading: configLoading } = useWhiteLabel(user?.id);

  // Query for content pages count
  const { data: contentPagesCount = 0 } = useQuery({
    queryKey: ['white-label-content-count', configId],
    queryFn: async () => {
      if (configId === 'new') return 0;
      const { count } = await supabase
        .from('white_label_content')
        .select('*', { count: 'exact', head: true })
        .eq('config_id', configId);
      return count || 0;
    },
    enabled: configId !== 'new'
  });

  // Mock analytics data until table columns are available
  const analyticsData = { visitors: 1247, conversions: 23 };

  // Calculate setup progress based on actual configuration
  const calculateSetupProgress = () => {
    if (!whiteLabelConfig) return {
      basic: false,
      theme: false,
      seo: false,
      team: false,
      advanced: false,
      integrations: false,
    };
    
    return {
      basic: !!(whiteLabelConfig.company_name && whiteLabelConfig.contact_email),
      theme: !!(whiteLabelConfig.primary_color && whiteLabelConfig.company_logo_url),
      seo: !!(whiteLabelConfig.custom_domain || whiteLabelConfig.custom_subdomain),
      team: false, // Will be updated when team features are used
      advanced: false, // Will be updated when advanced customization is used
      integrations: false, // Will be updated when integrations are configured
    };
  };

  const setupProgress = calculateSetupProgress();
  const completedSteps = Object.values(setupProgress).filter(Boolean).length;
  const totalSteps = Object.keys(setupProgress).length;
  const progressPercentage = (completedSteps / totalSteps) * 100;

  const getStatusBadge = (isComplete: boolean) => (
    <Badge variant={isComplete ? "default" : "secondary"} className="ml-2">
      {isComplete ? <CheckCircle className="h-3 w-3 mr-1" /> : <AlertTriangle className="h-3 w-3 mr-1" />}
      {isComplete ? 'Complete' : 'Pending'}
    </Badge>
  );

  // Handle preview site functionality
  const handlePreviewSite = () => {
    if (!whiteLabelConfig) {
      toast.error('White-label configuration not found');
      return;
    }

    let previewUrl = '';

    // Check for custom domain first - prioritize custom domain + subdomain combination
    if (whiteLabelConfig.custom_domain && whiteLabelConfig.custom_subdomain) {
      previewUrl = `https://${whiteLabelConfig.custom_subdomain}.${whiteLabelConfig.custom_domain}`;
      
      // Show warning if domain verification is pending
      if (whiteLabelConfig.domain_verification_status === 'pending') {
        toast.warning('Domain verification pending - site may not be accessible yet');
      }
    } else if (whiteLabelConfig.custom_subdomain) {
      previewUrl = buildSubdomainUrl(whiteLabelConfig.custom_subdomain);
    } else if (whiteLabelConfig.custom_domain) {
      previewUrl = `https://${whiteLabelConfig.custom_domain}`;
    } else {
      toast.error('No domain or subdomain configured. Please set up a domain in the Deployment tab first.');
      return;
    }

    // Open the preview URL in a new tab
    window.open(previewUrl, '_blank');
    toast.success('Opening your white-label site in a new tab');
  };

  const quickStats = [
    { 
      label: 'Site Status', 
      value: whiteLabelConfig?.is_active ? 'Live' : 'Draft', 
      icon: Globe, 
      color: whiteLabelConfig?.is_active ? 'text-green-600' : 'text-yellow-600' 
    },
    { 
      label: 'Pages Created', 
      value: contentPagesCount.toString(), 
      icon: FileText, 
      color: 'text-blue-600' 
    },
    { 
      label: 'Monthly Visitors', 
      value: analyticsData?.visitors ? (analyticsData.visitors > 1000 ? `${(analyticsData.visitors / 1000).toFixed(1)}K` : analyticsData.visitors.toString()) : '0', 
      icon: BarChart3, 
      color: 'text-purple-600' 
    },
  ];

  return (
    <DynamicThemeProvider>
      <div className="min-h-screen bg-background">
        <div className="container mx-auto py-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">White-Label Management Hub</h1>
              <p className="text-muted-foreground">
                Manage your custom white-label experience
              </p>
            </div>
            <Button onClick={handlePreviewSite}>
              <Eye className="h-4 w-4 mr-2" />
              Preview Site
            </Button>
          </div>

          {/* Main Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="theme">Theme</TabsTrigger>
              <TabsTrigger value="seo">SEO & Analytics</TabsTrigger>
              <TabsTrigger value="team">Team</TabsTrigger>
              <TabsTrigger value="advanced">Advanced</TabsTrigger>
              <TabsTrigger value="deployment">Deployment</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              {/* Setup Progress */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    Setup Progress
                  </CardTitle>
                  <CardDescription>
                    Complete your white-label configuration
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Overall Progress</span>
                    <span className="text-sm text-muted-foreground">
                      {completedSteps} of {totalSteps} complete
                    </span>
                  </div>
                  <Progress value={progressPercentage} className="h-3" />
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Basic Configuration</span>
                        {getStatusBadge(setupProgress.basic)}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Theme Customization</span>
                        {getStatusBadge(setupProgress.theme)}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">SEO & Analytics</span>
                        {getStatusBadge(setupProgress.seo)}
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Team Management</span>
                        {getStatusBadge(setupProgress.team)}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Advanced Customization</span>
                        {getStatusBadge(setupProgress.advanced)}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Quick Stats */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {quickStats.map((stat, index) => (
                  <Card key={index}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">{stat.label}</CardTitle>
                      <stat.icon className={`h-4 w-4 ${stat.color}`} />
                    </CardHeader>
                    <CardContent>
                      <div className={`text-2xl font-bold ${stat.color}`}>
                        {stat.value}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Quick Actions */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActiveTab('team')}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Team Management
                    </CardTitle>
                    <CardDescription>
                      Invite team members and manage access
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button variant="outline" className="w-full">
                      <Users className="h-4 w-4 mr-2" />
                      Manage Team
                    </Button>
                  </CardContent>
                </Card>

                <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActiveTab('seo')}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Search className="h-5 w-5" />
                      SEO & Analytics
                    </CardTitle>
                    <CardDescription>
                      Improve search visibility and track performance
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button variant="outline" className="w-full">
                      <Search className="h-4 w-4 mr-2" />
                      Optimize SEO
                    </Button>
                  </CardContent>
                </Card>

                <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActiveTab('advanced')}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Code className="h-5 w-5" />
                      Advanced Customization
                    </CardTitle>
                    <CardDescription>
                      Custom CSS, JS, and page builder
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button variant="outline" className="w-full">
                      <Code className="h-4 w-4 mr-2" />
                      Advanced Editor
                    </Button>
                  </CardContent>
                </Card>

                <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActiveTab('seo')}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Plug className="h-5 w-5" />
                      Integration Hub
                    </CardTitle>
                    <CardDescription>
                      Connect external services and APIs
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button variant="outline" className="w-full">
                      <Plug className="h-4 w-4 mr-2" />
                      Manage Integrations
                    </Button>
                  </CardContent>
                </Card>

                <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActiveTab('seo')}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5" />
                      View Analytics
                    </CardTitle>
                    <CardDescription>
                      Monitor performance and insights
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button variant="outline" className="w-full">
                      <BarChart3 className="h-4 w-4 mr-2" />
                      View Reports
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Theme Tab */}
            <TabsContent value="theme">
              <WhiteLabelSettings userId={user?.id || ''} hasActiveSubscription={hasActiveSubscription} />
            </TabsContent>

            {/* Content Tab */}
            <TabsContent value="content">
              <WhiteLabelContentManager configId={configId} />
            </TabsContent>

            {/* Navigation Tab */}
            <TabsContent value="navigation">
              <WhiteLabelNavigation configId={configId} />
            </TabsContent>

            {/* SEO & Analytics Tab */}
            <TabsContent value="seo" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4">SEO Management</h3>
                  <WhiteLabelSEOManager configId={configId} />
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-4">Analytics Dashboard</h3>
                  <WhiteLabelAnalyticsDashboard configId={configId} />
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold mb-4">Integration Hub</h3>
                <WhiteLabelIntegrationHub configId={configId} />
              </div>
            </TabsContent>

            {/* Team Management Tab */}
            <TabsContent value="team">
              <WhiteLabelTeamManagement configId={configId} />
            </TabsContent>

            {/* Advanced Customization Tab */}
            <TabsContent value="advanced">
              <WhiteLabelAdvancedCustomizer configId={configId} />
            </TabsContent>

            {/* Deployment Tab */}
            <TabsContent value="deployment" className="space-y-6">
              <DomainManagement 
                configId={configId}
                customDomain={whiteLabelConfig?.custom_domain || ''}
                onDomainVerified={() => {
                  // Trigger cache invalidation when domain is verified
                  supabase.functions.invoke('site-cache-invalidation', {
                    body: { config_id: configId, invalidation_type: 'full' }
                  });
                }}
              />
              
              <SitePerformanceMonitor configId={configId} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </DynamicThemeProvider>
  );
};

export default WhiteLabelSettingsHub;

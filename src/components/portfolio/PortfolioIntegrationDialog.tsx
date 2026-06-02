import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Link, BarChart3, TrendingUp, Building2, Zap } from 'lucide-react';
import { PortfolioAssetDashboard } from './PortfolioAssetDashboard';

interface PortfolioIntegrationDialogProps {
  portfolioId: string;
  trigger?: React.ReactNode;
}

export const PortfolioIntegrationDialog = ({ portfolioId, trigger }: PortfolioIntegrationDialogProps) => {
  const [open, setOpen] = useState(false);

  const integrationOptions = [
    {
      id: 'comprehensive-view',
      name: 'Comprehensive Portfolio View',
      description: 'Complete portfolio management with assets, liabilities, and analytics',
      icon: BarChart3,
      features: ['Asset Management', 'Liability Tracking', 'Performance Analytics', 'CSV Import/Export'],
      status: 'available'
    },
    {
      id: 'asset-dashboard',
      name: 'Asset Dashboard',
      description: 'Focused asset management and hierarchy visualization',
      icon: Building2,
      features: ['Asset Hierarchy', 'Valuation Tracking', 'Document Management', 'Investment Analytics'],
      status: 'available'
    },
    {
      id: 'analytics-integration',
      name: 'Analytics Integration',
      description: 'Advanced charts and performance tracking',
      icon: TrendingUp,
      features: ['Portfolio Trends', 'Asset Allocation', 'Income Tracking', 'Benchmarking'],
      status: 'coming-soon'
    },
    {
      id: 'automated-sync',
      name: 'Automated Sync',
      description: 'Connect external accounts and wallets for automatic updates',
      icon: Zap,
      features: ['Wallet Connections', 'Bank Integration', 'Real-time Updates', 'Alert System'],
      status: 'coming-soon'
    }
  ];

  const handleIntegration = (integrationId: string) => {
    switch (integrationId) {
      case 'comprehensive-view':
        // Navigate to comprehensive view
        window.location.href = `/dashboard?portfolioId=${portfolioId}&view=comprehensive`;
        break;
      case 'asset-dashboard':
        // This is the current view - close dialog
        setOpen(false);
        break;
      default:
        console.log(`Integration ${integrationId} not yet implemented`);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" className="gap-2">
            <Link className="h-4 w-4" />
            Integrate Portfolio
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link className="h-5 w-5" />
            Portfolio Integration Options
          </DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="overview">Integration Options</TabsTrigger>
            <TabsTrigger value="preview">Current View</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {integrationOptions.map((option) => {
                const IconComponent = option.icon;
                return (
                  <Card key={option.id} className="relative">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <IconComponent className="h-5 w-5 text-primary" />
                          <CardTitle className="text-lg">{option.name}</CardTitle>
                        </div>
                        <Badge 
                          variant={option.status === 'available' ? 'default' : 'secondary'}
                        >
                          {option.status === 'available' ? 'Available' : 'Coming Soon'}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {option.description}
                      </p>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div>
                          <h4 className="text-sm font-medium mb-2">Features:</h4>
                          <ul className="text-sm text-muted-foreground space-y-1">
                            {option.features.map((feature, index) => (
                              <li key={index} className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                                {feature}
                              </li>
                            ))}
                          </ul>
                        </div>
                        <Button 
                          className="w-full" 
                          onClick={() => handleIntegration(option.id)}
                          disabled={option.status !== 'available'}
                        >
                          {option.status === 'available' ? (
                            <>
                              <Plus className="h-4 w-4 mr-2" />
                              {option.id === 'asset-dashboard' ? 'Current View' : 'Use This View'}
                            </>
                          ) : (
                            'Coming Soon'
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>
          
          <TabsContent value="preview" className="space-y-4">
            <div className="border rounded-lg p-4 max-h-96 overflow-y-auto">
              <PortfolioAssetDashboard portfolioId={portfolioId} />
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
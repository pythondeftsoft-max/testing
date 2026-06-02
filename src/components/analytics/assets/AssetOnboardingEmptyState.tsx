import { useState } from 'react';
import { Plus, Zap, Upload, BookOpen, TrendingUp, Building2, Coins, Briefcase, Landmark, Package } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AddAssetWizard } from '@/components/portfolio/AddAssetWizard';
import { AssetQuickTemplates } from './AssetQuickTemplates';
import { AssetImportWizard } from './AssetImportWizard';

interface AssetOnboardingEmptyStateProps {
  portfolioId: string;
  onAssetAdded: () => void;
  isFiltered?: boolean;
  filterDescription?: string;
}

interface QuickStartOption {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  color: string;
  action: () => void;
}

export const AssetOnboardingEmptyState = ({ 
  portfolioId, 
  onAssetAdded, 
  isFiltered = false,
  filterDescription 
}: AssetOnboardingEmptyStateProps) => {
  const [showAddWizard, setShowAddWizard] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showImport, setShowImport] = useState(false);

  // Quick start options for new users
  const quickStartOptions: QuickStartOption[] = [
    {
      id: 'manual',
      title: 'Add Single Asset',
      description: 'Add assets one by one with full details',
      icon: Plus,
      color: 'text-openkey-blue',
      action: () => setShowAddWizard(true)
    },
    {
      id: 'templates',
      title: 'Quick Templates',
      description: 'Start with pre-configured asset templates',
      icon: Zap,
      color: 'text-openkey-gold',
      action: () => setShowTemplates(true)
    },
    {
      id: 'import',
      title: 'Bulk Import',
      description: 'Import multiple assets from CSV/Excel',
      icon: Upload,
      color: 'text-green-600',
      action: () => setShowImport(true)
    },
    {
      id: 'guide',
      title: 'Getting Started Guide',
      description: 'Learn how to build your portfolio',
      icon: BookOpen,
      color: 'text-purple-600',
      action: () => window.open('/docs/getting-started', '_blank')
    }
  ];

  // Popular asset categories for new users
  const popularCategories = [
    { name: 'Real Estate', icon: Building2, count: '45%', description: 'Properties, REITs, Land' },
    { name: 'Stocks & ETFs', icon: TrendingUp, count: '35%', description: 'Public equities' },
    { name: 'Crypto', icon: Coins, count: '12%', description: 'Digital assets' },
    { name: 'Bonds', icon: Landmark, count: '8%', description: 'Fixed income' },
  ];

  if (isFiltered) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="w-16 h-16 rounded-full bg-gradient-subtle-blue/20 flex items-center justify-center mb-6">
          <Package className="h-8 w-8 text-openkey-blue" />
        </div>
        <h3 className="text-xl font-bold mb-2">No Assets Match Filters</h3>
        <p className="text-muted-foreground text-center mb-6 max-w-md">
          {filterDescription || "No assets found with the current filter settings."}
        </p>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => window.location.reload()}>
            Clear Filters
          </Button>
          <AddAssetWizard
            portfolioId={portfolioId}
            onAssetAdded={onAssetAdded}
            trigger={
              <Button variant="gradient">
                <Plus className="h-4 w-4 mr-2" />
                Add New Asset
              </Button>
            }
          />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-12 px-6">
      {/* Hero Section */}
      <div className="text-center mb-12">
        <div className="w-20 h-20 rounded-full bg-gradient-blue-gold flex items-center justify-center mx-auto mb-6">
          <Briefcase className="h-10 w-10 text-white" />
        </div>
        <h2 className="text-3xl font-bold text-gradient-blue-gold mb-4">
          Start Building Your Portfolio
        </h2>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
          Track and manage all your investments in one place. Add your first asset to get started with comprehensive portfolio analytics.
        </p>
        
        {/* Primary CTA */}
        <AddAssetWizard
          portfolioId={portfolioId}
          onAssetAdded={onAssetAdded}
          isOpen={showAddWizard}
          onOpenChange={setShowAddWizard}
          trigger={
            <Button 
              size="lg" 
              variant="gradient" 
              className="shadow-lg hover:shadow-xl transition-all duration-300"
            >
              <Plus className="h-5 w-5 mr-2" />
              Add Your First Asset
            </Button>
          }
        />
      </div>

      {/* Quick Start Options */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
        {quickStartOptions.map((option) => {
          const IconComponent = option.icon;
          return (
            <Card 
              key={option.id}
              className="cursor-pointer border-openkey-blue/20 bg-card/60 backdrop-blur-sm hover:bg-card/80 transition-all duration-300 hover:shadow-lg hover:border-openkey-blue/40"
              onClick={option.action}
            >
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 rounded-lg bg-gradient-subtle-blue/20 flex items-center justify-center mx-auto mb-4">
                  <IconComponent className={`h-6 w-6 ${option.color}`} />
                </div>
                <h4 className="font-semibold mb-2">{option.title}</h4>
                <p className="text-sm text-muted-foreground">{option.description}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Popular Categories */}
      <Card className="border-openkey-gold/20 bg-gradient-subtle-gold/10 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-lg text-openkey-gold flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Popular Asset Categories
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {popularCategories.map((category) => {
              const IconComponent = category.icon;
              return (
                <div key={category.name} className="p-4 rounded-lg bg-gradient-subtle-blue/10 border border-openkey-blue/20">
                  <div className="flex items-center gap-3 mb-2">
                    <IconComponent className="h-5 w-5 text-openkey-blue" />
                    <span className="font-medium">{category.name}</span>
                    <Badge variant="secondary" className="ml-auto bg-openkey-gold/20 text-openkey-gold">
                      {category.count}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{category.description}</p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Modal Components */}
      {showTemplates && (
        <AssetQuickTemplates
          portfolioId={portfolioId}
          isOpen={showTemplates}
          onClose={() => setShowTemplates(false)}
          onAssetAdded={onAssetAdded}
        />
      )}

      {showImport && (
        <AssetImportWizard
          portfolioId={portfolioId}
          isOpen={showImport}
          onClose={() => setShowImport(false)}
          onAssetsImported={onAssetAdded}
        />
      )}
    </div>
  );
};